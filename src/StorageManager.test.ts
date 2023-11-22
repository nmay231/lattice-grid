import { cloneDeep } from "lodash";
import { StorageManager } from "./StorageManager";
import {
    EditMode,
    Grid,
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
    normalStorage.addStorage("layer1");
    normalStorage.addStorage("layer2");

    return normalStorage;
};

const fakePuzzle = (gridId: Grid["id"], editMode: EditMode): Parameters<StorageFilter>[0] => {
    const result = layerEventEssentials({});
    result.grid.id = gridId;
    result.settings.editMode = editMode;
    return result;
};

const historyOf = ({ history, index }: StorageManager) =>
    ({ history, index }) satisfies Partial<StorageManager>;

type StorageHistory = ReturnType<typeof historyOf>;

describe("StorageManager", () => {
    it("adds a new object correctly", () => {
        const storage = getNormalStorage();
        const stored = storage.getObjects("layer1");
        const action: HistoryAction = {
            objectId: "objectId",
            layerId: "layer1",
            object: { asdf: "something" },
            prevObjectId: null,
            storageMode: "question",
        };
        storage._applyHistoryAction({ stored, action });

        expect([...storage.objects["layer1"].entries("question")]).toEqual<HistoryEntries>([
            ["objectId", { asdf: "something" }],
        ]);
    });

    it("deletes an object correctly", () => {
        const storage = getNormalStorage();
        const stored = storage.getObjects("layer1");
        const action: HistoryAction = {
            objectId: "objectId",
            layerId: "layer1",
            object: null,
            prevObjectId: null,
            storageMode: "question",
        };
        storage._applyHistoryAction({ stored, action });

        expect([...storage.objects["layer1"].entries("question")]).toEqual<HistoryEntries>([]);
    });

    it("object placement should be idempotent", () => {
        const storage = getNormalStorage();
        const stored = storage.getObjects("layer1");
        const action: HistoryAction = {
            objectId: "objectId",
            layerId: "layer1",
            object: { asdf: "something" },
            prevObjectId: null,
            storageMode: "question",
        };
        storage._applyHistoryAction({ stored, action });
        storage._applyHistoryAction({ stored, action });

        expect([...storage.objects["layer1"].entries("question")]).toEqual<HistoryEntries>([
            ["objectId", { asdf: "something" }],
        ]);
    });

    it("object deletion should be idempotent", () => {
        const storage = getNormalStorage();
        const stored = storage.getObjects("layer1");
        const action: HistoryAction = {
            objectId: "objectId",
            layerId: "layer1",
            object: null,
            prevObjectId: null,
            storageMode: "question",
        };
        storage._applyHistoryAction({ stored, action });
        storage._applyHistoryAction({ stored, action });

        expect([...storage.objects["layer1"].entries("question")]).toEqual<HistoryEntries>([]);
    });

    it("returns the same object when inverted twice", () => {
        const storage = getNormalStorage();
        const stored = storage.getObjects("layer1");
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

        storage.undoHistory();
        // An non-batched undo should not affect the batched actions
        expect([...storage.objects["layer1"].entries("question")]).toEqual<HistoryEntries>([
            ["id1", { asdf: "something1" }],
            ["id2", { asdf: "something2" }],
            ["id3", { asdf: "something3" }],
        ]);

        storage.undoHistory();
        // Undo a batch of actions
        expect([...storage.objects["layer1"].entries("question")]).toEqual<HistoryEntries>([
            ["id1", { asdf: "something1" }],
        ]);

        storage.redoHistory();
        // Undo a batch of actions
        expect([...storage.objects["layer1"].entries("question")]).toEqual<HistoryEntries>([
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

        expect(storage.history).toHaveLength(3);
        expect(storage.index).toBe(3);
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

        expect(storage.history).toHaveLength(2);
        expect(storage.index).toBe(2);
    });

    it("gives truthy batchIds", () => {
        const storage = getNormalStorage();
        // Generate three of them, just because
        expect(storage.getNewBatchId()).toBeTruthy();
        expect(storage.getNewBatchId()).toBeTruthy();
        expect(storage.getNewBatchId()).toBeTruthy();
    });

    it("does not undo or redo with an empty history", () => {
        const storage = getNormalStorage();
        storage.undoHistory();
        expect(historyOf(storage)).toEqual<StorageHistory>({
            history: [] satisfies PartialHistoryAction[],
            index: 0,
        });
        storage.redoHistory();
        expect(historyOf(storage)).toEqual<StorageHistory>({
            history: [] satisfies PartialHistoryAction[],
            index: 0,
        });
    });

    it("does not undo/redo past the limits of history with a filled history", () => {
        const puzzle = fakePuzzle("grid", "question");
        const storage = getNormalStorage();

        expect(storage.canUndo()).toBe(false);
        expect(storage.canRedo()).toBe(false);

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
        expect([...objectsBeforeAction["layer1"].entries("question")]).toEqual<HistoryEntries>([]);
        expect([...objectsAfterAction["layer1"].entries("question")]).toEqual<HistoryEntries>([
            ["id1", { asdf: "something1" }],
        ]);

        expect(storage.canUndo()).toBe(true);
        expect(storage.canRedo()).toBe(false);

        const afterRedo: StorageHistory = {
            history: [
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
        const afterUndo: StorageHistory = {
            history: [
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
        expect(historyOf(storage)).toEqual<StorageHistory>(afterRedo);

        storage.undoHistory();
        expect(storage.objects).toEqual(objectsBeforeAction);
        expect(historyOf(storage)).toEqual<StorageHistory>(afterUndo);
        expect(storage.canUndo()).toBe(false);
        expect(storage.canRedo()).toBe(true);

        // A second undo should not change anything
        storage.undoHistory();
        expect(storage.objects).toEqual(objectsBeforeAction);
        expect(historyOf(storage)).toEqual<StorageHistory>(afterUndo);
        expect(storage.canUndo()).toBe(false);
        expect(storage.canRedo()).toBe(true);

        storage.redoHistory();
        expect(storage.objects).toEqual(objectsAfterAction);
        expect(historyOf(storage)).toEqual<StorageHistory>(afterRedo);
        expect(storage.canUndo()).toBe(true);
        expect(storage.canRedo()).toBe(false);

        // A second redo should not change anything
        storage.redoHistory();
        expect(storage.objects).toEqual(objectsAfterAction);
        expect(historyOf(storage)).toEqual<StorageHistory>(afterRedo);
        expect(storage.canUndo()).toBe(true);
        expect(storage.canRedo()).toBe(false);
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

        expect(storage.index).toBe(2);
        storage.undoHistory();
        expect(storage.index).toBe(1);
        storage.undoHistory();
        expect(storage.index).toBe(0);
        storage.redoHistory();
        expect(storage.index).toBe(1);
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

        expect(storage.index).toBe(2);
        storage.undoHistory();
        expect(storage.index).toBe(1);
        storage.undoHistory();
        expect(storage.index).toBe(0);
        storage.redoHistory();
        expect(storage.index).toBe(1);
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

        expect(storage.index).toBe(2);
        storage.undoHistory();
        expect(storage.index).toBe(1);
        storage.undoHistory();
        expect(storage.index).toBe(0);
        storage.redoHistory();
        expect(storage.index).toBe(1);
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

        result = storage.undoHistory();
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

        result = storage.undoHistory();
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

        result = storage.undoHistory();
        expect(result).toEqual<HistoryAction[]>([]);

        result = storage.redoHistory();
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

        result = storage.redoHistory();
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

        result = storage.redoHistory();
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
        storage.undoHistory();

        storage.addToHistory({
            puzzle,
            layerId: "layer1",
            actions: [
                { id: "id1", object: { asdf: "something3" }, batchId: "ignore" },
                { id: "id1", object: { asdf: "ui something" }, storageMode: "ui" },
            ] satisfies PartialHistoryAction[],
        });
        expect(storage.history).toHaveLength(2);

        // Because actions with storageMode=="ui" should have set batchId=="ignore"
        expect(notifySpy).toBeCalledTimes(1);

        expect(storage.getObjects("layer1").entries("question")).toEqual([
            ["id1", { asdf: "something3" }],
        ]);
        expect(storage.getObjects("layer1").entries("ui")).toEqual([
            ["id1", { asdf: "ui something" }],
        ]);

        vi.clearAllMocks();
    });

    // TODO: Doesn't work because layer storage objects are not ordered (for now)
    it("keeps object insertion order when un-/re-done", () => {
        const puzzle = fakePuzzle("grid", "question");
        const storage = getNormalStorage();
        storage.addToHistory({
            puzzle,
            layerId: "layer1",
            actions: [
                { id: "id1", object: { asdf: "on the bottom" } },
                { id: "id2", object: { asdf: "on the top" } },
                { id: "id3", object: { asdf: "I am the captain now" } },
            ] satisfies PartialHistoryAction[],
        });

        // TODO: Shouldn't LayerStorage allow getting ordered ids without using .entries()?
        const objectOrder = () =>
            [...storage.objects["layer1"].entries("question")].map(([id]) => id);

        const firstOrder = ["id1", "id2", "id3"];
        expect(objectOrder()).toEqual(firstOrder);

        storage.addToHistory({
            puzzle,
            layerId: "layer1",
            actions: [
                { id: "id1", object: { asdf: "moved to the top from the bottom" } },
            ] satisfies PartialHistoryAction[],
        });
        const secondOrder = ["id2", "id3", "id1"];
        expect(objectOrder()).toEqual(secondOrder);

        storage.addToHistory({
            puzzle,
            layerId: "layer1",
            actions: [
                { id: "id3", object: { asdf: "moved to the top from the middle" } },
            ] satisfies PartialHistoryAction[],
        });
        const thirdOrder = ["id2", "id1", "id3"];
        expect(objectOrder()).toEqual(thirdOrder);

        // Undo
        storage.undoHistory();
        expect(objectOrder()).toEqual(secondOrder);
        storage.undoHistory();
        expect(objectOrder()).toEqual(firstOrder);

        // Redo
        storage.redoHistory();
        expect(objectOrder()).toEqual(secondOrder);
        storage.redoHistory();
        expect(objectOrder()).toEqual(thirdOrder);

        // Rinse, lather, repeat
        storage.undoHistory();
        expect(objectOrder()).toEqual(secondOrder);
        storage.undoHistory();
        expect(objectOrder()).toEqual(firstOrder);

        storage.redoHistory();
        expect(objectOrder()).toEqual(secondOrder);
        storage.redoHistory();
        expect(objectOrder()).toEqual(thirdOrder);
    });
});

describe("StorageManager StorageFilters", () => {
    it("registers filters with explicit layerId(s) the same as with default layerId", () => {
        // Given an empty StorageManager
        const storage = getNormalStorage();
        const puzzle = fakePuzzle("grid", "question");

        const filter1: StorageFilter = () => ({ keep: true });
        const filter2: StorageFilter = () => ({ keep: true });

        // When a filter is registered using default layer
        storage.addStorageFilters(puzzle, [{ filter: filter1 }], "layer1");
        // ... and a filter registered using explicit layerIds
        storage.addStorageFilters(puzzle, [{ filter: filter2, layerIds: ["layer1"] }], "layer2");

        // Then they are both registered to the same layer
        expect(storage.filtersByLayer).toEqual({
            layer1: [filter1, filter2],
        });
    });

    it("registers filters once", () => {
        // Given an empty StorageManager
        const storage = getNormalStorage();
        const puzzle = fakePuzzle("grid", "question");

        const filter: StorageFilter = () => ({ keep: true });
        // When a filter is registered multiple times
        storage.addStorageFilters(puzzle, [{ filter }], "layer1");
        storage.addStorageFilters(puzzle, [{ filter }], "layer1");
        storage.addStorageFilters(puzzle, [{ filter }], "layer1");

        // Then it's only added once
        expect(storage.filtersByLayer).toEqual({ layer1: [filter] });
        expect([...storage.layersByFilters.entries()]).toEqual([
            [filter, { layerIds: ["layer1"] }],
        ]);
    });

    it("deregisters filters correctly", () => {
        // Given a StorageManger with a filter
        const storage = getNormalStorage();
        const puzzle = fakePuzzle("grid", "question");
        const filter: StorageFilter = () => ({ keep: true });
        storage.addStorageFilters(puzzle, [{ filter }], "layer1");

        // When the filter is removed
        storage.removeStorageFilters([filter]);

        // Then is actually removed
        expect(storage.filtersByLayer).toEqual({ layer1: [] });
        expect([...storage.layersByFilters.entries()]).toEqual([]);
    });

    it("registers simple filters that keeps new and updated valid actions", () => {
        // Given a StorageManager with lots of examples
        const storage = getNormalStorage();
        const puzzle = fakePuzzle("grid", "question");
        storage.addToHistory({
            puzzle,
            layerId: "layer1",
            actions: [
                { id: "1", object: { asdf: "constant" } },
                { id: "2", object: { asdf: "starting state" } },
                { id: "2", object: { asdf: "ending state" } },
                { id: "3", object: { asdf: "starting state" } },
                { id: "3", object: { asdf: "It's just a phase mom!" } },
                { id: "3", object: { asdf: "ending state" } },
            ] satisfies PartialHistoryAction[],
        });

        // When a filter that doesn't change any of those objects is registered
        const identity = vi.fn((() => ({ keep: true })) satisfies StorageFilter);
        storage.addStorageFilters(puzzle, [{ filter: identity }], "layer1");

        // Then no actions are filtered
        expect(identity).toBeCalledTimes(6);
        expect(storage.history).toHaveLength(6);

        // ... and no objects deleted
        expect(storage.objects["layer1"].entries("question")).toEqual<HistoryEntries>([
            ["1", { asdf: "constant" }],
            ["2", { asdf: "ending state" }],
            ["3", { asdf: "ending state" }],
        ]);
    });

    it("registers simple filters that removes new invalid objects", () => {
        // Given a StorageManager with lots of examples
        const storage = getNormalStorage();
        const puzzle = fakePuzzle("grid", "question");
        storage.addToHistory({
            puzzle,
            layerId: "layer1",
            actions: [
                { id: "1", object: { asdf: "constant" } },
                { id: "2", object: { asdf: "starting state" } },
                { id: "2", object: { asdf: "ending state" } },
                { id: "3", object: { asdf: "starting state" } },
                { id: "3", object: { asdf: "It's just a phase mom!" } },
                { id: "3", object: { asdf: "ending state" } },
            ] satisfies PartialHistoryAction[],
        });

        // When a filter is registered that doesn't allow for phrases to begin with "starting" are added
        const filter = vi.fn(((_puzzle, action) => ({
            keep:
                !action.object ||
                !(action.object as FakeLayerProps["ObjectState"]).asdf.startsWith("starting"),
        })) satisfies StorageFilter);
        storage.addStorageFilters(puzzle, [{ filter }], "layer1");

        // Then only the starting actions are filtered
        expect(filter).toBeCalledTimes(6);
        expect(storage.history.map(({ objectId, object }) => ({ objectId, object }))).toEqual([
            { objectId: "1", object: null },
            { objectId: "2", object: null },
            { objectId: "3", object: null },
            { objectId: "3", object: { asdf: "It's just a phase mom!" } },
        ] satisfies Partial<HistoryAction>[]);

        // ... and no objects deleted
        expect(storage.objects["layer1"].entries("question")).toEqual<HistoryEntries>([
            ["1", { asdf: "constant" }],
            ["2", { asdf: "ending state" }],
            ["3", { asdf: "ending state" }],
        ]);
    });

    it("registers simple filters that removes updated invalid objects", () => {
        // Given a StorageManager with lots of examples
        const storage = getNormalStorage();
        const puzzle = fakePuzzle("grid", "question");
        storage.addToHistory({
            puzzle,
            layerId: "layer1",
            actions: [
                { id: "1", object: { asdf: "constant" } },
                { id: "2", object: { asdf: "starting state" } },
                { id: "2", object: { asdf: "ending state" } },
                { id: "3", object: { asdf: "starting state" } },
                { id: "3", object: { asdf: "It's just a phase mom!" } },
                { id: "3", object: { asdf: "ending state" } },
            ] satisfies PartialHistoryAction[],
        });

        // When a filter is registered that removes the last action for id=2 and the middle action for id=3
        const filter = vi.fn(((_puzzle, action) => {
            if (action.object === null) return { keep: true };

            if (action.objectId === "2" && action.object.asdf === "ending state") {
                return { keep: false };
            }
            if (action.object.asdf === "It's just a phase mom!") return { keep: false };

            return { keep: true };
        }) satisfies StorageFilter);
        storage.addStorageFilters(puzzle, [{ filter }], "layer1");

        // Then only those actions are filtered
        expect(filter).toBeCalledTimes(6);
        expect(storage.history.map(({ objectId, object }) => ({ objectId, object }))).toEqual([
            { objectId: "1", object: null },
            { objectId: "2", object: null },
            { objectId: "3", object: null },
            { objectId: "3", object: { asdf: "starting state" } },
        ] satisfies Partial<HistoryAction>[]);

        // ... and no objects deleted
        expect(storage.objects["layer1"].entries("question")).toEqual<HistoryEntries>([
            ["1", { asdf: "constant" }],
            ["2", { asdf: "starting state" }],
            ["3", { asdf: "ending state" }],
        ]);
    });

    it("maintains object order when scrubbing history", () => {
        // Given a StorageManager where lots of objects are updated
        const storage = getNormalStorage();
        const puzzle = fakePuzzle("grid", "question");
        storage.addToHistory({
            puzzle,
            layerId: "layer1",
            actions: [
                { id: "1", object: { asdf: "1a" } },
                { id: "2", object: { asdf: "2a" } },
                { id: "3", object: { asdf: "3a" } },
                { id: "4", object: { asdf: "4a" } },
                { id: "1", object: { asdf: "1b" } },
                { id: "3", object: { asdf: "3b" } },
                { id: "3", object: { asdf: "3c" } },
                { id: "4", object: { asdf: "4b" } },
            ] satisfies PartialHistoryAction[],
        });

        expect(storage.objects["layer1"].entries("question")).toEqual<HistoryEntries>([
            ["2", { asdf: "2a" }],
            ["1", { asdf: "1b" }],
            ["3", { asdf: "3c" }],
            ["4", { asdf: "4b" }],
        ]);

        const historySummary = () =>
            storage.history.map(({ objectId, prevObjectId, object }) => ({
                objectId,
                prevObjectId,
                object,
            }));

        expect(historySummary()).toEqual([
            { object: null, objectId: "1", prevObjectId: PUT_AT_END },
            { object: null, objectId: "2", prevObjectId: PUT_AT_END },
            { object: null, objectId: "3", prevObjectId: PUT_AT_END },
            { object: null, objectId: "4", prevObjectId: PUT_AT_END },
            { object: { asdf: "1a" }, objectId: "1", prevObjectId: null },
            { object: { asdf: "3a" }, objectId: "3", prevObjectId: "2" },
            { object: { asdf: "3b" }, objectId: "3", prevObjectId: "1" },
            { object: { asdf: "4a" }, objectId: "4", prevObjectId: "2" },
        ]);

        while (storage.undoHistory().length);

        expect(historySummary()).toEqual([
            { object: { asdf: "1a" }, objectId: "1", prevObjectId: null },
            { object: { asdf: "2a" }, objectId: "2", prevObjectId: "1" },
            { object: { asdf: "3a" }, objectId: "3", prevObjectId: "2" },
            { object: { asdf: "4a" }, objectId: "4", prevObjectId: "3" },
            { object: { asdf: "1b" }, objectId: "1", prevObjectId: "4" },
            { object: { asdf: "3b" }, objectId: "3", prevObjectId: "1" },
            { object: { asdf: "3c" }, objectId: "3", prevObjectId: "1" },
            { object: { asdf: "4b" }, objectId: "4", prevObjectId: "3" },
        ]);

        while (storage.redoHistory().length);

        // When some of the objects get Thanos-snapped
        const filter2: StorageFilter = (_, action) => {
            if (action.objectId === "2") {
                return { keep: false };
            }
            return { keep: true };
        };
        storage.addStorageFilters(puzzle, [{ filter: filter2 }], "layer1");

        // Then relative object order should be maintained throughout history
        expect(storage.objects["layer1"].entries("question")).toEqual<HistoryEntries>([
            ["1", { asdf: "1b" }],
            ["3", { asdf: "3c" }],
            ["4", { asdf: "4b" }],
        ]);

        expect(historySummary()).toEqual([
            { object: null, objectId: "1", prevObjectId: PUT_AT_END },
            { object: null, objectId: "3", prevObjectId: PUT_AT_END },
            { object: null, objectId: "4", prevObjectId: PUT_AT_END },
            { object: { asdf: "1a" }, objectId: "1", prevObjectId: null },
            { object: { asdf: "3a" }, objectId: "3", prevObjectId: null },
            { object: { asdf: "3b" }, objectId: "3", prevObjectId: "1" },
            { object: { asdf: "4a" }, objectId: "4", prevObjectId: null },
        ]);

        while (storage.undoHistory().length);

        expect(historySummary()).toEqual([
            { object: { asdf: "1a" }, objectId: "1", prevObjectId: null },
            { object: { asdf: "3a" }, objectId: "3", prevObjectId: "1" },
            { object: { asdf: "4a" }, objectId: "4", prevObjectId: "3" },
            { object: { asdf: "1b" }, objectId: "1", prevObjectId: "4" },
            { object: { asdf: "3b" }, objectId: "3", prevObjectId: "1" },
            { object: { asdf: "3c" }, objectId: "3", prevObjectId: "1" },
            { object: { asdf: "4b" }, objectId: "4", prevObjectId: "3" },
        ]);

        while (storage.redoHistory().length);

        // When half the objects are Thanos snapped away
        const filter: StorageFilter = (_, action) => {
            if (action.objectId === "2" || action.objectId === "1") {
                return { keep: false };
            }
            return { keep: true };
        };
        storage.addStorageFilters(puzzle, [{ filter }], "layer1");

        // Relative object order should be maintained throughout history
        expect(storage.objects["layer1"].entries("question")).toEqual<HistoryEntries>([
            ["3", { asdf: "3c" }],
            ["4", { asdf: "4b" }],
        ]);

        expect(historySummary()).toEqual([
            { object: null, objectId: "3", prevObjectId: PUT_AT_END },
            { object: null, objectId: "4", prevObjectId: PUT_AT_END },
            { object: { asdf: "3a" }, objectId: "3", prevObjectId: null },
            { object: { asdf: "3b" }, objectId: "3", prevObjectId: "4" },
            { object: { asdf: "4a" }, objectId: "4", prevObjectId: null },
        ]);

        while (storage.undoHistory().length);

        expect(historySummary()).toEqual([
            { object: { asdf: "3a" }, objectId: "3", prevObjectId: null },
            { object: { asdf: "4a" }, objectId: "4", prevObjectId: "3" },
            { object: { asdf: "3b" }, objectId: "3", prevObjectId: "4" },
            { object: { asdf: "3c" }, objectId: "3", prevObjectId: "4" },
            { object: { asdf: "4b" }, objectId: "4", prevObjectId: "3" },
        ]);
    });

    it("processes extra actions when changes are made to the grid normally", () => {
        // Given an empty StorageManager
        const storage = getNormalStorage();
        const puzzle = fakePuzzle("grid", "question");

        // When a filter that gives extra actions is registered
        const copyToLayer2 = vi.fn(((_puzzle, action) => ({
            keep: true,
            extraActions: [{ ...action, layerId: "layer2" }],
        })) satisfies StorageFilter);
        storage.addStorageFilters(puzzle, [{ filter: copyToLayer2 }], "layer1");
        expect(copyToLayer2).toBeCalledTimes(0);

        // ... and some actions are added
        storage.addToHistory({
            puzzle,
            layerId: "layer1",
            actions: [
                { id: "1", object: { asdf: "a" } },
                { id: "2", object: { asdf: "b" } },
                { id: "3", object: { asdf: "c" } },
            ] satisfies PartialHistoryAction[],
        });

        // Then the extra actions are processed
        expect(copyToLayer2).toBeCalledTimes(3);
        const result = [
            ["1", { asdf: "a" }],
            ["2", { asdf: "b" }],
            ["3", { asdf: "c" }],
        ] satisfies HistoryEntries;
        expect(storage.getObjects("layer1").entries("question")).toEqual(result);
        expect(storage.getObjects("layer2").entries("question")).toEqual(result);
    });

    it("only adds extra actions during history scrubbing once", () => {
        // Given a StorageManager with some entries
        const storage = getNormalStorage();
        const puzzle = fakePuzzle("grid", "question");
        storage.addToHistory({
            puzzle,
            layerId: "layer1",
            actions: [
                { id: "1", object: { asdf: "a" } },
                { id: "2", object: { asdf: "b" } },
                { id: "3", object: { asdf: "c" } },
            ] satisfies PartialHistoryAction[],
        });

        // When a filter that gives extra actions is registered
        const copyToLayer2 = vi.fn(((_puzzle, action) => ({
            keep: true,
            extraActions: [{ ...action, layerId: "layer2" }],
        })) satisfies StorageFilter);
        storage.addStorageFilters(puzzle, [{ filter: copyToLayer2 }], "layer1");
        expect(copyToLayer2).toBeCalledTimes(3);

        // Then the extra actions are added only once
        expect(
            storage.history.map(({ objectId, layerId, object }) => ({
                objectId,
                layerId,
                object,
            })),
        ).toEqual([
            { objectId: "1", layerId: "layer1", object: null },
            { objectId: "1", layerId: "layer2", object: null },
            { objectId: "2", layerId: "layer1", object: null },
            { objectId: "2", layerId: "layer2", object: null },
            { objectId: "3", layerId: "layer1", object: null },
            { objectId: "3", layerId: "layer2", object: null },
        ] satisfies Partial<HistoryAction>[]);

        const result = [
            ["1", { asdf: "a" }],
            ["2", { asdf: "b" }],
            ["3", { asdf: "c" }],
        ] satisfies HistoryEntries;
        expect(storage.getObjects("layer1").entries("question")).toEqual(result);
        expect(storage.getObjects("layer2").entries("question")).toEqual(result);
    });

    it("doesn't recurse extra actions to the same filter or a different one", () => {
        // Given an empty StorageManager
        const storage = getNormalStorage();
        const puzzle = fakePuzzle("grid", "question");

        let calledLast = "none" as "none" | "duplicate" | "identity";

        // When a filter that copies an object to the same layer is registered
        const duplicate = vi.fn(((_puzzle, action) => {
            calledLast = "duplicate";
            return {
                keep: true,
                extraActions: [{ ...action, objectId: action.objectId + "_dup" }],
            };
        }) satisfies StorageFilter);
        storage.addStorageFilters(puzzle, [{ filter: duplicate }], "layer1");
        expect(duplicate).toBeCalledTimes(0);

        // ... as well as a filter that does nothing
        const identity = vi.fn((() => {
            calledLast = "identity";
            return { keep: true };
        }) satisfies StorageFilter);
        storage.addStorageFilters(puzzle, [{ filter: identity }], "layer1");
        expect(identity).toBeCalledTimes(0);

        // ... and a single action is pushed to history
        storage.addToHistory({
            puzzle,
            layerId: "layer1",
            actions: [
                { id: "processed_once", object: { asdf: "asdf" } },
            ] satisfies PartialHistoryAction[],
        });

        // Then only the original action is processed and the extra action(s) are applied without checks
        expect(storage.history.map(({ objectId, object }) => ({ objectId, object }))).toEqual([
            { objectId: "processed_once", object: null },
            { objectId: "processed_once_dup", object: null },
        ] satisfies Partial<HistoryAction>[]);
        expect(storage.getObjects("layer1").entries("question")).toEqual([
            ["processed_once", { asdf: "asdf" }],
            ["processed_once_dup", { asdf: "asdf" }],
        ] satisfies HistoryEntries);

        expect(duplicate).toBeCalledTimes(1);
        expect(identity).toBeCalledTimes(1);
        // The `identity` filter must be called last to test it had a chance to "see" the extra action from `duplicate`
        expect(calledLast).toBe<typeof calledLast>("identity");
    });
});
