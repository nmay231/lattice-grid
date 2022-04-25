import { HistorySlice, StorageManager } from "./StorageManager";

describe("StorageManager", () => {
    const getNormalStorage = () => {
        const normalStorage = new StorageManager();
        normalStorage.addStorage({
            grid: { id: "grid" },
            layer: { id: "layer1" },
        });
        normalStorage.addStorage({
            grid: { id: "grid" },
            layer: { id: "layer2" },
        });

        return normalStorage;
    };

    it("should add a new object correctly", () => {
        const storage = getNormalStorage();
        const { objects, renderOrder } = storage.getStored({
            grid: { id: "grid" },
            layer: { id: "layer1" },
        });
        const slice: HistorySlice = {
            id: "objectId",
            layerId: "layer1",
            undo: { object: null, renderIndex: -1 },
            redo: { object: { asdf: "something" }, renderIndex: 0 },
        };
        storage._ApplyHistoryAction(objects, renderOrder, slice, "redo");

        expect(storage.objects["grid"]["layer1"]).toEqual({
            objects: { objectId: { asdf: "something", id: "objectId" } },
            renderOrder: ["objectId"],
        });
    });

    it("should delete an object correctly", () => {
        const storage = getNormalStorage();
        const { objects, renderOrder } = storage.getStored({
            grid: { id: "grid" },
            layer: { id: "layer1" },
        });
        const slice: HistorySlice = {
            id: "objectId",
            layerId: "layer1",
            undo: { object: { asdf: "something" }, renderIndex: 0 },
            redo: { object: null, renderIndex: -1 },
        };
        storage._ApplyHistoryAction(objects, renderOrder, slice, "redo");

        expect(storage.objects["grid"]["layer1"]).toEqual({
            objects: {},
            renderOrder: [],
        });
    });

    it("object placement should be idempotent", () => {
        const storage = getNormalStorage();
        const { objects, renderOrder } = storage.getStored({
            grid: { id: "grid" },
            layer: { id: "layer1" },
        });
        const slice: HistorySlice = {
            id: "objectId",
            layerId: "layer1",
            undo: { object: null, renderIndex: -1 },
            redo: { object: { asdf: "something" }, renderIndex: 0 },
        };
        storage._ApplyHistoryAction(objects, renderOrder, slice, "redo");
        storage._ApplyHistoryAction(objects, renderOrder, slice, "redo");

        expect(storage.objects["grid"]["layer1"]).toEqual({
            objects: { objectId: { asdf: "something", id: "objectId" } },
            renderOrder: ["objectId"],
        });
    });

    it("object deletion should be idempotent", () => {
        const storage = getNormalStorage();
        const { objects, renderOrder } = storage.getStored({
            grid: { id: "grid" },
            layer: { id: "layer1" },
        });
        const slice: HistorySlice = {
            id: "objectId",
            layerId: "layer1",
            undo: { object: { asdf: "something" }, renderIndex: 0 },
            redo: { object: null, renderIndex: -1 },
        };
        storage._ApplyHistoryAction(objects, renderOrder, slice, "redo");
        storage._ApplyHistoryAction(objects, renderOrder, slice, "redo");

        expect(storage.objects["grid"]["layer1"]).toEqual({
            objects: {},
            renderOrder: [],
        });
    });

    it("should not undo or redo when empty", () => {
        const storage = getNormalStorage();
        storage.undoHistory("grid");
        expect(storage.histories).toEqual({
            grid: { actions: [], index: 0 },
        });
        storage.redoHistory("grid");
        expect(storage.histories).toEqual({
            grid: { actions: [], index: 0 },
        });
    });

    it("should undo/redo a batch of actions", () => {
        const storage = getNormalStorage();

        storage.addToHistory({ id: "grid" }, { id: "layer1" }, [
            { id: "id1", object: { asdf: "something1" } },
            { id: "id2", object: { asdf: "something2" }, batchId: 1 },
            { id: "id3", object: { asdf: "something3" }, batchId: 1 },
            { id: "id4", object: { asdf: "something4" } },
        ]);

        storage.undoHistory("grid");
        // Ensure the initial state is good
        expect(storage.objects).toEqual({
            grid: {
                layer1: {
                    objects: {
                        id1: { asdf: "something1", id: "id1" },
                        id2: { asdf: "something2", id: "id2" },
                        id3: { asdf: "something3", id: "id3" },
                    },
                    renderOrder: ["id1", "id2", "id3"],
                },
                layer2: { objects: {}, renderOrder: [] },
            },
        });

        storage.undoHistory("grid");
        // Undo a batch of actions
        expect(storage.objects).toEqual({
            grid: {
                layer1: {
                    objects: { id1: { asdf: "something1", id: "id1" } },
                    renderOrder: ["id1"],
                },
                layer2: { objects: {}, renderOrder: [] },
            },
        });

        storage.redoHistory("grid");
        // Undo a batch of actions
        expect(storage.objects).toEqual({
            grid: {
                layer1: {
                    objects: {
                        id1: { asdf: "something1", id: "id1" },
                        id2: { asdf: "something2", id: "id2" },
                        id3: { asdf: "something3", id: "id3" },
                    },
                    renderOrder: ["id1", "id2", "id3"],
                },
                layer2: { objects: {}, renderOrder: [] },
            },
        });
    });

    it("should give truthy batchIds", () => {
        const storage = getNormalStorage();
        // Three just because
        expect(storage.getNewBatchId()).toBeTruthy();
        expect(storage.getNewBatchId()).toBeTruthy();
        expect(storage.getNewBatchId()).toBeTruthy();
    });

    // TODO
    it.todo("should not undo past the limits of history");
    it.todo("should not redo past the limits of history");
    it.todo(
        "should undo a single object action (make sure it is undoing/redoing right on the boundary to test that case as well)",
    );
    it.todo(
        "should redo a single object action (make sure it is undoing/redoing right on the boundary to test that case as well)",
    );
    it.todo(
        "should not undo actions that are not batched (handle both being undefined, one being undefined, both defined but not equal)",
    );
    it.todo(
        "should not redo actions that are not batched (handle both being undefined, one being undefined, both defined but not equal)",
    );
});
