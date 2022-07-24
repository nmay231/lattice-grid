import {
    Grid,
    History,
    HistoryAction,
    ILayer,
    IncompleteHistoryAction,
    LayerProps,
    LayerStorage,
} from "../globals";

type GridAndLayer = { grid: Pick<Grid, "id">; layer: Pick<ILayer, "id"> };

export class StorageManager {
    objects: Record<Grid["id"], Record<string, LayerStorage>> = {};

    histories: Record<Grid["id"], History> = {};

    addStorage({ grid, layer }: GridAndLayer) {
        this.objects[grid.id] = this.objects[grid.id] ?? {};
        this.objects[grid.id][layer.id] = { renderOrder: [], objects: {} };

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

    addToHistory(
        grid: Pick<Grid, "id">,
        layer: Pick<ILayer, "id">,
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

        for (let puzzleObject of puzzleObjects) {
            const layerId = puzzleObject.layerId || layer.id;
            const { objects, renderOrder } = this.objects[grid.id][layerId];

            const action: HistoryAction = {
                id: puzzleObject.id,
                layerId,
                batchId: Number(puzzleObject.batchId),
                object: puzzleObject.object,
                renderIndex:
                    puzzleObject.id in objects
                        ? renderOrder.indexOf(puzzleObject.id)
                        : renderOrder.length,
            };

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
            throw Error("You stupid");
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
