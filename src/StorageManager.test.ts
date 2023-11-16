import { cloneDeep } from "lodash";
import { StorageManager } from "./StorageManager";
import {
    EditMode,
    Grid,
    History,
    Layer,
    LayerProps,
    StorageFilter,
    HistoryAction as UntypedHistoryAction,
    PartialHistoryAction as UntypedPartialHistoryAction,
} from "./types";
import { PUT_AT_END } from "./utils/OrderedMap";
import { notify } from "./utils/notifications";
import { layerEventEssentials } from "./utils/testing/layerEventEssentials";

interface FakeLayerProps extends LayerProps {
    ObjectState: { asdf: string };
}
type HistoryEntries = Array<[string, FakeLayerProps["ObjectState"]]>;
type HistoryAction = UntypedHistoryAction<FakeLayerProps>;
type PartialHistoryAction = UntypedPartialHistoryAction<FakeLayerProps>;

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

const fakePuzzle = (gridId: Grid["id"], editMode: EditMode): Parameters<StorageFilter>[0] => {
    const result = layerEventEssentials({});
    result.grid.id = gridId;
    result.settings.editMode = editMode;
    return result;
};

const gridLayer = (grid: Grid["id"], layer: Layer["id"]) => ({
    grid: { id: grid },
    layer: { id: layer },
});

