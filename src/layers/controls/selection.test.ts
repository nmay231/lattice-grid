import { LayerStorage } from "../../LayerStorage";
import { NeedsUpdating, PartialHistoryAction } from "../../types";
import { layerEventRunner } from "../../utils/testing/layerEventRunner";
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

type HistoryType = PartialHistoryAction<SelectedProps, any>[];

describe("selection controls", () => {
    it("has a working obj() helper function", () => {
        expect(obj({ id: "asdfasdf", object: null })).toEqual<HistoryType[number]>({
            batchId: "ignore",
            storageMode: "question",
            id: "asdfasdf",
            layerId: "Selection",
            object: null,
        });
        expect(obj({ id: "asdfasdf", object: { state: 2 } })).toEqual<HistoryType[number]>({
            batchId: "ignore",
            storageMode: "question",
            id: "asdfasdf",
            layerId: "Selection",
            object: { state: 2 },
        });
    });

    it("selects one cell", () => {
        // Given an empty grid
        const layer = getFreshSelectedLayer();
        const handler = layerEventRunner({ layer });

        // When a cell is clicked
        const pointerDown = handler.events.pointerDown({ points: ["point1"] });

        // Then it should be selected
        expect(pointerDown.history).toEqual<HistoryType>([
            {
                id: "point1",
                layerId: SELECTION_ID,
                batchId: "ignore",
                storageMode: "question",
                object: { state: 2 },
            },
        ]);

        // Ensure clean result
        const pointerUp = handler.events.pointerUp();
        expect(pointerUp.history?.length).toBeFalsy();
    });

    it("deselects a cell by clicking on it", () => {
        // Given a grid with exactly one cell selected
        const layer = getFreshSelectedLayer();
        const stored = LayerStorage.fromObjects<SelectedProps>({
            ids: ["point1"],
            objs: [{ point1: { id: "point1", state: 100 } }],
        });
        const handler = layerEventRunner({ layer, stored });

        // When the user clicks one cell
        handler.events.pointerDown({ points: ["point1"] });
        const pointerUp = handler.events.pointerUp();

        // Then it should be deselected
        expect(pointerUp.history).toEqual<HistoryType>([
            {
                id: "point1",
                layerId: SELECTION_ID,
                batchId: "ignore",
                storageMode: "question",
                object: null,
            },
        ]);
    });

    it.todo("does not deselect the first cell when selecting multiple");

    it("does not deselect a clicked cell if there were more than one previously selected", () => {
        // Given a grid with two cells selected
        const layer = getFreshSelectedLayer();
        const stored = LayerStorage.fromObjects<SelectedProps>({
            ids: ["point1", "point2"],
            objs: [
                { id: "point1", state: 2 },
                { id: "point2", state: 2 },
            ],
        });
        const handler = layerEventRunner({ layer, stored });

        // When one of the two is clicked again
        const pointerDown = handler.events.pointerDown({ points: ["point1"] });

        // Then only that one is selected
        expect(pointerDown.history).toEqual<HistoryType>([
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

        // Ensure clean result
        const pointerUp = handler.events.pointerUp();

        expect(pointerUp.history?.length).toBeFalsy();
    });

    it("deselects a cell when clicking another one", () => {
        // Given a grid with one cell selected
        const layer = getFreshSelectedLayer();
        const stored = LayerStorage.fromObjects<SelectedProps>({
            ids: ["point1"],
            objs: [{ id: "point1", state: 2 }],
        });
        const handler = layerEventRunner({ layer, stored });

        // When a different cell is clicked
        const pointerDown = handler.events.pointerDown({ points: ["point2"] });

        // Then only the new cell is selected
        expect(pointerDown.history).toEqual<HistoryType>([
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

        // Ensure clean result
        const pointerUp = handler.events.pointerUp();

        expect(pointerUp.history?.length).toBeFalsy();
    });

    it("adds cells to the selection when holding ctrl", () => {
        // Given a grid with three cells selected in the same motion (states are equal)
        const layer = getFreshSelectedLayer();
        const stored = LayerStorage.fromObjects<SelectedProps>({
            ids: ["point1", "point2", "point3"],
            objs: [{ state: 100 }, { state: 100 }, { state: 100 }],
        });
        const handler = layerEventRunner({ layer, stored });

        // When a fourth point is clicked with control held
        const pointerDown = handler.events.pointerDown({ points: ["point4"], ctrlKey: true });

        // Then the other three should remain selected but with a different state
        expect(pointerDown.history).toEqual<HistoryType>([
            {
                batchId: "ignore",
                storageMode: "question",
                id: "point4",
                layerId: SELECTION_ID,
                object: { state: 2 },
            },
        ]);

        // When more cells are selected
        const pointerMove = handler.events.pointerMove({
            points: ["point5", "point6"],
            ctrlKey: true,
        });

        // Then they should be added with the same state as the fourth
        expect(pointerMove.history).toEqual<HistoryType>([
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

        // Ensure clean result
        const pointerUp = handler.events.pointerUp();
        expect(pointerUp.history?.length).toBeFalsy();
    });

    it("merges disjoint selections when dragging over an existing group", () => {
        // Given some selected cells
        const layer = getFreshSelectedLayer();
        const stored = LayerStorage.fromObjects<SelectedProps>({
            ids: ["point1", "point2"],
            objs: [{ state: 100 }, { state: 100 }],
        });
        const handler = layerEventRunner({ layer, stored });

        // ... and a different cell is clicked with control held
        const pointerDown = handler.events.pointerDown({ points: ["point3"], ctrlKey: true });

        // Then the original two should remain
        expect(pointerDown.history).toEqual<HistoryType>([
            {
                batchId: "ignore",
                storageMode: "question",
                id: "point3",
                layerId: SELECTION_ID,
                object: { state: 2 },
            },
        ]);

        // When the cursor is dragged over a cell in the first group
        const pointerMove = handler.events.pointerMove({ points: ["point2"], ctrlKey: true });

        // Then they should be merged into the same group
        expect(pointerMove.history).toEqual<HistoryType>([
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

        // Ensure clean result
        const pointerUp = handler.events.pointerUp();
        expect(pointerUp.history?.length).toBeFalsy();
    });

    it("batches together storingLayer actions", () => {
        // Given two selected points
        const layer = getFreshSelectedLayer();
        const stored = LayerStorage.fromObjects<SelectedProps>({
            ids: ["id1", "id2"],
            objs: [{ state: 100 }, { state: 100 }],
        });
        const handler = layerEventRunner({ layer, stored });

        // ... and a layer that handles keyboard events
        layer.handleKeyDown = vi.fn().mockReturnValue({
            history: [
                { id: "id1", object: { asdf: "something1" } },
                { id: "id2", object: { asdf: "something2" } },
            ],
        });
        handler.storage.getNewBatchId.mockReturnValueOnce(1);

        // When a key is pressed
        const keyDown = handler.events.keyDown({ keypress: "asdf", handleHistory: false });

        // Then the actions should be transformed to have the same batchId
        expect(keyDown.history).toEqual<HistoryType>([
            { id: "id1", object: { asdf: "something1" }, batchId: 1 },
            { id: "id2", object: { asdf: "something2" }, batchId: 1 },
        ]);
    });

    it("selects objects affected by undo/redo", () => {
        // Given two points selected
        const layer = getFreshSelectedLayer();
        const stored = LayerStorage.fromObjects<SelectedProps>({
            ids: ["toDeselect", "toKeep"],
            objs: [{ state: 1 }, { state: 1 }],
        });
        const handler = layerEventRunner({ layer, stored });

        // When undo/redo changes two objects with one already selected and one not
        const result = handler.events.undoRedo({
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
        });

        // Then only "toKeep" and "toSelect" should remain
        expect(result.history).toEqual<HistoryType>([
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
    });

    // Prob not necessary b/c of generalized FSMs
    it.todo("tests with gatherPoints maybe...");
});

describe("SelectionLayer on a square grid", () => {
    it.todo("selects many cells in a horizontal line");

    // TODO: Not possible yet because you can't cut across corners
    it.todo("selects many cells in a diagonal line");
});
