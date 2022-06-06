import {
    LayerEvent,
    LayerEventEssentials,
    LayerHandlerResult,
    LayerStorage,
    PointerMoveOrDown,
} from "../../globals";
import {
    getEventEssentials,
    GetEventEssentialsArg,
} from "../../utils/testUtils";
import { SelectionLayer, SelectionProps } from "./Selection";

const getFreshSelectionLayer = () => {
    const selection = Object.create(SelectionLayer);
    return selection;
};

const storingLayer = { id: "storingLayer", handleKeyDown: jest.fn() };

const eventEssentials = (arg: GetEventEssentialsArg<SelectionProps> = {}) => {
    return {
        ...getEventEssentials<SelectionProps>(arg),
        storingLayer,
    } as LayerEventEssentials<SelectionProps> & { storingLayer: any };
};

const partialPointerEvent: Omit<PointerMoveOrDown, "points" | "type"> = {
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    cursor: { x: 1, y: 1 }, // The value of cursor doesn't matter since it is mocked anyways
};

describe("SelectionLayer", () => {
    it("should select one cell", () => {
        const stored: LayerStorage<SelectionProps> = {
            renderOrder: [],
            objects: {},
        };
        const selection = getFreshSelectionLayer();
        const essentials = eventEssentials({ stored });

        // Start tapping/clicking
        let fakeEvent: LayerEvent<SelectionProps> = {
            ...essentials,
            ...partialPointerEvent,
            type: "pointerDown",
            points: ["point1"],
        };
        let result = selection.handleEvent(fakeEvent);

        expect(result.history).toEqual<LayerHandlerResult["history"]>([
            {
                id: "point1",
                layerId: "Selections",
                batchId: "ignore",
                object: { point: "point1", state: 2 },
            },
        ]);
        expect(result.discontinueInput).toBeFalsy();

        // Manually add the selected cell
        stored.objects.point1 = result.history[0].object;
        stored.renderOrder.push("point1");

        // Pointer up
        fakeEvent = { ...essentials, type: "pointerUp" };
        result = selection.handleEvent(fakeEvent);
        expect(result.history?.length).toBeFalsy();
        expect(result.discontinueInput).toBeTruthy();
    });

    it("should deselect a cell by clicking on it", () => {
        // Setup a grid with exactly one cell selected
        const selection = getFreshSelectionLayer();
        const stored = {
            objects: { point1: { id: "point1", point: "point1", state: 100 } },
            renderOrder: ["point1"],
        };
        const essentials = eventEssentials({ stored });

        // Tap/click that cell
        let fakeEvent: LayerEvent<SelectionProps> = {
            ...essentials,
            ...partialPointerEvent,
            type: "pointerDown",
            points: ["point1"],
        };
        selection.handleEvent(fakeEvent);

        fakeEvent = { ...essentials, type: "pointerUp" };
        const result = selection.handleEvent(fakeEvent);

        // It should be deselected
        expect(result.history).toEqual<LayerHandlerResult["history"]>([
            {
                id: "point1",
                layerId: "Selections",
                batchId: "ignore",
                object: null,
            },
        ]);
        expect(result.discontinueInput).toBeTruthy();
    });

    it("should not deselect a clicked cell if there were more than one previously selected", () => {
        // Setup a grid with two cells selected
        const selection = getFreshSelectionLayer();
        const stored = {
            objects: {
                point1: { id: "point1", point: "point1", state: 2 },
                point2: { id: "point2", point: "point2", state: 2 },
            },
            renderOrder: ["point1", "point2"],
        } as LayerStorage<SelectionProps>;
        const essentials = eventEssentials({ stored });

        // Start tapping/clicking the first cell
        let fakeEvent: LayerEvent<SelectionProps> = {
            ...essentials,
            ...partialPointerEvent,
            type: "pointerDown",
            points: ["point1"],
        };
        let result = selection.handleEvent(fakeEvent);

        expect(result.history).toEqual<LayerHandlerResult["history"]>([
            {
                id: "point2",
                layerId: "Selections",
                batchId: "ignore",
                object: null,
            },
            {
                id: "point1",
                layerId: "Selections",
                batchId: "ignore",
                object: { point: "point1", state: 2 },
            },
        ]);
        expect(result.discontinueInput).toBeFalsy();

        // Manually deselect the second cell
        stored.renderOrder.splice(1, 1);
        delete stored.objects.point2;

        // Release the pointer
        fakeEvent = { ...essentials, type: "pointerUp" };
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
            },
            renderOrder: ["point1"],
        } as LayerStorage<SelectionProps>;
        const essentials = eventEssentials({ stored, tempStorage });

        // Start tapping/clicking a different cell
        let fakeEvent: LayerEvent<SelectionProps> = {
            ...essentials,
            ...partialPointerEvent,
            type: "pointerDown",
            points: ["point2"],
        };
        let result = selection.handleEvent(fakeEvent);
        expect(result.history).toEqual<LayerHandlerResult["history"]>([
            {
                id: "point1",
                layerId: "Selections",
                batchId: "ignore",
                object: null,
            },
            {
                id: "point2",
                layerId: "Selections",
                batchId: "ignore",
                object: { point: "point2", state: 2 },
            },
        ]);
        expect(result.discontinueInput).toBeFalsy();

        // Stop tapping/clicking a different cell
        fakeEvent = { ...essentials, type: "pointerUp" };
        result = selection.handleEvent(fakeEvent);
        expect(result.history?.length).toBeFalsy();
        expect(result.discontinueInput).toBeTruthy();
    });

    it("should add cells to the selection when holding ctrl", () => {
        // Setup a grid with a group of cells selected
        const selection = getFreshSelectionLayer();
        const stored = {
            objects: {
                point1: { point: "point1", state: 100 },
                point2: { point: "point2", state: 100 },
                point3: { point: "point3", state: 100 },
            },
            renderOrder: ["point1", "point2", "point3"],
        } as LayerStorage<SelectionProps>;
        const essentials = eventEssentials({ stored });

        // Start tapping/clicking a different cell
        let fakeEvent: LayerEvent<SelectionProps> = {
            ...essentials,
            ...partialPointerEvent,
            type: "pointerDown",
            ctrlKey: true,
            points: ["point4"],
        };
        let result = selection.handleEvent(fakeEvent);
        expect(result.history).toEqual<LayerHandlerResult["history"]>([
            {
                batchId: "ignore",
                id: "point4",
                layerId: "Selections",
                object: { point: "point4", state: 2 },
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
        result = selection.handleEvent(fakeEvent);
        expect(result.history).toEqual<LayerHandlerResult["history"]>([
            {
                batchId: "ignore",
                id: "point5",
                layerId: "Selections",
                object: { point: "point5", state: 2 },
            },
            {
                batchId: "ignore",
                id: "point6",
                layerId: "Selections",
                object: { point: "point6", state: 2 },
            },
        ]);
        expect(result.discontinueInput).toBeFalsy();

        // Stop selecting
        fakeEvent = { ...essentials, type: "pointerUp" };
        result = selection.handleEvent(fakeEvent);
        expect(result.history?.length).toBeFalsy();
        expect(result.discontinueInput).toBeTruthy();
    });

    it("should merge disjoint selections when dragging over an existing group", () => {
        // Setup a grid with a group of cells selected
        const selection = getFreshSelectionLayer();
        const stored = {
            objects: {
                point1: { point: "point1", state: 100 },
                point2: { point: "point2", state: 100 },
            },
            renderOrder: ["point1", "point2"],
        } as LayerStorage<SelectionProps>;
        const essentials = eventEssentials({ stored });

        // Start tapping/clicking a different cell
        let fakeEvent: LayerEvent<SelectionProps> = {
            ...essentials,
            ...partialPointerEvent,
            type: "pointerDown",
            ctrlKey: true,
            points: ["point3"],
        };
        let result = selection.handleEvent(fakeEvent);
        expect(result.history).toEqual<LayerHandlerResult["history"]>([
            {
                batchId: "ignore",
                id: "point3",
                layerId: "Selections",
                object: { point: "point3", state: 2 },
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
        result = selection.handleEvent(fakeEvent);
        // They should be in the same group now
        expect(result.history).toEqual<LayerHandlerResult["history"]>([
            {
                batchId: "ignore",
                id: "point1",
                layerId: "Selections",
                object: { point: "point1", state: 2 },
            },
            {
                batchId: "ignore",
                id: "point2",
                layerId: "Selections",
                object: { point: "point2", state: 2 },
            },
        ]);
        expect(result.discontinueInput).toBeFalsy();

        // Stop selecting
        fakeEvent = { ...essentials, type: "pointerUp" };
        result = selection.handleEvent(fakeEvent);
        expect(result.history?.length).toBeFalsy();
        expect(result.discontinueInput).toBeTruthy();
    });

    it("should batch together storingLayer actions", () => {
        const selection = getFreshSelectionLayer();
        const essentials = eventEssentials();

        // Have the storing layer return two objects
        let fakeEvent: LayerEvent<SelectionProps> = {
            ...essentials,
            type: "keyDown",
            keypress: "your face",
        };
        storingLayer.handleKeyDown.mockReturnValue({
            history: [
                { id: "id1", object: { asdf: "something1" } },
                { id: "id2", object: { asdf: "something2" } },
            ],
        });
        (fakeEvent.storage.getNewBatchId as jest.Mock).mockReturnValueOnce(1);

        let result = selection.handleEvent(fakeEvent);

        // They should be transformed to have the same batchId
        expect(result.history).toEqual<LayerHandlerResult["history"]>([
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
                toDeselect: { id: "toDeselect", point: "toDeselect", state: 1 },
                toKeep: { id: "toKeep", point: "toKeep", state: 1 },
            },
            renderOrder: ["toDeselect", "toKeep"],
        } as LayerStorage<SelectionProps>;
        const essentials = eventEssentials({ stored });

        // The event has two objects with one already selected and one not
        let fakeEvent: LayerEvent<SelectionProps> = {
            ...essentials,
            type: "undoRedo",
            actions: [
                {
                    // TODO: Actually, shouldn't it select the objects based on its points, not its id?
                    id: "toKeep",
                    layerId: storingLayer.id,
                    object: {},
                    renderIndex: -1,
                },
                {
                    id: "toSelect",
                    layerId: storingLayer.id,
                    object: {},
                    renderIndex: -1,
                },
            ],
        };
        let result = selection.handleEvent(fakeEvent);

        // Only "toKeep" and "toSelect" should remain
        expect(result.history).toEqual<LayerHandlerResult["history"]>([
            {
                batchId: "ignore",
                id: "toDeselect",
                layerId: "Selections",
                object: null,
            },
            {
                batchId: "ignore",
                id: "toKeep",
                layerId: "Selections",
                object: { point: "toKeep", state: 2 },
            },
            {
                batchId: "ignore",
                id: "toSelect",
                layerId: "Selections",
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