describe("StorageManager", () => {
    it("adds a new object correctly", () => {
        const storage = getNormalStorage();
        const stored = storage.getStored(gridLayer("grid", "layer1"));
        const action: HistoryAction = {
            objectId: "objectId",
            layerId: "layer1",
            object: { asdf: "something" },
            prevObjectId: null,
            storageMode: "question",
        };
        storage._applyHistoryAction({ stored, action });

        expect([...storage.objects["grid"]["layer1"].entries("question")]).toEqual<HistoryEntries>([
            ["objectId", { asdf: "something" }],
        ]);
    });

    it("deletes an object correctly", () => {
        const storage = getNormalStorage();
        const stored = storage.getStored(gridLayer("grid", "layer1"));
        const action: HistoryAction = {
            objectId: "objectId",
            layerId: "layer1",
            object: null,
            prevObjectId: null,
            storageMode: "question",
        };
        storage._applyHistoryAction({ stored, action });

        expect([...storage.objects["grid"]["layer1"].entries("question")]).toEqual<HistoryEntries>(
            [],
        );
    });

    it("object placement should be idempotent", () => {
        const storage = getNormalStorage();
        const stored = storage.getStored(gridLayer("grid", "layer1"));
        const action: HistoryAction = {
            objectId: "objectId",
            layerId: "layer1",
            object: { asdf: "something" },
            prevObjectId: null,
            storageMode: "question",
        };
        storage._applyHistoryAction({ stored, action });
        storage._applyHistoryAction({ stored, action });

        expect([...storage.objects["grid"]["layer1"].entries("question")]).toEqual<HistoryEntries>([
            ["objectId", { asdf: "something" }],
        ]);
    });

    it("object deletion should be idempotent", () => {
        const storage = getNormalStorage();
        const stored = storage.getStored(gridLayer("grid", "layer1"));
        const action: HistoryAction = {
            objectId: "objectId",
            layerId: "layer1",
            object: null,
            prevObjectId: null,
            storageMode: "question",
        };
        storage._applyHistoryAction({ stored, action });
        storage._applyHistoryAction({ stored, action });

        expect([...storage.objects["grid"]["layer1"].entries("question")]).toEqual<HistoryEntries>(
            [],
        );
    });

    it("returns the same object when inverted twice", () => {
        const storage = getNormalStorage();
        const stored = storage.getStored(gridLayer("grid", "layer1"));
        const action: HistoryAction = {
            objectId: "objectId",
            layerId: "layer1",
            object: { asdf: "something" },
            prevObjectId: null,
            storageMode: "question",
        };
        const inverse = storage._applyHistoryAction({ stored, action });
        expect(inverse).toEqual<HistoryAction>({
            objectId: "objectId",
            layerId: "layer1",
            object: null,
            prevObjectId: PUT_AT_END,
            storageMode: "question",
        });

        const sameAction = storage._applyHistoryAction({ stored, action });
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
            ] satisfies PartialHistoryAction[],
        });

        storage.undoHistory(puzzle);
        // An non-batched undo should not affect the batched actions
        expect([...storage.objects["grid"]["layer1"].entries("question")]).toEqual<HistoryEntries>([
            ["id1", { asdf: "something1" }],
            ["id2", { asdf: "something2" }],
            ["id3", { asdf: "something3" }],
        ]);

        storage.undoHistory(puzzle);
        // Undo a batch of actions
        expect([...storage.objects["grid"]["layer1"].entries("question")]).toEqual<HistoryEntries>([
            ["id1", { asdf: "something1" }],
        ]);

        storage.redoHistory(puzzle);
        // Undo a batch of actions
        expect([...storage.objects["grid"]["layer1"].entries("question")]).toEqual<HistoryEntries>([
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
            ] satisfies PartialHistoryAction[],
        });

        expect(storage.histories["grid"].actions).toHaveLength(3);
        expect(storage.histories["grid"].index).toBe(3);
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
            ] satisfies PartialHistoryAction[],
        });

        expect(storage.histories["grid"].actions).toHaveLength(2);
        expect(storage.histories["grid"].index).toBe(2);
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
            grid: { actions: [] satisfies PartialHistoryAction[], index: 0 },
        });
        storage.redoHistory(puzzle);
        expect(storage.histories).toEqual<StorageManager["histories"]>({
            grid: { actions: [] satisfies PartialHistoryAction[], index: 0 },
        });
    });

    it("does not undo/redo past the limits of history with a filled history", () => {
        const puzzle = fakePuzzle("grid", "question");
        const storage = getNormalStorage();

        expect(storage.canUndo(puzzle)).toBe(false);
        expect(storage.canRedo(puzzle)).toBe(false);

        const objectsBeforeAction = cloneDeep(storage.objects);
        storage.addToHistory({
            puzzle,
            layerId: "layer1",
            actions: [
                { id: "id1", object: { asdf: "something1" } },
            ] satisfies PartialHistoryAction[],
        });
        const objectsAfterAction = cloneDeep(storage.objects);

        // Ensure the initial states are good
        expect([
            ...objectsBeforeAction["grid"]["layer1"].entries("question"),
        ]).toEqual<HistoryEntries>([]);
        expect([
            ...objectsAfterAction["grid"]["layer1"].entries("question"),
        ]).toEqual<HistoryEntries>([["id1", { asdf: "something1" }]]);

        expect(storage.canUndo(puzzle)).toBe(true);
        expect(storage.canRedo(puzzle)).toBe(false);

        const afterRedo: StorageManager["histories"][number] = {
            actions: [
                {
                    objectId: "id1",
                    layerId: "layer1",
                    prevObjectId: PUT_AT_END,
                    object: null,
                    storageMode: "question",
                },
            ] satisfies HistoryAction[],
            index: 1,
        };
        const afterUndo: StorageManager["histories"][number] = {
            actions: [
                {
                    objectId: "id1",
                    layerId: "layer1",
                    prevObjectId: null,
                    object: { asdf: "something1" },
                    storageMode: "question",
                },
            ] satisfies HistoryAction[],
            index: 0,
        };
        expect(storage.histories["grid"]).toEqual<History>(afterRedo);

        storage.undoHistory(puzzle);
        expect(storage.objects).toEqual(objectsBeforeAction);
        expect(storage.histories["grid"]).toEqual<History>(afterUndo);
        expect(storage.canUndo(puzzle)).toBe(false);
        expect(storage.canRedo(puzzle)).toBe(true);

        // A second undo should not change anything
        storage.undoHistory(puzzle);
        expect(storage.objects).toEqual(objectsBeforeAction);
        expect(storage.histories["grid"]).toEqual<History>(afterUndo);
        expect(storage.canUndo(puzzle)).toBe(false);
        expect(storage.canRedo(puzzle)).toBe(true);

        storage.redoHistory(puzzle);
        expect(storage.objects).toEqual(objectsAfterAction);
        expect(storage.histories["grid"]).toEqual<History>(afterRedo);
        expect(storage.canUndo(puzzle)).toBe(true);
        expect(storage.canRedo(puzzle)).toBe(false);

        // A second redo should not change anything
        storage.redoHistory(puzzle);
        expect(storage.objects).toEqual(objectsAfterAction);
        expect(storage.histories["grid"]).toEqual<History>(afterRedo);
        expect(storage.canUndo(puzzle)).toBe(true);
        expect(storage.canRedo(puzzle)).toBe(false);
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
            ] satisfies PartialHistoryAction[],
        });

        expect(storage.histories["grid"].index).toBe(2);
        storage.undoHistory(puzzle);
        expect(storage.histories["grid"].index).toBe(1);
        storage.undoHistory(puzzle);
        expect(storage.histories["grid"].index).toBe(0);
        storage.redoHistory(puzzle);
        expect(storage.histories["grid"].index).toBe(1);
    });

    it("does not batch actions if one batchId is undefined", () => {
        const puzzle = fakePuzzle("grid", "question");
        const storage = getNormalStorage();
        storage.addToHistory({
            puzzle,
            layerId: "layer1",
            actions: [
                { id: "id1", object: { asdf: "something1" } },
                { id: "id1", object: { asdf: "something2", batchId: 1 } },
            ] satisfies PartialHistoryAction[],
        });

        expect(storage.histories["grid"].index).toBe(2);
        storage.undoHistory(puzzle);
        expect(storage.histories["grid"].index).toBe(1);
        storage.undoHistory(puzzle);
        expect(storage.histories["grid"].index).toBe(0);
        storage.redoHistory(puzzle);
        expect(storage.histories["grid"].index).toBe(1);
    });

    it("does not batch actions if both batchId's are defined but not equal", () => {
        const puzzle = fakePuzzle("grid", "question");
        const storage = getNormalStorage();
        storage.addToHistory({
            puzzle,
            layerId: "layer1",
            actions: [
                { id: "id1", object: { asdf: "something1" }, batchId: 1 },
                { id: "id1", object: { asdf: "something2" }, batchId: 2 },
            ] satisfies PartialHistoryAction[],
        });

        expect(storage.histories["grid"].index).toBe(2);
        storage.undoHistory(puzzle);
        expect(storage.histories["grid"].index).toBe(1);
        storage.undoHistory(puzzle);
        expect(storage.histories["grid"].index).toBe(0);
        storage.redoHistory(puzzle);
        expect(storage.histories["grid"].index).toBe(1);
    });

    it("returns the actions applied when undoing/redoing", () => {
        const puzzle = fakePuzzle("grid", "question");
        const storage = getNormalStorage();
        storage.addToHistory({
            puzzle,
            layerId: "layer1",
            actions: [
                { id: "id1", object: { asdf: "something1" } },
            ] satisfies PartialHistoryAction[],
        });
        storage.addToHistory({
            puzzle,
            layerId: "layer2",
            actions: [
                { id: "id2", object: { asdf: "something2" } },
            ] satisfies PartialHistoryAction[],
        });

        let result: UntypedHistoryAction[];

        result = storage.undoHistory(puzzle);
        expect(result).toEqual<HistoryAction[]>([
            {
                batchId: undefined,
                objectId: "id2",
                layerId: "layer2",
                object: null,
                prevObjectId: PUT_AT_END,
                storageMode: "question",
            },
        ]);

        result = storage.undoHistory(puzzle);
        expect(result).toEqual<HistoryAction[]>([
            {
                batchId: undefined,
                objectId: "id1",
                layerId: "layer1",
                object: null,
                prevObjectId: PUT_AT_END,
                storageMode: "question",
            },
        ]);

        result = storage.undoHistory(puzzle);
        expect(result).toEqual<HistoryAction[]>([]);

        result = storage.redoHistory(puzzle);
        expect(result).toEqual<HistoryAction[]>([
            {
                batchId: undefined,
                objectId: "id1",
                layerId: "layer1",
                object: { asdf: "something1" },
                prevObjectId: null,
                storageMode: "question",
            },
        ]);

        result = storage.redoHistory(puzzle);
        expect(result).toEqual<HistoryAction[]>([
            {
                batchId: undefined,
                objectId: "id2",
                layerId: "layer2",
                object: { asdf: "something2" },
                prevObjectId: null,
                storageMode: "question",
            },
        ]);

        result = storage.redoHistory(puzzle);
        expect(result).toEqual<HistoryAction[]>([]);
    });

    it("does not prune history when actions have batchId=ignore or are ui actions", () => {
        const notifySpy = vi.spyOn(notify, "error").mockImplementation(() => Error());

        const puzzle = fakePuzzle("grid", "question");
        const storage = getNormalStorage();
        storage.addToHistory({
            puzzle,
            layerId: "layer1",
            actions: [
                { id: "id1", object: { asdf: "something1" }, batchId: 1 },
                { id: "id1", object: { asdf: "something2" }, batchId: 2 },
            ] satisfies PartialHistoryAction[],
        });
        storage.undoHistory(puzzle);

        storage.addToHistory({
            puzzle,
            layerId: "layer1",
            actions: [
                { id: "id1", object: { asdf: "something1" }, batchId: "ignore" },
                { id: "id1", object: { asdf: "something2" }, storageMode: "ui" },
            ] satisfies PartialHistoryAction[],
        });
        expect(storage.histories["grid"].actions).toHaveLength(2);

        // Because actions with storageMode=="ui" should have set batchId=="ignore"
        expect(notifySpy).toBeCalledTimes(1);

        vi.clearAllMocks();
    });

    // TODO: If I'm gonna even use storageReducers...
    it.todo("should add some tests related to storageReducers");
});
