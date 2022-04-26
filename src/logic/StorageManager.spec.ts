import { HistoryAction, StorageManager } from "./StorageManager";

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
        const action: HistoryAction = {
            id: "objectId",
            layerId: "layer1",
            object: { asdf: "something" },
            renderIndex: 0,
        };
        storage._ApplyHistoryAction(objects, renderOrder, action);

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
        const action: HistoryAction = {
            id: "objectId",
            layerId: "layer1",
            object: null,
            renderIndex: -1,
        };
        storage._ApplyHistoryAction(objects, renderOrder, action);

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
        const action: HistoryAction = {
            id: "objectId",
            layerId: "layer1",
            object: { asdf: "something" },
            renderIndex: 0,
        };
        storage._ApplyHistoryAction(objects, renderOrder, action);
        storage._ApplyHistoryAction(objects, renderOrder, action);

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
        const action: HistoryAction = {
            id: "objectId",
            layerId: "layer1",
            object: null,
            renderIndex: -1,
        };
        storage._ApplyHistoryAction(objects, renderOrder, action);
        storage._ApplyHistoryAction(objects, renderOrder, action);

        expect(storage.objects["grid"]["layer1"]).toEqual({
            objects: {},
            renderOrder: [],
        });
    });

    it("should return the same object when inverted twice", () => {
        const storage = getNormalStorage();
        const { objects, renderOrder } = storage.getStored({
            grid: { id: "grid" },
            layer: { id: "layer1" },
        });
        const action: HistoryAction = {
            id: "objectId",
            layerId: "layer1",
            object: { asdf: "something" },
            renderIndex: 0,
        };
        const inverse = storage._ApplyHistoryAction(
            objects,
            renderOrder,
            action,
        );
        expect(inverse).toEqual({
            id: "objectId",
            layerId: "layer1",
            object: null,
            renderIndex: -1,
        });

        const sameAction = storage._ApplyHistoryAction(
            objects,
            renderOrder,
            action,
        );
        expect(sameAction).toEqual<HistoryAction>(action);
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

    it("should merge batched actions affecting the same object", () => {
        const storage = getNormalStorage();

        storage.addToHistory({ id: "grid" }, { id: "layer1" }, [
            { id: "id1", object: { asdf: "something1" } },
            { id: "id2", object: { asdf: "something2" }, batchId: 1 },
            { id: "id2", object: { asdf: "changed" }, batchId: 1 },
            { id: "id3", object: { asdf: "something3" } },
        ]);

        expect(storage.histories["grid"].actions.length).toBe(3);
        expect(storage.histories["grid"].index).toBe(3);
    });

    it("should remove batched actions affecting the same object that are no-ops", () => {
        const storage = getNormalStorage();

        storage.addToHistory({ id: "grid" }, { id: "layer1" }, [
            { id: "id1", object: { asdf: "something1" } },
            { id: "id2", object: { asdf: "something2" }, batchId: 1 },
            { id: "id2", object: { asdf: "changed" }, batchId: 1 },
            { id: "id2", object: null, batchId: 1 },
            { id: "id3", object: { asdf: "something3" } },
        ]);

        expect(storage.histories["grid"].actions.length).toBe(2);
        expect(storage.histories["grid"].index).toBe(2);
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
