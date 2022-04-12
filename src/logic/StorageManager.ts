import { SquareGrid } from "./grids/SquareGrid";
import { PuzzleManager } from "./PuzzleManager";

// TODO: Group together temporarily decentralized types
type Grid = SquareGrid; // | HexagonalGrid etc.
type Layer = { id: string };

type GridAndLayer = { grid: Grid; layer: Layer };

type PuzzleObject = {
    renderOrder: string[];
    objects: Record<string, any>;
    temporary: object;
};

type HistoryAction = {
    id: string;
    layerId: string;
    object: any;
};

export class StorageManager {
    // all[grid.id][layer.id] = {renderOrder: [id2, ...], objects: {id1: {}, ...}, temporary: {}}
    all: Record<string | symbol, Record<string, PuzzleObject>> = {};

    history: HistoryAction[] = [];
    // For all items history[i]: i < historyIndex are undoActions, i >= historyIndex are redoActions
    historyIndex = 0;

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
    }

    removeStorage({ grid, layer }: GridAndLayer) {
        // TODO: add an entry to history (so you can undo deleting a layer)? It might be a bit clunky then...
        delete this.all[grid.id][layer.id];
    }

    getStored({ grid, layer }: GridAndLayer) {
        return this.all[grid.id][layer.id];
    }

    handleHistory(grid: Grid, layer: Layer, history?: HistoryAction[]) {
        if (!history?.length) {
            return;
        }

        const changes: any[] = [];

        if (this.historyIndex < this.history.length) {
            this.history.splice(this.historyIndex); // Prune any redo actions
        }

        for (let { id, layerId, object } of history) {
            layerId = layerId || layer.id;
            const { objects, renderOrder } = this.all[grid.id][layerId];

            let oldObject = objects[id] || { layerId, id, object: null };
            this.history.push(oldObject);
            this.historyIndex++;

            if (id in objects) {
                renderOrder.splice(renderOrder.indexOf(id), 1);
            }

            if (object === null) {
                delete objects[id];
            } else if (object === undefined) {
                throw Error("You stupid");
            } else {
                object.id = id;
                object.layerId = layerId;
                renderOrder.push(id);
                objects[id] = object;
            }
        }

        this.puzzle.redrawScreen(changes);
    }

    undoHistory(historyId: string) {
        if (this.historyIndex <= 0) {
            return;
        }

        this.historyIndex--;
        const undoAction = this.history[this.historyIndex];
        const redoAction =
            this.all[historyId][undoAction.layerId].objects[undoAction.id];
        this.history[this.historyIndex] = redoAction;
        return { history: [undoAction] };
    }

    redoHistory(historyId: string) {
        if (this.historyIndex >= this.history.length) {
            return;
        }

        const redoAction = this.history[this.historyIndex];
        const undoAction =
            this.all[historyId][redoAction.layerId].objects[redoAction.id];
        this.history[this.historyIndex] = undoAction;
        this.historyIndex++;
        return { history: [redoAction] };
    }
}
