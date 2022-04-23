import { SelectionLayer } from "./Selection";

const getFreshSelectionLayer = () => {
    const selection = new SelectionLayer();
    (selection as any).id = "Selection";
    return selection;
};

const storingLayer = { id: "storingLayer", handleKeyDown: jest.fn() };

const makeFakeEvent = ({ stored, event, tempStorage = {} }: any) => {
    const grid = { getAllPoints: () => [] };
    const storage = {
        getStored: () => stored || { objects: {}, renderOrder: [] },
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

                object: null,
            },
            {
                id: "point1",
                layerId: "Selection",

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

    it.todo("should deselect a cell by clicking another one");
    it.todo("should select multiple disjoint cells when holding ctrl");

    it.todo("tests with gatherPoints maybe...");
});

describe("SelectionLayer on a square grid", () => {
    it.todo("should select many cells in a horizontal line");

    // TODO: Not possible yet because you can't cut across corners
    it.todo("should select many cells in a diagonal line");
});
