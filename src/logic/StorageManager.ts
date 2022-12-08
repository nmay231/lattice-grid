import {
    EditMode,
    Grid,
    History,
    HistoryAction,
    Layer,
    LayerProps,
    NeedsUpdating,
    PartialHistoryAction,
    StorageReducer,
} from "../types";
import { errorNotification } from "../utils/DOMUtils";
import { formatAnything } from "../utils/stringUtils";
import { LayerStorage } from "./LayerStorage";
import { PuzzleManager } from "./PuzzleManager";

type GridAndLayer = { grid: Pick<Grid, "id">; layer: Pick<Layer, "id"> };
// TODO: Recursive Pick type?
export type PuzzleForStorage = {
    grid: Pick<PuzzleManager["grid"], "id">;
    settings: Pick<PuzzleManager["settings"], "editMode">;
};

export class StorageManager {
    objects: Record<Grid["id"], Record<Layer["id"], LayerStorage>> = {};

    histories: Record<Grid["id"], History> = {};

    masterReducer: StorageReducer<HistoryAction | null> = (puzzle, action) => action;
    storageReducers: Array<typeof this.masterReducer> = [];

    addStorage({ grid, layer }: GridAndLayer) {
        this.objects[grid.id] = this.objects[grid.id] ?? {};
        this.objects[grid.id][layer.id] = new LayerStorage();

        // TODO: Use typescript `satisfies`
        // TODO: Actually, I just need to implement that data structure that handles this automatically because editModes might eventually be dynamic
        (["question", "answer"] as EditMode[]).forEach((editMode) => {
            this.histories[`${grid.id}-${editMode}`] = this.histories[`${grid.id}-${editMode}`] || {
                actions: [],
                index: 0,
            };
        });
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

    addToHistory({
        puzzle,
        layerId: defaultLayerId,
        actions,
    }: {
        puzzle: PuzzleForStorage;
        layerId: Layer["id"];
        actions?: PartialHistoryAction[];
    }) {
        if (!actions?.length) {
            return;
        }

        const history = this.histories[`${puzzle.grid.id}-${puzzle.settings.editMode}`];

        const historyChanges = actions.filter(({ batchId }) => batchId !== "ignore").length;

        if (history.index < history.actions.length && historyChanges) {
            // Only prune redo actions when actions will be added to history
            history.actions.splice(history.index);
        }

        for (const partialAction of actions) {
            const layerId = (partialAction as NeedsUpdating).layerId || defaultLayerId;
            const { objects, renderOrder } = this.objects[puzzle.grid.id][layerId];

            const action = this.masterReducer({} as NeedsUpdating, {
                id: partialAction.id,
                layerId,
                batchId: partialAction.batchId && Number(partialAction.batchId),
                object: partialAction.object,
                renderIndex:
                    partialAction.id in objects
                        ? renderOrder.indexOf(partialAction.id)
                        : renderOrder.length,
            });
            if (!action) {
                continue; // One of the reducers chose to ignore this action
            }

            const undoAction = this._ApplyHistoryAction(objects, renderOrder, action);

            if (partialAction.batchId === "ignore") {
                continue; // Do not include in history
            }

            const lastAction = history.actions[history.actions.length - 1];

            // Merge two actions if they are batched and affecting the same object
            if (
                lastAction?.batchId &&
                lastAction.layerId === layerId &&
                lastAction.id === partialAction.id &&
                lastAction.batchId === partialAction.batchId
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

    undoHistory(puzzle: PuzzleForStorage) {
        const history = this.histories[`${puzzle.grid.id}-${puzzle.settings.editMode}`];
        if (history.index <= 0) {
            return [];
        }

        let action: HistoryAction;
        const returnedActions: HistoryAction[] = [];
        do {
            history.index--;
            action = history.actions[history.index];
            const { objects, renderOrder } = this.objects[puzzle.grid.id][action.layerId];

            const redo = this._ApplyHistoryAction(objects, renderOrder, action);
            // Replace the action with its opposite
            history.actions.splice(history.index, 1, redo);

            returnedActions.push(action);
        } while (action.batchId && action.batchId === history.actions[history.index - 1]?.batchId);

        return returnedActions;
    }

    redoHistory(puzzle: PuzzleForStorage) {
        const history = this.histories[`${puzzle.grid.id}-${puzzle.settings.editMode}`];
        if (history.index >= history.actions.length) {
            return [];
        }

        let action: HistoryAction;
        const returnedActions: HistoryAction[] = [];
        do {
            action = history.actions[history.index];
            const { objects, renderOrder } = this.objects[puzzle.grid.id][action.layerId];

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
