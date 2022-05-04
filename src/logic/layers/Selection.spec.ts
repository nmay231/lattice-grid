import { LayerStorage, StorageManager } from "../StorageManager";
import { SelectionLayer } from "./Selection";

const getFreshSelectionLayer = () => {
    const selection = new SelectionLayer();
    (selection as any).id = "Selection";
    return selection;
};

const storingLayer = { id: "storingLayer", handleKeyDown: jest.fn() };

const makeFakeEvent = ({ stored, event, tempStorage = {} }: any = {}) => {
    const grid = { getAllPoints: () => [] };
    const _stored: LayerStorage = stored || {
        objects: {},
        renderOrder: [],
    };
    const storage: Partial<StorageManager> = {
        getStored: jest.fn(() => _stored),
        getNewBatchId: jest.fn(),
    };

    return { grid, storage, event, storingLayer, tempStorage, settings: {} };
};

describe("SelectionLayer", () => {
    it("should select one cell", () => {
        const selection = getFreshSelectionLayer();
        const tempStorage = {};
        const stored = { objects: {}, renderOrder: [] };

        // Start tapping/clicking
        const fakeEvent = makeFakeEvent({
            tempStorage,
            stored,
        });
        fakeEvent.event = { type: "pointerDown", points: ["point1"] };
        let result = selection.handleEvent(fakeEvent);

        expect(result.history.length).toBe(1);
        expect(result.history[0]).toMatchObject({
            id: "point1",
            layerId: "Selection",
            batchId: "ignore",
            object: {},
        });
        expect(result.discontinueInput).toBeFalsy();

        // Manually add the selected cell
        (stored.objects as any).point1 = result.history[0].object;
        (stored.renderOrder as string[]).push("point1");

        fakeEvent.event = { type: "pointerUp" };

        // Pointer up
        result = selection.handleEvent(fakeEvent);
        expect(result.history?.length).toBeFalsy();
        expect(result.discontinueInput).toBeTruthy();
    });

    it("should deselect a cell by clicking on it", () => {
        // Setup a grid with exactly one cell selected
        const selection = getFreshSelectionLayer();
        const tempStorage = {};
        const stored = {
            objects: { point1: { id: "point1", point: "point1" } },
            renderOrder: ["point1"],
        };
        const fakeEvent = makeFakeEvent({ stored, tempStorage });

        // Tap/click that cell
        fakeEvent.event = { type: "pointerDown", points: ["point1"] };
        selection.handleEvent(fakeEvent);
        fakeEvent.event = { type: "pointerUp" };
        const result = selection.handleEvent(fakeEvent);

        // It should be deselected
        expect(result.history).toMatchObject([
            {
                id: "point1",
                layerId: "Selection",
                batchId: "ignore",
                object: null,
            },
        ]);
        expect(result.discontinueInput).toBeTruthy();
    });

    it("should not deselect a clicked cell if there were more than one previously selected", () => {
        // Setup a grid with two cells selected
        const selection = getFreshSelectionLayer();
        const tempStorage = {};
        const stored = {
            objects: {
                point1: { id: "point1", point: "point1", state: 2 },
                point2: { id: "point2", point: "point2", state: 2 },
            } as Record<string, object>,
            renderOrder: ["point1", "point2"],
        };
        const fakeEvent = makeFakeEvent({ stored, tempStorage });

        // Start tapping/clicking the first cell
        fakeEvent.event = { type: "pointerDown", points: ["point1"] };
        let result = selection.handleEvent(fakeEvent);
        expect(result.history).toMatchObject([
            {
                id: "point2",
                layerId: "Selection",
                batchId: "ignore",
                object: null,
            },
            {
                id: "point1",
                layerId: "Selection",
                batchId: "ignore",
                object: { point: "point1", state: 2 },
            },
        ]);
        expect(result.discontinueInput).toBeFalsy();

        // Manually deselect the second cell
        stored.renderOrder.splice(1, 1);
        delete stored.objects.point2;

        // Release the pointer
        fakeEvent.event = { type: "pointerUp" };
        result = selection.handleEvent(fakeEvent);

        // The first cell should still be selected
        expect(result.history?.length).toBeFalsy();
        expect(result.discontinueInput).toBeTruthy();
    });

    it("should deselect a cell when clicking another one", () => {
        // Setup a grid with one cell selected
        const selection = getFreshSelectionLayer();
        const tempStorage = {};
        const stored = {
            objects: {
                point1: { id: "point1", point: "point1", state: 2 },
            } as Record<string, object>,
            renderOrder: ["point1"],
        };
        const fakeEvent = makeFakeEvent({ stored, tempStorage });

        // Start tapping/clicking a different cell
        fakeEvent.event = { type: "pointerDown", points: ["point2"] };
        let result = selection.handleEvent(fakeEvent);
        expect(result.history).toMatchObject([
            {
                id: "point1",
                layerId: "Selection",
                batchId: "ignore",
                object: null,
            },
            {
                id: "point2",
                layerId: "Selection",
                batchId: "ignore",
                object: { point: "point2", state: 2 },
            },
        ]);
        expect(result.discontinueInput).toBeFalsy();

        // Stop tapping/clicking a different cell
        fakeEvent.event = { type: "pointerUp" };
        result = selection.handleEvent(fakeEvent);
        expect(result.history?.length).toBeFalsy();
        expect(result.discontinueInput).toBeTruthy();
    });

    it("should add cells to the selection when holding ctrl", () => {
        // Setup a grid with a group of cells selected
        const selection = getFreshSelectionLayer();
        const stored: LayerStorage = {
            objects: {
                point1: { point: "point1", state: 100 },
                point2: { point: "point2", state: 100 },
                point3: { point: "point3", state: 100 },
            },
            renderOrder: ["point1", "point2", "point3"],
        };
        const fakeEvent = makeFakeEvent({ stored });

        // Start tapping/clicking a different cell
        fakeEvent.event = {
            type: "pointerDown",
            ctrlKey: true,
            points: ["point4"],
        };
        let result = selection.handleEvent(fakeEvent);
        expect(result.history).toMatchObject([
            {
                batchId: "ignore",
                id: "point4",
                layerId: "Selection",
                object: { point: "point4" },
            },
        ]);
        expect(result.discontinueInput).toBeFalsy();

        // Select more cells
        fakeEvent.event = {
            type: "pointerMove",
            ctrlKey: true,
            points: ["point5", "point6"],
        };
        result = selection.handleEvent(fakeEvent);
        expect(result.history).toMatchObject([
            {
                batchId: "ignore",
                id: "point5",
                layerId: "Selection",
                object: { point: "point5", state: 2 },
            },
            {
                batchId: "ignore",
                id: "point6",
                layerId: "Selection",
                object: { point: "point6", state: 2 },
            },
        ]);
        expect(result.discontinueInput).toBeFalsy();

        // Stop selecting
        fakeEvent.event = { type: "pointerUp" };
        result = selection.handleEvent(fakeEvent);
        expect(result.history?.length).toBeFalsy();
        expect(result.discontinueInput).toBeTruthy();
    });

    it("should merge disjoint selections when dragging over an existing group", () => {
        // Setup a grid with a group of cells selected
        const selection = getFreshSelectionLayer();
        const stored: LayerStorage = {
            objects: {
                point1: { point: "point1", state: 100 },
                point2: { point: "point2", state: 100 },
            },
            renderOrder: ["point1", "point2"],
        };
        const fakeEvent = makeFakeEvent({ stored });

        // Start tapping/clicking a different cell
        fakeEvent.event = {
            type: "pointerDown",
            ctrlKey: true,
            points: ["point3"],
        };
        let result = selection.handleEvent(fakeEvent);
        expect(result.history).toMatchObject([
            {
                batchId: "ignore",
                id: "point3",
                layerId: "Selection",
                object: { point: "point3" },
            },
        ]);
        expect(result.discontinueInput).toBeFalsy();

        // Select existing cells
        fakeEvent.event = {
            type: "pointerMove",
            ctrlKey: true,
            points: ["point2"],
        };
        result = selection.handleEvent(fakeEvent);
        // They should be in the same group now
        expect(result.history).toEqual([
            {
                batchId: "ignore",
                id: "point1",
                layerId: "Selection",
                object: { point: "point1", state: 2 },
            },
            {
                batchId: "ignore",
                id: "point2",
                layerId: "Selection",
                object: { point: "point2", state: 2 },
            },
        ]);
        expect(result.discontinueInput).toBeFalsy();

        // Stop selecting
        fakeEvent.event = { type: "pointerUp" };
        result = selection.handleEvent(fakeEvent);
        expect(result.history?.length).toBeFalsy();
        expect(result.discontinueInput).toBeTruthy();
    });

    it("should batch together storingLayer actions", () => {
        const selection = getFreshSelectionLayer();
        const fakeEvent = makeFakeEvent();

        // Have the storing layer return two objects
        fakeEvent.event = { type: "keyDown" };
        fakeEvent.storingLayer.handleKeyDown.mockReturnValue({
            history: [
                { id: "id1", object: { asdf: "something1" } },
                { id: "id2", object: { asdf: "something2" } },
            ],
        });
        (fakeEvent.storage.getNewBatchId as jest.Mock).mockReturnValueOnce(1);

        let result = selection.handleEvent(fakeEvent);

        // They should be transformed to have the same batchId
        expect(result.history).toEqual([
            { id: "id1", object: { asdf: "something1" }, batchId: 1 },
            { id: "id2", object: { asdf: "something2" }, batchId: 1 },
        ]);
        expect(result.discontinueInput).toBeTruthy();
    });

    it("should select objects affected by undo/redo", () => {
        // We start with two points selected
        const selection = getFreshSelectionLayer();
        const stored = {
            objects: {
                toDeselect: { id: "toDeselect", point: "toDeselect" },
                toKeep: { id: "toKeep", point: "toKeep" },
            },
            renderOrder: ["toDeselect", "toKeep"],
        };
        const fakeEvent = makeFakeEvent({ stored });

        // The event has two objects with one already selected and one not
        fakeEvent.event = {
            type: "undoRedo",
            actions: [
                { id: "toKeep", layerId: storingLayer.id, object: {} },
                { id: "toSelect", layerId: storingLayer.id, object: {} },
            ],
        };
        let result = selection.handleEvent(fakeEvent);

        // Only "toKeep" and "toSelect" should remain
        expect(result.history).toEqual([
            {
                batchId: "ignore",
                id: "toDeselect",
                layerId: "Selection",
                object: null,
            },
            {
                batchId: "ignore",
                id: "toKeep",
                layerId: "Selection",
                object: { point: "toKeep", state: 2 },
            },
            {
                batchId: "ignore",
                id: "toSelect",
                layerId: "Selection",
                object: { point: "toSelect", state: 2 },
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
