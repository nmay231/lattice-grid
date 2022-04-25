// TODO: Group together temporarily decentralized types
type Grid = { id: string | symbol };
type Layer = { id: string };

export type GridAndLayer = { grid: Grid; layer: Layer };

type LayerStorage = {
    renderOrder: string[];
    objects: Record<string, object>;
};

export type IncompleteHistoryAction = {
    id: string;
    layerId?: string;
    batchId?: "ignore" | number;
    object: any;
};
export type HistoryAction = {
    id: string;
    layerId: string;
    batchId?: number;
    object: object | null;
    renderIndex: number;
};
type History = {
    actions: HistoryAction[];
    index: number;
};

export class StorageManager {
    objects: Record<string | symbol, Record<string, LayerStorage>> = {};

    histories: Record<string | symbol, History> = {};

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

    getStored({ grid, layer }: GridAndLayer) {
        return this.objects[grid.id][layer.id];
    }

    addToHistory(
        grid: Grid,
        layer: Layer,
        puzzleObjects?: IncompleteHistoryAction[],
    ) {
        if (!puzzleObjects?.length) {
            return;
        }

        const history = this.histories[grid.id];

        const historyChanges = puzzleObjects.filter(
            ({ batchId }) => batchId !== "ignore",
        ).length;

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

            const undoAction = this._ApplyHistoryAction(
                objects,
                renderOrder,
                action,
            );
            if (puzzleObject.batchId !== "ignore") {
                history.actions.push(undoAction);
                history.index++;
            } else {
                continue;
            }

            // Merge two actions if they are batched and affecting the same object
            const lastAction = history.actions[history.actions.length - 1];
            if (
                lastAction?.batchId !== undefined &&
                lastAction.id === puzzleObject.id &&
                lastAction.layerId === puzzleObject.layerId &&
                lastAction.batchId === puzzleObject.batchId
            ) {
                if (action.object === null && lastAction.object === null) {
                    // We can remove this action since it is a no-op
                    history.actions.splice(history.actions.length - 1, 1);
                }
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

    undoHistory(historyId: string | symbol) {
        const history = this.histories[historyId];
        if (history.index <= 0) {
            return;
        }

        let action;
        do {
            history.index--;
            action = history.actions[history.index];
            const { objects, renderOrder } =
                this.objects[historyId][action.layerId];

            const redo = this._ApplyHistoryAction(objects, renderOrder, action);
            // Replace the action with its opposite
            history.actions.splice(history.index, 1, redo);
        } while (
            action.batchId &&
            action.batchId === history.actions[history.index - 1]?.batchId
        );
    }

    redoHistory(historyId: string | symbol) {
        const history = this.histories[historyId];
        if (history.index >= history.actions.length) {
            return;
        }

        let action;
        do {
            action = history.actions[history.index];
            const { objects, renderOrder } =
                this.objects[historyId][action.layerId];

            const undo = this._ApplyHistoryAction(objects, renderOrder, action);
            // Replace the action with its opposite
            history.actions.splice(history.index, 1, undo);
            history.index++;
        } while (
            action.batchId &&
            action.batchId === history.actions[history.index]?.batchId
        );
    }

    _batchId = 1;
    getNewBatchId() {
        return this._batchId++;
    }
}
