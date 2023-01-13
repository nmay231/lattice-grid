import { LayerStorage } from "../../LayerStorage";
import {
    LayerEvent,
    LayerHandlerResult,
    NeedsUpdating,
    PartialHistoryAction,
    PointerMoveOrDown,
} from "../../types";
import { getEventEssentials } from "../../utils/testUtils";
import {
    handleEventsSelection,
    SelectedProps,
    SELECTION_ID,
    _selectionObjMaker as obj,
} from "./selection";

const getFreshSelectedLayer = () => {
    const layer = { id: "DummyLayer" } as NeedsUpdating;
    handleEventsSelection(layer, {});
    return layer;
};

const partialPointerEvent: Omit<PointerMoveOrDown, "points" | "type"> = {
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    cursor: { x: 1, y: 1 }, // The value of cursor doesn't matter since it is mocked anyways
};

describe("selection controls", () => {
    it("should have a working obj() helper function", () => {
        expect(obj({ id: "asdfasdf", object: null })).toEqual<PartialHistoryAction>({
            batchId: "ignore",
            storageMode: "question",
            id: "asdfasdf",
            layerId: "Selection",
            object: null,
        });
        expect(obj({ id: "asdfasdf", object: { state: 2 } })).toEqual<PartialHistoryAction>({
            batchId: "ignore",
            storageMode: "question",
            id: "asdfasdf",
            layerId: "Selection",
            object: { state: 2 },
        });
    });

    it("should select one cell", () => {
        const stored = new LayerStorage<SelectedProps>();
        const layer = getFreshSelectedLayer();
        const essentials = getEventEssentials({ stored });

        // Start tapping/clicking
        let fakeEvent: LayerEvent<SelectedProps> = {
            ...essentials,
            ...partialPointerEvent,
            type: "pointerDown",
            points: ["point1"],
        };
        let result = layer.handleEvent(fakeEvent);

        expect(result.history).toEqual<LayerHandlerResult<SelectedProps>["history"]>([
            {
                id: "point1",
                layerId: SELECTION_ID,
                batchId: "ignore",
                storageMode: "question",
                object: { state: 2 },
            },
        ]);
        expect(result.discontinueInput).toBeFalsy();

        // Manually add the selected cell
        stored.objects.set("point1", result.history?.[0].object);

        // Pointer up
        fakeEvent = { ...essentials, type: "pointerUp" };
        result = layer.handleEvent(fakeEvent);
        expect(result.history?.length).toBeFalsy();
        expect(result.discontinueInput).toBeTruthy();
    });

    it("should deselect a cell by clicking on it", () => {
        // Setup a grid with exactly one cell selected
        const layer = getFreshSelectedLayer();
        const stored = LayerStorage.fromObjects<SelectedProps>({
            ids: ["point1"],
            objs: [{ point1: { id: "point1", state: 100 } }],
        });
        const essentials = getEventEssentials({ stored });

        // Tap/click that cell
        let fakeEvent: LayerEvent<SelectedProps> = {
            ...essentials,
            ...partialPointerEvent,
            type: "pointerDown",
            points: ["point1"],
        };
        layer.handleEvent(fakeEvent);

        fakeEvent = { ...essentials, type: "pointerUp" };
        const result = layer.handleEvent(fakeEvent);

        // It should be deselected
        expect(result.history).toEqual<LayerHandlerResult<SelectedProps>["history"]>([
            {
                id: "point1",
                layerId: SELECTION_ID,
                batchId: "ignore",
                storageMode: "question",
                object: null,
            },
        ]);
        expect(result.discontinueInput).toBeTruthy();
    });

    it("should not deselect a clicked cell if there were more than one previously selected", () => {
        // Setup a grid with two cells selected
        const layer = getFreshSelectedLayer();
        const stored = LayerStorage.fromObjects<SelectedProps>({
            ids: ["point1", "point2"],
            objs: [
                { id: "point1", state: 2 },
                { id: "point2", state: 2 },
            ],
        });
        const essentials = getEventEssentials({ stored });

        // Start tapping/clicking the first cell
        let fakeEvent: LayerEvent<SelectedProps> = {
            ...essentials,
            ...partialPointerEvent,
            type: "pointerDown",
            points: ["point1"],
        };
        let result = layer.handleEvent(fakeEvent);

        expect(result.history).toEqual<LayerHandlerResult<SelectedProps>["history"]>([
            {
                id: "point2",
                layerId: SELECTION_ID,
                batchId: "ignore",
                storageMode: "question",
                object: null,
            },
            {
                id: "point1",
                layerId: SELECTION_ID,
                batchId: "ignore",
                storageMode: "question",
                object: { state: 2 },
            },
        ]);
        expect(result.discontinueInput).toBeFalsy();

        // Manually deselect the second cell
        stored.objects.delete("point1");

        // Release the pointer
        fakeEvent = { ...essentials, type: "pointerUp" };
        result = layer.handleEvent(fakeEvent);

        // The first cell should still be selected
        expect(result.history?.length).toBeFalsy();
        expect(result.discontinueInput).toBeTruthy();
    });

    it("should deselect a cell when clicking another one", () => {
        // Setup a grid with one cell selected
        const layer = getFreshSelectedLayer();
        const stored = LayerStorage.fromObjects<SelectedProps>({
            ids: ["point1"],
            objs: [{ id: "point1", state: 2 }],
        });
        const essentials = getEventEssentials({ stored });

        // Start tapping/clicking a different cell
        let fakeEvent: LayerEvent<SelectedProps> = {
            ...essentials,
            ...partialPointerEvent,
            type: "pointerDown",
            points: ["point2"],
        };
        let result = layer.handleEvent(fakeEvent);
        expect(result.history).toEqual<LayerHandlerResult<SelectedProps>["history"]>([
            {
                id: "point1",
                layerId: SELECTION_ID,
                batchId: "ignore",
                storageMode: "question",
                object: null,
            },
            {
                id: "point2",
                layerId: SELECTION_ID,
                batchId: "ignore",
                storageMode: "question",
                object: { state: 2 },
            },
        ]);
        expect(result.discontinueInput).toBeFalsy();

        // Stop tapping/clicking a different cell
        fakeEvent = { ...essentials, type: "pointerUp" };
        result = layer.handleEvent(fakeEvent);
        expect(result.history?.length).toBeFalsy();
        expect(result.discontinueInput).toBeTruthy();
    });

    it("should add cells to the selection when holding ctrl", () => {
        // Setup a grid with a group of cells selected
        const layer = getFreshSelectedLayer();
        const stored = LayerStorage.fromObjects<SelectedProps>({
            ids: ["point1", "point2", "point3"],
            objs: [{ state: 100 }, { state: 100 }, { state: 100 }],
        });
        const essentials = getEventEssentials({ stored });

        // Start tapping/clicking a different cell
        let fakeEvent: LayerEvent<SelectedProps> = {
            ...essentials,
            ...partialPointerEvent,
            type: "pointerDown",
            ctrlKey: true,
            points: ["point4"],
        };
        let result = layer.handleEvent(fakeEvent);
        expect(result.history).toEqual<LayerHandlerResult<SelectedProps>["history"]>([
            {
                batchId: "ignore",
                storageMode: "question",
                id: "point4",
                layerId: SELECTION_ID,
                object: { state: 2 },
            },
        ]);
        expect(result.discontinueInput).toBeFalsy();

        // Select more cells
        fakeEvent = {
            ...essentials,
            ...partialPointerEvent,
            type: "pointerMove",
            ctrlKey: true,
            points: ["point5", "point6"],
        };
        result = layer.handleEvent(fakeEvent);
        expect(result.history).toEqual<LayerHandlerResult<SelectedProps>["history"]>([
            {
                batchId: "ignore",
                storageMode: "question",
                id: "point5",
                layerId: SELECTION_ID,
                object: { state: 2 },
            },
            {
                batchId: "ignore",
                storageMode: "question",
                id: "point6",
                layerId: SELECTION_ID,
                object: { state: 2 },
            },
        ]);
        expect(result.discontinueInput).toBeFalsy();

        // Stop selecting
        fakeEvent = { ...essentials, type: "pointerUp" };
        result = layer.handleEvent(fakeEvent);
        expect(result.history?.length).toBeFalsy();
        expect(result.discontinueInput).toBeTruthy();
    });

    it.skip("should merge disjoint selections when dragging over an existing group", () => {
        // Setup a grid with a group of cells selected
        const layer = getFreshSelectedLayer();
        const stored = LayerStorage.fromObjects<SelectedProps>({
            ids: ["point1", "point2"],
            objs: [{ state: 100 }, { state: 100 }],
        });
        const essentials = getEventEssentials({ stored });

        // Start tapping/clicking a different cell
        let fakeEvent: LayerEvent<SelectedProps> = {
            ...essentials,
            ...partialPointerEvent,
            type: "pointerDown",
            ctrlKey: true,
            points: ["point3"],
        };
        let result = layer.handleEvent(fakeEvent);
        expect(result.history).toEqual<LayerHandlerResult<SelectedProps>["history"]>([
            {
                batchId: "ignore",
                storageMode: "question",
                id: "point3",
                layerId: SELECTION_ID,
                object: { state: 2 },
            },
        ]);
        expect(result.discontinueInput).toBeFalsy();

        // Select existing cells
        fakeEvent = {
            ...essentials,
            ...partialPointerEvent,
            type: "pointerMove",
            ctrlKey: true,
            points: ["point2"],
        };
        result = layer.handleEvent(fakeEvent);
        // They should be in the same group now
        expect(result.history).toEqual<LayerHandlerResult<SelectedProps>["history"]>([
            {
                batchId: "ignore",
                storageMode: "question",
                id: "point1",
                layerId: SELECTION_ID,
                object: { state: 2 },
            },
            {
                batchId: "ignore",
                storageMode: "question",
                id: "point2",
                layerId: SELECTION_ID,
                object: { state: 2 },
            },
        ]);
        expect(result.discontinueInput).toBeFalsy();

        // Stop selecting
        fakeEvent = { ...essentials, type: "pointerUp" };
        result = layer.handleEvent(fakeEvent);
        expect(result.history?.length).toBeFalsy();
        expect(result.discontinueInput).toBeTruthy();
    });

    it("should batch together storingLayer actions", () => {
        const layer = getFreshSelectedLayer();
        const essentials = getEventEssentials();

        // Have the storing layer return two objects
        const fakeEvent: LayerEvent<SelectedProps> = {
            ...essentials,
            type: "keyDown",
            keypress: "your face",
        };
        layer.handleKeyDown = vi.fn().mockReturnValue({
            history: [
                { id: "id1", object: { asdf: "something1" } },
                { id: "id2", object: { asdf: "something2" } },
            ],
        });
        (fakeEvent.storage.getNewBatchId as ReturnType<typeof vi.fn>).mockReturnValueOnce(1);

        const result = layer.handleEvent(fakeEvent);

        // They should be transformed to have the same batchId
        expect(result.history).toEqual<LayerHandlerResult<SelectedProps>["history"]>([
            { id: "id1", object: { asdf: "something1" }, batchId: 1 },
            { id: "id2", object: { asdf: "something2" }, batchId: 1 },
        ]);
        expect(result.discontinueInput).toBeTruthy();
    });

    it("should select objects affected by undo/redo", () => {
        // We start with two points selected
        const layer = getFreshSelectedLayer();
        const stored = new LayerStorage<SelectedProps>();
        stored.objects.set("toDeselect", { id: "toDeselect", state: 1 });
        stored.objects.set("toKeep", { id: "toKeep", state: 1 });
        const essentials = getEventEssentials({ stored });

        // The event has two objects with one already selected and one not
        const fakeEvent: LayerEvent<SelectedProps> = {
            ...essentials,
            type: "undoRedo",
            actions: [
                {
                    objectId: "toKeep",
                    layerId: layer.id,
                    object: {},
                    nextObjectId: null,
                },
                {
                    objectId: "toSelect",
                    layerId: layer.id,
                    object: {},
                    nextObjectId: null,
                },
            ],
        };
        const result = layer.handleEvent(fakeEvent);

        // Only "toKeep" and "toSelect" should remain
        expect(result.history).toEqual<LayerHandlerResult<SelectedProps>["history"]>([
            {
                batchId: "ignore",
                storageMode: "question",
                id: "toDeselect",
                layerId: SELECTION_ID,
                object: null,
            },
            {
                batchId: "ignore",
                storageMode: "question",
                id: "toKeep",
                layerId: SELECTION_ID,
                object: { state: 2 },
            },
            {
                batchId: "ignore",
                storageMode: "question",
                id: "toSelect",
                layerId: SELECTION_ID,
                object: { state: 2 },
            },
        ]);
        expect(result.discontinueInput).toBeTruthy();
    });

    // Prob not necessary b/c of generalized FSMs
    it.todo("tests with gatherPoints maybe...");
});

describe("SelectionLayer on a square grid", () => {
    it.todo("should select many cells in a horizontal line");

    // TODO: Not possible yet because you can't cut across corners
    it.todo("should select many cells in a diagonal line");
});
