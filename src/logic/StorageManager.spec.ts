import { cloneDeep } from "lodash";
import { Grid, HistoryAction, Layer } from "../types";
import { LayerStorage, StorageManager } from "./StorageManager";

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

    const gridLayer = (grid: Grid["id"], layer: Layer["id"]) => ({
        grid: { id: grid },
        layer: { id: layer },
    });

    it("should add a new object correctly", () => {
        const storage = getNormalStorage();
        const { objects, renderOrder } = storage.getStored(gridLayer("grid", "layer1"));
        const action: HistoryAction = {
            id: "objectId",
            layerId: "layer1",
            object: { asdf: "something" },
            renderIndex: 0,
        };
        storage._ApplyHistoryAction(objects, renderOrder, action);

        expect(storage.objects["grid"]["layer1"]).toEqual<LayerStorage>({
            objects: { objectId: { asdf: "something", id: "objectId" } },
            renderOrder: ["objectId"],
            extra: {},
        });
    });

    it("should delete an object correctly", () => {
        const storage = getNormalStorage();
        const { objects, renderOrder } = storage.getStored(gridLayer("grid", "layer1"));
        const action: HistoryAction = {
            id: "objectId",
            layerId: "layer1",
            object: null,
            renderIndex: -1,
        };
        storage._ApplyHistoryAction(objects, renderOrder, action);

        expect(storage.objects["grid"]["layer1"]).toEqual<LayerStorage>({
            objects: {},
            renderOrder: [],
            extra: {},
        });
    });

    it("object placement should be idempotent", () => {
        const storage = getNormalStorage();
        const { objects, renderOrder } = storage.getStored(gridLayer("grid", "layer1"));
        const action: HistoryAction = {
            id: "objectId",
            layerId: "layer1",
            object: { asdf: "something" },
            renderIndex: 0,
        };
        storage._ApplyHistoryAction(objects, renderOrder, action);
        storage._ApplyHistoryAction(objects, renderOrder, action);

        expect(storage.objects["grid"]["layer1"]).toEqual<LayerStorage>({
            objects: { objectId: { asdf: "something", id: "objectId" } },
            renderOrder: ["objectId"],
            extra: {},
        });
    });

    it("object deletion should be idempotent", () => {
        const storage = getNormalStorage();
        const { objects, renderOrder } = storage.getStored(gridLayer("grid", "layer1"));
        const action: HistoryAction = {
            id: "objectId",
            layerId: "layer1",
            object: null,
            renderIndex: -1,
        };
        storage._ApplyHistoryAction(objects, renderOrder, action);
        storage._ApplyHistoryAction(objects, renderOrder, action);

        expect(storage.objects["grid"]["layer1"]).toEqual<LayerStorage>({
            objects: {},
            renderOrder: [],
            extra: {},
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
        const inverse = storage._ApplyHistoryAction(objects, renderOrder, action);
        expect(inverse).toEqual({
            id: "objectId",
            layerId: "layer1",
            object: null,
            renderIndex: -1,
        });

        const sameAction = storage._ApplyHistoryAction(objects, renderOrder, action);
        expect(sameAction).toEqual<HistoryAction>(action);
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
        expect(storage.objects).toEqual<StorageManager["objects"]>({
            grid: {
                layer1: {
                    objects: {
                        id1: { asdf: "something1", id: "id1" },
                        id2: { asdf: "something2", id: "id2" },
                        id3: { asdf: "something3", id: "id3" },
                    },
                    renderOrder: ["id1", "id2", "id3"],
                    extra: {},
                },
                layer2: { objects: {}, renderOrder: [], extra: {} },
            },
        });

        storage.undoHistory("grid");
        // Undo a batch of actions
        expect(storage.objects).toEqual<StorageManager["objects"]>({
            grid: {
                layer1: {
                    objects: { id1: { asdf: "something1", id: "id1" } },
                    renderOrder: ["id1"],
                    extra: {},
                },
                layer2: { objects: {}, renderOrder: [], extra: {} },
            },
        });

        storage.redoHistory("grid");
        // Undo a batch of actions
        expect(storage.objects).toEqual<StorageManager["objects"]>({
            grid: {
                layer1: {
                    objects: {
                        id1: { asdf: "something1", id: "id1" },
                        id2: { asdf: "something2", id: "id2" },
                        id3: { asdf: "something3", id: "id3" },
                    },
                    renderOrder: ["id1", "id2", "id3"],
                    extra: {},
                },
                layer2: { objects: {}, renderOrder: [], extra: {} },
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
        // Generate three of them, just because
        expect(storage.getNewBatchId()).toBeTruthy();
        expect(storage.getNewBatchId()).toBeTruthy();
        expect(storage.getNewBatchId()).toBeTruthy();
    });

    it("should not undo or redo with an empty history", () => {
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

    it("should not undo/redo past the limits of history with a filled history", () => {
        const storage = getNormalStorage();

        const objectsBeforeAction = cloneDeep(storage.objects);
        storage.addToHistory({ id: "grid" }, { id: "layer1" }, [
            { id: "id1", object: { asdf: "something1" } },
        ]);
        const objectsAfterAction = cloneDeep(storage.objects);

        // Ensure the initial states are good
        expect(objectsBeforeAction).toEqual<StorageManager["objects"]>({
            grid: {
                layer1: { objects: {}, renderOrder: [], extra: {} },
                layer2: { objects: {}, renderOrder: [], extra: {} },
            },
        });
        expect(objectsAfterAction).toEqual<StorageManager["objects"]>({
            grid: {
                layer1: {
                    objects: { id1: { asdf: "something1", id: "id1" } },
                    renderOrder: ["id1"],
                    extra: {},
                },
                layer2: { objects: {}, renderOrder: [], extra: {} },
            },
        });
        const afterRedo: StorageManager["histories"][0] = {
            actions: [
                {
                    id: "id1",
                    layerId: "layer1",
                    renderIndex: -1,
                    object: null,
                },
            ],
            index: 1,
        };
        const afterUndo: StorageManager["histories"][0] = {
            actions: [
                {
                    id: "id1",
                    layerId: "layer1",
                    renderIndex: 0,
                    object: { id: "id1", asdf: "something1" },
                },
            ],
            index: 0,
        };
        expect(storage.histories["grid"]).toMatchObject(afterRedo);

        storage.undoHistory("grid");
        expect(storage.objects).toEqual(objectsBeforeAction);
        expect(storage.histories["grid"]).toMatchObject(afterUndo);
        // A second undo should not change anything
        storage.undoHistory("grid");
        expect(storage.objects).toEqual(objectsBeforeAction);
        expect(storage.histories["grid"]).toMatchObject(afterUndo);

        storage.redoHistory("grid");
        expect(storage.objects).toEqual(objectsAfterAction);
        expect(storage.histories["grid"]).toMatchObject(afterRedo);
        // A second redo should not change anything
        storage.redoHistory("grid");
        expect(storage.objects).toEqual(objectsAfterAction);
        expect(storage.histories["grid"]).toMatchObject(afterRedo);
    });

    it("should not batch actions if the batchId's are both undefined", () => {
        const storage = getNormalStorage();
        storage.addToHistory({ id: "grid" }, { id: "layer1" }, [
            { id: "id1", object: { asdf: "something1" } },
            { id: "id1", object: { asdf: "something2" } },
        ]);

        expect(storage.histories["grid"].index).toBe(2);
        storage.undoHistory("grid");
        expect(storage.histories["grid"].index).toBe(1);
        storage.undoHistory("grid");
        expect(storage.histories["grid"].index).toBe(0);
        storage.redoHistory("grid");
        expect(storage.histories["grid"].index).toBe(1);
    });

    it("should not batch actions if one batchId is undefined", () => {
        const storage = getNormalStorage();
        storage.addToHistory({ id: "grid" }, { id: "layer1" }, [
            { id: "id1", object: { asdf: "something1" } },
            { id: "id1", object: { asdf: "something2" }, batchId: 1 },
        ]);

        expect(storage.histories["grid"].index).toBe(2);
        storage.undoHistory("grid");
        expect(storage.histories["grid"].index).toBe(1);
        storage.undoHistory("grid");
        expect(storage.histories["grid"].index).toBe(0);
        storage.redoHistory("grid");
        expect(storage.histories["grid"].index).toBe(1);
    });

    it("should not batch actions if both batchId's are defined but not equal", () => {
        const storage = getNormalStorage();
        storage.addToHistory({ id: "grid" }, { id: "layer1" }, [
            { id: "id1", object: { asdf: "something1", batchId: 1 } },
            { id: "id1", object: { asdf: "something2", batchId: 2 } },
        ]);

        expect(storage.histories["grid"].index).toBe(2);
        storage.undoHistory("grid");
        expect(storage.histories["grid"].index).toBe(1);
        storage.undoHistory("grid");
        expect(storage.histories["grid"].index).toBe(0);
        storage.redoHistory("grid");
        expect(storage.histories["grid"].index).toBe(1);
    });

    it("should return the actions applied when undoing/redoing", () => {
        const storage = getNormalStorage();
        storage.addToHistory({ id: "grid" }, { id: "layer1" }, [
            { id: "id1", object: { asdf: "something1" } },
        ]);
        storage.addToHistory({ id: "grid" }, { id: "layer2" }, [
            { id: "id2", object: { asdf: "something2" } },
        ]);

        let result: HistoryAction[];

        result = storage.undoHistory("grid");
        expect(result).toMatchObject<HistoryAction[]>([
            {
                id: "id2",
                layerId: "layer2",
                object: null,
                renderIndex: -1,
            },
        ]);

        result = storage.undoHistory("grid");
        expect(result).toMatchObject<HistoryAction[]>([
            {
                id: "id1",
                layerId: "layer1",
                object: null,
                renderIndex: -1,
            },
        ]);

        result = storage.undoHistory("grid");
        expect(result).toEqual<HistoryAction[]>([]);

        result = storage.redoHistory("grid");
        expect(result).toMatchObject<HistoryAction[]>([
            {
                id: "id1",
                layerId: "layer1",
                object: { asdf: "something1", id: "id1" },
                renderIndex: 0,
            },
        ]);

        result = storage.redoHistory("grid");
        expect(result).toMatchObject<HistoryAction[]>([
            {
                id: "id2",
                layerId: "layer2",
                object: { asdf: "something2", id: "id2" },
                renderIndex: 0,
            },
        ]);

        result = storage.redoHistory("grid");
        expect(result).toEqual<HistoryAction[]>([]);
    });

    it.todo("should have tests related to storageReducers");

    it.todo(
        "should only prune redo actions when actions will be added to history (think selection layer, add better description)",
    );
});
