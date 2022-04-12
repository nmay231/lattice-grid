import { SquareGrid } from "./grids/SquareGrid";
import { PuzzleManager } from "./PuzzleManager";

// TODO: Group together temporarily decentralized types
type Grid = SquareGrid; // | HexagonalGrid etc.
type Layer = { id: string };

type GridAndLayer = { grid: Grid; layer: Layer };

type PuzzleObject = {
    id: string;
    layerId?: string;
    object: any;
};
type LayerStorage = {
    renderOrder: string[];
    objects: Record<string, PuzzleObject>;
    temporary: object;
};

type HistoryAction = {
    object: PuzzleObject;
    renderIndex: number;
};
type HistorySlice = {
    id: string;
    layerId: string;
    undo: HistoryAction;
    redo: HistoryAction;
};
type History = {
    actions: HistorySlice[];
    index: number;
};

export class StorageManager {
    all: Record<string | symbol, Record<string, LayerStorage>> = {};

    histories: Record<string | symbol, History> = {};

    puzzle: PuzzleManager;

    constructor(puzzle: PuzzleManager) {
        this.puzzle = puzzle;
    }

    addStorage({ grid, layer }: GridAndLayer) {
        this.all[grid.id] = this.all[grid.id] ?? {};
        this.all[grid.id][layer.id] = {
            renderOrder: [],
            objects: {},
            temporary: {},
        };

        this.histories[grid.id] = this.histories[grid.id] || {
            actions: [],
            index: 0,
        };
    }

    removeStorage({ grid, layer }: GridAndLayer) {
        // TODO: add an entry to history (so you can undo deleting a layer)? It might be a bit clunky then...
        delete this.all[grid.id][layer.id];
    }

    getStored({ grid, layer }: GridAndLayer) {
        return this.all[grid.id][layer.id];
    }

    addToHistory(grid: Grid, layer: Layer, puzzleObjects?: PuzzleObject[]) {
        if (!puzzleObjects?.length) {
            return;
        }

        const history = this.histories[grid.id];

        if (history.index < history.actions.length) {
            history.actions.splice(history.index); // Prune any redo actions
        }

        history.index += puzzleObjects.length;

        for (let puzzleObject of puzzleObjects) {
            const layerId = puzzleObject.layerId || layer.id;
            const { objects, renderOrder } = this.all[grid.id][layerId];

            const redo: HistoryAction = {
                object: puzzleObject.object,
                renderIndex:
                    puzzleObject.id in objects
                        ? renderOrder.indexOf(puzzleObject.id)
                        : renderOrder.length,
            };

            const undo: HistoryAction = {
                object: objects[puzzleObject.id] || null,
                renderIndex: renderOrder.indexOf(puzzleObject.id),
            };

            const slice: HistorySlice = {
                id: puzzleObject.id,
                layerId,
                redo,
                undo,
            };
            history.actions.push(slice);
            this._ApplyHistoryAction(objects, renderOrder, slice, "redo");
        }

        this.puzzle.redrawScreen();
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

        history.index--;
        const action = history.actions[history.index];
        const { objects, renderOrder } = this.all[historyId][action.layerId];

        this._ApplyHistoryAction(objects, renderOrder, action, "undo");
        this.puzzle.redrawScreen();
    }

    redoHistory(historyId: string | symbol) {
        const history = this.histories[historyId];
        if (history.index >= history.actions.length) {
            return;
        }

        const action = history.actions[history.index];
        const { objects, renderOrder } = this.all[historyId][action.layerId];
        history.index++;

        this._ApplyHistoryAction(objects, renderOrder, action, "redo");
        this.puzzle.redrawScreen();
    }
}
