// TODO: Group together temporarily decentralized types
type Grid = { id: string | symbol };
type Layer = { id: string };

type GridAndLayer = { grid: Grid; layer: Layer };

type PuzzleObject = {
    id: string;
    layerId?: string;
    batchId: "ignore" | number;
    object: any;
};
type LayerStorage = {
    renderOrder: string[];
    objects: Record<string, PuzzleObject>;
};

type HistoryAction = {
    object: PuzzleObject;
    renderIndex: number;
};
type HistorySlice = {
    id: string;
    layerId: string;
    batchId?: number;
    undo: HistoryAction;
    redo: HistoryAction;
};
type History = {
    actions: HistorySlice[];
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

    addToHistory(grid: Grid, layer: Layer, puzzleObjects?: PuzzleObject[]) {
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

            const redo: HistoryAction = {
                object: puzzleObject.object,
                renderIndex:
                    puzzleObject.id in objects
                        ? renderOrder.indexOf(puzzleObject.id)
                        : renderOrder.length,
            };

            // Merge two actions if they are batched and affecting the same object
            const lastSlice = history.actions[history.actions.length - 1];
            if (
                lastSlice &&
                lastSlice.id === puzzleObject.id &&
                lastSlice.layerId === puzzleObject.layerId &&
                lastSlice.batchId === puzzleObject.batchId &&
                lastSlice.batchId !== undefined
            ) {
                lastSlice.redo = redo;
                this._ApplyHistoryAction(
                    objects,
                    renderOrder,
                    lastSlice,
                    "redo",
                );

                if (redo.object === null && lastSlice.undo.object === null) {
                    // We can remove this action since it is a no-op
                    history.actions.splice(history.actions.length - 1, 1);
                }
            }

            const undo: HistoryAction = {
                object: objects[puzzleObject.id] || null,
                renderIndex: renderOrder.indexOf(puzzleObject.id),
            };

            const slice: HistorySlice = {
                id: puzzleObject.id,
                layerId,
                batchId: Number(puzzleObject.batchId),
                redo,
                undo,
            };
            this._ApplyHistoryAction(objects, renderOrder, slice, "redo");
            if (puzzleObject.batchId !== "ignore") {
                history.actions.push(slice);
                history.index++;
            }
        }
    }

    _ApplyHistoryAction(
        objects: LayerStorage["objects"],
        renderOrder: LayerStorage["renderOrder"],
        slice: HistorySlice,
        type: "undo" | "redo",
    ) {
        const action = type === "undo" ? slice.undo : slice.redo;

        if (action.object === undefined) {
            throw Error("You stupid");
        }

        if (slice.id in objects) {
            renderOrder.splice(renderOrder.indexOf(slice.id), 1);
        }

        if (action.object === null) {
            delete objects[slice.id];
        } else {
            renderOrder.splice(action.renderIndex, 0, slice.id);
            action.object.id = slice.id; // TODO: This should not be done here
            objects[slice.id] = action.object;
        }
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

            this._ApplyHistoryAction(objects, renderOrder, action, "undo");
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
            history.index++;

            this._ApplyHistoryAction(objects, renderOrder, action, "redo");
        } while (
            action.batchId &&
            action.batchId === history.actions[history.index]?.batchId
        );
    }
}
