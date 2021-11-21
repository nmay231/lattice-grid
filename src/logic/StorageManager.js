export class StorageManager {
    // all[grid.id][layer.id] = {renderOrder: [id2, ...], objects: {id1: {}, ...}, temporary: {}}
    all = {};
    // history = [{layerId: ..., undoActions: [...], redoActions: [...]}, ...]
    history = [];
    historyIndex = 0;

    // TODO:
    // inProgressObject = {gridId, layerId, state}
    inProgressObject = null;

    constructor(puzzle) {
        this.puzzle = puzzle;
    }

    // TODO: Might not even belong as a method in this class
    getObjectUnderPointer({ grid, layer, cursor, ignore = [] }) {}

    addStorage({ grid, layer }) {
        this.all[grid.id] = this.all[grid.id] ?? {};
        this.all[grid.id][layer.id] = {
            renderOrder: [],
            objects: {},
            temporary: {},
        };
    }

    removeStorage({ grid, layer }) {
        // TODO: add an entry to history (so you can undo deleting a layer)? It might be a bit clunky then...
        delete this.all[grid.id][layer.id];
    }

    getStored({ grid, layer }) {
        return this.all[grid.id][layer.id];
    }
}
