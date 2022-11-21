import {
    Grid,
    History,
    HistoryAction,
    IncompleteHistoryAction,
    Layer,
    LayerProps,
    NeedsUpdating,
    StorageReducer,
} from "../types";
import { errorNotification } from "../utils/DOMUtils";
import { formatAnything } from "../utils/stringUtils";

type GridAndLayer = { grid: Pick<Grid, "id">; layer: Pick<Layer, "id"> };

export class StorageManager {
    objects: Record<Grid["id"], Record<string, LayerStorage>> = {};

    histories: Record<Grid["id"], History> = {};

    masterReducer: StorageReducer<HistoryAction | null> = (puzzle, action) => action;
    storageReducers: Array<typeof this.masterReducer> = [];

    addStorage({ grid, layer }: GridAndLayer) {
        this.objects[grid.id] = this.objects[grid.id] ?? {};
        this.objects[grid.id][layer.id] = { renderOrder: [], objects: {}, extra: {} };

        this.histories[grid.id] = this.histories[grid.id] || {
            actions: [],
            index: 0,
        };
    }

    removeStorage({ grid, layer }: GridAndLayer) {
        // TODO: add an entry to history (so you can undo deleting a layer)? It might be a bit clunky then...
        delete this.objects[grid.id][layer.id];
    }

    getStored<LP extends LayerProps = LayerProps>({ grid, layer }: GridAndLayer) {
        return this.objects[grid.id][layer.id] as LayerStorage<LP>;
    }

    // TODO: Have storageReducers subscribe to the layers they need, allow controlling the order they run, etc.
    addStorageReducer(reducer: typeof this.masterReducer) {
        this.storageReducers.push(reducer);
        this.masterReducer = (puzzle, action) =>
            this.storageReducers.reduce((prev, reduce) => reduce(puzzle, prev), action);
    }

    removeStorageReducer(reducer: typeof this.masterReducer) {
        const index = this.storageReducers.indexOf(reducer);
        if (index > -1) {
            this.storageReducers.splice(index, 1);
            this.masterReducer = (puzzle, action) =>
                this.storageReducers.reduce((prev, reduce) => reduce(puzzle, prev), action);
        } else {
            errorNotification({
                message: `Storage: Failed to remove a reducer ${formatAnything(
                    reducer,
                )}. Reducer was never added or already removed!`,
            });
        }
    }

    addToHistory(
        grid: Pick<Grid, "id">,
        layer: Pick<Layer, "id">,
        puzzleObjects?: IncompleteHistoryAction[],
    ) {
        if (!puzzleObjects?.length) {
            return;
        }

        const history = this.histories[grid.id];

        const historyChanges = puzzleObjects.filter(({ batchId }) => batchId !== "ignore").length;

        if (history.index < history.actions.length && historyChanges) {
            // Only prune redo actions when actions will be added to history
            history.actions.splice(history.index);
        }

        for (const puzzleObject of puzzleObjects) {
            const layerId = (puzzleObject as NeedsUpdating).layerId || layer.id;
            const { objects, renderOrder } = this.objects[grid.id][layerId];

            const action = this.masterReducer({} as NeedsUpdating, {
                id: puzzleObject.id,
                layerId,
                batchId: Number(puzzleObject.batchId),
                object: puzzleObject.object,
                renderIndex:
                    puzzleObject.id in objects
                        ? renderOrder.indexOf(puzzleObject.id)
                        : renderOrder.length,
            });
            if (!action) {
                continue; // One of the reducers chose to ignore this action
            }

            const undoAction = this._ApplyHistoryAction(objects, renderOrder, action);

            if (puzzleObject.batchId === "ignore") {
                continue; // Do not include in history
            }

            const lastAction = history.actions[history.actions.length - 1];

            // Merge two actions if they are batched and affecting the same object
            if (
                lastAction?.batchId &&
                lastAction.layerId === layerId &&
                lastAction.id === puzzleObject.id &&
                lastAction.batchId === puzzleObject.batchId
            ) {
                // By not pushing actions to history, the actions are merged

                if (action.object === null && lastAction.object === null) {
                    // We can remove the last action since it is a no-op
                    history.actions.splice(history.actions.length - 1, 1);
                    history.index--;
                }
            } else {
                history.actions.push(undoAction);
                history.index++;
            }
        }
    }

    _ApplyHistoryAction(
        objects: LayerStorage["objects"],
        renderOrder: LayerStorage["renderOrder"],
        action: HistoryAction,
    ) {
        if (action.object === undefined) {
            throw errorNotification({
                message: `Layer ${action.layerId} object undefined: ${action}`,
                forever: true,
            });
        }

        const undoAction: HistoryAction = {
            ...action,
            object: objects[action.id] || null,
            renderIndex: renderOrder.indexOf(action.id),
        };

        if (action.id in objects) {
            renderOrder.splice(renderOrder.indexOf(action.id), 1);
        }

        if (action.object === null) {
            delete objects[action.id];
        } else {
            renderOrder.splice(action.renderIndex, 0, action.id);
            // TODO: This should not be done here, but instead done by the layer: history: [createObject({ id, points })]
            action.object = { ...action.object, id: action.id };
            objects[action.id] = action.object;
        }

        return undoAction;
    }

    undoHistory(historyId: Grid["id"]) {
        const history = this.histories[historyId];
        if (history.index <= 0) {
            return [];
        }

        let action: HistoryAction;
        const returnedActions: HistoryAction[] = [];
        do {
            history.index--;
            action = history.actions[history.index];
            const { objects, renderOrder } = this.objects[historyId][action.layerId];

            const redo = this._ApplyHistoryAction(objects, renderOrder, action);
            // Replace the action with its opposite
            history.actions.splice(history.index, 1, redo);

            returnedActions.push(action);
        } while (action.batchId && action.batchId === history.actions[history.index - 1]?.batchId);

        return returnedActions;
    }

    redoHistory(historyId: Grid["id"]) {
        const history = this.histories[historyId];
        if (history.index >= history.actions.length) {
            return [];
        }

        let action: HistoryAction;
        const returnedActions: HistoryAction[] = [];
        do {
            action = history.actions[history.index];
            const { objects, renderOrder } = this.objects[historyId][action.layerId];

            const undo = this._ApplyHistoryAction(objects, renderOrder, action);
            // Replace the action with its opposite
            history.actions.splice(history.index, 1, undo);
            history.index++;

            returnedActions.push(action);
        } while (action.batchId && action.batchId === history.actions[history.index]?.batchId);

        return returnedActions;
    }

    _batchId = 1;
    getNewBatchId() {
        return this._batchId++;
    }
}

// Sure, this could be in its own file, but I don't feel like it should be just yet...
export class LayerStorage<LP extends LayerProps = LayerProps> {
    objects: Record<string, LP["ObjectState"]> = {};
    extra: Partial<LP["ExtraLayerStorageProps"]> = {};
    renderOrder: string[] = [];
    // groups: { question: Set<ObjectId>; answer: Set<ObjectId> } = { answer: new Set(), question: new Set() };
}
