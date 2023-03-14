import { cloneDeep } from "lodash";
import { PuzzleForStorage, StorageManager } from "./StorageManager";
import { EditMode, Grid, History, HistoryAction, Layer, UnknownObject } from "./types";

type HistoryEntries = Array<[string, UnknownObject]>;

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

const fakePuzzle = (grid: Grid["id"], editMode: EditMode): PuzzleForStorage => ({
    grid: { id: grid },
    settings: { editMode },
});

const gridLayer = (grid: Grid["id"], layer: Layer["id"]) => ({
    grid: { id: grid },
    layer: { id: layer },
});

describe("StorageManager", () => {
    it("adds a new object correctly", () => {
        const storage = getNormalStorage();
        const { objects, groups } = storage.getStored(gridLayer("grid", "layer1"));
        const action: HistoryAction = {
            objectId: "objectId",
            layerId: "layer1",
            object: { asdf: "something" },
            nextObjectId: null,
        };
        storage._ApplyHistoryAction({ objects, groups, action, storageMode: "question" });

        expect(storage.objects["grid"]["layer1"].objects.entries()).toEqual<HistoryEntries>([
            ["objectId", { asdf: "something" }],
        ]);
    });

    it("deletes an object correctly", () => {
        const storage = getNormalStorage();
        const { objects, groups } = storage.getStored(gridLayer("grid", "layer1"));
        const action: HistoryAction = {
            objectId: "objectId",
            layerId: "layer1",
            object: null,
            nextObjectId: null,
        };
        storage._ApplyHistoryAction({ objects, groups, action, storageMode: "question" });

        expect(storage.objects["grid"]["layer1"].objects.entries()).toEqual<HistoryEntries>([]);
    });

    it("object placement should be idempotent", () => {
        const storage = getNormalStorage();
        const { objects, groups } = storage.getStored(gridLayer("grid", "layer1"));
        const action: HistoryAction = {
            objectId: "objectId",
            layerId: "layer1",
            object: { asdf: "something" },
            nextObjectId: null,
        };
        storage._ApplyHistoryAction({ objects, groups, action, storageMode: "question" });
        storage._ApplyHistoryAction({ objects, groups, action, storageMode: "question" });

        expect(storage.objects["grid"]["layer1"].objects.entries()).toEqual<HistoryEntries>([
            ["objectId", { asdf: "something" }],
        ]);
    });

    it("object deletion should be idempotent", () => {
        const storage = getNormalStorage();
        const { objects, groups } = storage.getStored(gridLayer("grid", "layer1"));
        const action: HistoryAction = {
            objectId: "objectId",
            layerId: "layer1",
            object: null,
            nextObjectId: null,
        };
        storage._ApplyHistoryAction({ objects, groups, action, storageMode: "question" });
        storage._ApplyHistoryAction({ objects, groups, action, storageMode: "question" });

        expect(storage.objects["grid"]["layer1"].objects.entries()).toEqual<HistoryEntries>([]);
    });

    it("returns the same object when inverted twice", () => {
        const storage = getNormalStorage();
        const { objects, groups } = storage.getStored(gridLayer("grid", "layer1"));
        const action: HistoryAction = {
            objectId: "objectId",
            layerId: "layer1",
            object: { asdf: "something" },
            nextObjectId: null,
        };
        const inverse = storage._ApplyHistoryAction({
            objects,
            groups,
            action,
            storageMode: "question",
        });
        expect(inverse).toEqual<HistoryAction>({
            objectId: "objectId",
            layerId: "layer1",
            object: null,
            nextObjectId: null,
        });

        const sameAction = storage._ApplyHistoryAction({
            objects,
            groups,
            action,
            storageMode: "question",
        });
        expect(sameAction).toEqual<HistoryAction>(action);
    });

    it("batches undo/redo actions with the same batchId", () => {
        const puzzle = fakePuzzle("grid", "question");
        const storage = getNormalStorage();
        storage.addToHistory({
            puzzle,
            layerId: "layer1",
            actions: [
                { id: "id1", object: { asdf: "something1" } },
                { id: "id2", object: { asdf: "something2" }, batchId: 1 },
                { id: "id3", object: { asdf: "something3" }, batchId: 1 },
                { id: "id4", object: { asdf: "something4" } },
            ],
        });

        storage.undoHistory(puzzle);
        // An non-batched undo should not affect the batched actions
        expect(storage.objects["grid"]["layer1"].objects.entries()).toEqual<HistoryEntries>([
            ["id1", { asdf: "something1" }],
            ["id2", { asdf: "something2" }],
            ["id3", { asdf: "something3" }],
        ]);

        storage.undoHistory(puzzle);
        // Undo a batch of actions
        expect(storage.objects["grid"]["layer1"].objects.entries()).toEqual<HistoryEntries>([
            ["id1", { asdf: "something1" }],
        ]);

        storage.redoHistory(puzzle);
        // Undo a batch of actions
        expect(storage.objects["grid"]["layer1"].objects.entries()).toEqual<HistoryEntries>([
            ["id1", { asdf: "something1" }],
            ["id2", { asdf: "something2" }],
            ["id3", { asdf: "something3" }],
        ]);
    });

    it("merges batched actions affecting the same object", () => {
        const puzzle = fakePuzzle("grid", "question");
        const storage = getNormalStorage();

        storage.addToHistory({
            puzzle,
            layerId: "layer1",
            actions: [
                { id: "id1", object: { asdf: "something1" } },
                { id: "id2", object: { asdf: "something2" }, batchId: 1 },
                { id: "id2", object: { asdf: "changed" }, batchId: 1 },
                { id: "id3", object: { asdf: "something3" } },
            ],
        });

        expect(storage.histories["grid-question"].actions.length).toBe(3);
        expect(storage.histories["grid-question"].index).toBe(3);
    });

    it("removes batched actions affecting the same object that are no-ops", () => {
        const puzzle = fakePuzzle("grid", "question");
        const storage = getNormalStorage();

        storage.addToHistory({
            puzzle,
            layerId: "layer1",
            actions: [
                { id: "id1", object: { asdf: "something1" } },
                { id: "id2", object: { asdf: "something2" }, batchId: 1 },
                { id: "id2", object: { asdf: "changed" }, batchId: 1 },
                { id: "id2", object: null, batchId: 1 },
                { id: "id3", object: { asdf: "something3" } },
            ],
        });

        expect(storage.histories["grid-question"].actions.length).toBe(2);
        expect(storage.histories["grid-question"].index).toBe(2);
    });

    it("gives truthy batchIds", () => {
        const storage = getNormalStorage();
        // Generate three of them, just because
        expect(storage.getNewBatchId()).toBeTruthy();
        expect(storage.getNewBatchId()).toBeTruthy();
        expect(storage.getNewBatchId()).toBeTruthy();
    });

    it("does not undo or redo with an empty history", () => {
        const puzzle = fakePuzzle("grid", "question");
        const storage = getNormalStorage();
        storage.undoHistory(puzzle);
        expect(storage.histories).toEqual<StorageManager["histories"]>({
            "grid-question": { actions: [], index: 0 },
            "grid-answer": { actions: [], index: 0 },
            "grid-ui": { actions: [], index: 0 },
        });
        storage.redoHistory(puzzle);
        expect(storage.histories).toEqual<StorageManager["histories"]>({
            "grid-question": { actions: [], index: 0 },
            "grid-answer": { actions: [], index: 0 },
            "grid-ui": { actions: [], index: 0 },
        });
    });

    it("does not undo/redo past the limits of history with a filled history", () => {
        const puzzle = fakePuzzle("grid", "question");
        const storage = getNormalStorage();

        const objectsBeforeAction = cloneDeep(storage.objects);
        storage.addToHistory({
            puzzle,
            layerId: "layer1",
            actions: [{ id: "id1", object: { asdf: "something1" } }],
        });
        const objectsAfterAction = cloneDeep(storage.objects);

        // Ensure the initial states are good
        expect(objectsBeforeAction["grid"]["layer1"].objects.entries()).toEqual<HistoryEntries>([]);
        expect(objectsAfterAction["grid"]["layer1"].objects.entries()).toEqual<HistoryEntries>([
            ["id1", { asdf: "something1" }],
        ]);

        const afterRedo: StorageManager["histories"][0] = {
            actions: [
                {
                    objectId: "id1",
                    layerId: "layer1",
                    nextObjectId: null,
                    object: null,
                },
            ],
            index: 1,
        };
        const afterUndo: StorageManager["histories"][0] = {
            actions: [
                {
                    objectId: "id1",
                    layerId: "layer1",
                    nextObjectId: null,
                    object: { asdf: "something1" },
                },
            ],
            index: 0,
        };
        expect(storage.histories["grid-question"]).toEqual<History>(afterRedo);

        storage.undoHistory(puzzle);
        expect(storage.objects).toMatchObject(objectsBeforeAction);
        expect(storage.histories["grid-question"]).toEqual<History>(afterUndo);
        // A second undo should not change anything
        storage.undoHistory(puzzle);
        expect(storage.objects).toMatchObject(objectsBeforeAction);
        expect(storage.histories["grid-question"]).toEqual<History>(afterUndo);

        storage.redoHistory(puzzle);
        expect(storage.objects).toMatchObject(objectsAfterAction);
        expect(storage.histories["grid-question"]).toEqual<History>(afterRedo);
        // A second redo should not change anything
        storage.redoHistory(puzzle);
        expect(storage.objects).toMatchObject(objectsAfterAction);
        expect(storage.histories["grid-question"]).toEqual<History>(afterRedo);
    });

    it("does not batch actions if the batchId's are both undefined", () => {
        const puzzle = fakePuzzle("grid", "question");
        const storage = getNormalStorage();
        storage.addToHistory({
            puzzle,
            layerId: "layer1",
            actions: [
                { id: "id1", object: { asdf: "something1" } },
                { id: "id1", object: { asdf: "something2" } },
            ],
        });

        expect(storage.histories["grid-question"].index).toBe(2);
        storage.undoHistory(puzzle);
        expect(storage.histories["grid-question"].index).toBe(1);
        storage.undoHistory(puzzle);
        expect(storage.histories["grid-question"].index).toBe(0);
        storage.redoHistory(puzzle);
        expect(storage.histories["grid-question"].index).toBe(1);
    });

    it("does not batch actions if one batchId is undefined", () => {
        const puzzle = fakePuzzle("grid", "question");
        const storage = getNormalStorage();
        storage.addToHistory({
            puzzle,
            layerId: "layer1",
            actions: [
                { id: "id1", object: { asdf: "something1" } },
                { id: "id1", object: { asdf: "something2" }, batchId: 1 },
            ],
        });

        expect(storage.histories["grid-question"].index).toBe(2);
        storage.undoHistory(puzzle);
        expect(storage.histories["grid-question"].index).toBe(1);
        storage.undoHistory(puzzle);
        expect(storage.histories["grid-question"].index).toBe(0);
        storage.redoHistory(puzzle);
        expect(storage.histories["grid-question"].index).toBe(1);
    });

    it("does not batch actions if both batchId's are defined but not equal", () => {
        const puzzle = fakePuzzle("grid", "question");
        const storage = getNormalStorage();
        storage.addToHistory({
            puzzle,
            layerId: "layer1",
            actions: [
                { id: "id1", object: { asdf: "something1", batchId: 1 } },
                { id: "id1", object: { asdf: "something2", batchId: 2 } },
            ],
        });

        expect(storage.histories["grid-question"].index).toBe(2);
        storage.undoHistory(puzzle);
        expect(storage.histories["grid-question"].index).toBe(1);
        storage.undoHistory(puzzle);
        expect(storage.histories["grid-question"].index).toBe(0);
        storage.redoHistory(puzzle);
        expect(storage.histories["grid-question"].index).toBe(1);
    });

    it("returns the actions applied when undoing/redoing", () => {
        const puzzle = fakePuzzle("grid", "question");
        const storage = getNormalStorage();
        storage.addToHistory({
            puzzle,
            layerId: "layer1",
            actions: [{ id: "id1", object: { asdf: "something1" } }],
        });
        storage.addToHistory({
            puzzle,
            layerId: "layer2",
            actions: [{ id: "id2", object: { asdf: "something2" } }],
        });

        let result: HistoryAction[];

        result = storage.undoHistory(puzzle);
        expect(result).toMatchObject<HistoryAction[]>([
            {
                objectId: "id2",
                layerId: "layer2",
                object: null,
                nextObjectId: null,
            },
        ]);

        result = storage.undoHistory(puzzle);
        expect(result).toMatchObject<HistoryAction[]>([
            {
                objectId: "id1",
                layerId: "layer1",
                object: null,
                nextObjectId: null,
            },
        ]);

        result = storage.undoHistory(puzzle);
        expect(result).toEqual<HistoryAction[]>([]);

        result = storage.redoHistory(puzzle);
        expect(result).toMatchObject<HistoryAction[]>([
            {
                objectId: "id1",
                layerId: "layer1",
                object: { asdf: "something1" },
                nextObjectId: null,
            },
        ]);

        result = storage.redoHistory(puzzle);
        expect(result).toMatchObject<HistoryAction[]>([
            {
                objectId: "id2",
                layerId: "layer2",
                object: { asdf: "something2" },
                nextObjectId: null,
            },
        ]);

        result = storage.redoHistory(puzzle);
        expect(result).toEqual<HistoryAction[]>([]);
    });

    it.todo(
        "only undo/redo the current editMode (both forwards and backwards and both directions answer to question vice versa",
    );

    it.todo("does not allow editing the same object from different editModes");

    it.todo("should add some tests related to storageReducers");

    it.todo("does not prune history when actions have batchId=ignore or are ui actions");
});
