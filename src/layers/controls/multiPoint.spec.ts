import { vi } from "vitest";
import { LayerStorage } from "../../LayerStorage";
import { NeedsUpdating, PartialHistoryAction, Point } from "../../types";
import { layerEventRunner } from "../../utils/testUtils";
import { handleEventsUnorderedSets, MultiPointLayerProps } from "./multiPoint";

describe("multiPoint.handleEventsUnorderedSets", () => {
    type SecondArg = Parameters<typeof handleEventsUnorderedSets>[1];
    const getMultiPointLayer = (arg = {} as SecondArg) => {
        const layer = { id: "DummyLayer" } as NeedsUpdating;
        handleEventsUnorderedSets(layer, { pointTypes: ["cells"], ...arg });
        return layer;
    };

    type HistoryType = PartialHistoryAction<MultiPointLayerProps>[];

    // TODO: we have to call layer.gatherPoints each time because it's not a pure function. We might not have to if modified appropriately.

    afterEach(() => {
        vi.resetAllMocks();
    });

    it("should draw a new single-point object when none were selected", () => {
        // Given an empty grid
        const layer = getMultiPointLayer();
        const handler = layerEventRunner({ layer });
        handler.storage.getNewBatchId.mockReturnValueOnce(1);

        // When a single point is selected
        const points = handler.gatherPoints({ type: "pointerDown", points: ["a"] });
        expect(points).toEqual<Point[]>(["a"]);
        const pointerDown = handler.events.pointerDown({ points });

        // Then it should create an object
        expect(pointerDown.history).toEqual<HistoryType>([
            { batchId: 1, id: "a", object: { points: ["a"], state: null } },
        ]);
        expect(pointerDown.discontinueInput).toBeFalsy();

        // Ensure clean result
        const pointerUp = handler.events.pointerUp();
        expect(pointerUp.history?.length).toBeFalsy();
        expect(pointerUp.discontinueInput).toBeTruthy();
    });

    it("should draw a new object when a previous one was selected", () => {
        // Given a grid with an object selected
        const layer = getMultiPointLayer();
        const stored = LayerStorage.fromObjects<MultiPointLayerProps>({
            ids: ["a"],
            objs: [{ points: ["a"], state: null }],
        });
        stored.permStorage = { currentObjectId: "a" }; // Select the existing object

        const handler = layerEventRunner({ layer, stored });
        handler.storage.getNewBatchId.mockReturnValueOnce(1);

        // When a different point is selected
        const points = handler.gatherPoints({ type: "pointerDown", points: ["b"] });
        expect(points).toEqual(["b"]);
        const pointerDown = handler.events.pointerDown({ points });

        // Then the old should remain and the new be created
        expect(pointerDown.history).toEqual<HistoryType>([
            { batchId: 1, id: "b", object: { points: ["b"], state: null } },
        ]);
        expect(pointerDown.discontinueInput).toBeFalsy();

        const pointerUp = handler.events.pointerUp();
        expect(pointerUp.history?.length).toBeFalsy();
        expect(pointerUp.discontinueInput).toBeTruthy();
    });

    it("should expand and shrink an object", () => {
        // Given an empty grid
        const layer = getMultiPointLayer();
        const handler = layerEventRunner({ layer });
        handler.storage.getNewBatchId.mockReturnValueOnce(42);

        // When we start drawing the object
        const points1 = handler.gatherPoints({ type: "pointerDown", points: ["y"] });
        expect(points1).toEqual(["y"]);
        const pointerDown = handler.events.pointerDown({ points: points1 });

        expect(pointerDown.history).toEqual<HistoryType>([
            { batchId: 42, id: "y", object: { points: ["y"], state: null } },
        ]);
        expect(pointerDown.discontinueInput).toBeFalsy();

        // ... and continuing selecting more points
        const points2 = handler.gatherPoints({ type: "pointerMove", points: ["z", "x"] });
        expect(points2).toEqual(["y", "z", "x"]);
        const pointerMove1 = handler.events.pointerMove({ points: points2 });

        // Then the object should grow
        expect(pointerMove1.history).toEqual<HistoryType>([
            { batchId: 42, id: "y", object: { points: ["x", "y", "z"], state: null } },
        ]);
        expect(pointerMove1.discontinueInput).toBeFalsy();

        // When we select previous points
        const points3 = handler.gatherPoints({ type: "pointerMove", points: ["y"] });
        expect(points3).toEqual(["x", "y"]);
        const pointerMove2 = handler.events.pointerMove({ points: points3 });

        // Then the object should shrink (while keeping the currently selected point)
        expect(pointerMove2.history).toEqual<HistoryType>([
            { batchId: 42, id: "y", object: { points: ["y", "z"], state: null } },
        ]);
        expect(pointerMove2.discontinueInput).toBeFalsy();

        // When the user finishes
        const pointerUp = handler.events.pointerUp();

        // Then the id should update to contain all the points
        expect(pointerUp.history).toEqual<HistoryType>([
            { batchId: 42, id: "y", object: null },
            {
                batchId: 42,
                id: "y;z",
                object: { points: ["y", "z"], state: null },
            },
        ]);
        // TODO: The above is only true until ids become more like symbols and are not reliant on the current points at all.
        // TODO: expect(pointerUp.history?.length).toBeFalsy()
        expect(pointerUp.discontinueInput).toBeTruthy();
        expect(handler.storage.getNewBatchId).toBeCalledTimes(1);
    });

    it("should remove a point from the current object after a simple click", () => {
        // Given an object with two points
        const layer = getMultiPointLayer();
        const stored = LayerStorage.fromObjects<MultiPointLayerProps>({
            ids: ["a;b"],
            objs: [{ points: ["a", "b"], state: null }],
        });
        stored.permStorage = { currentObjectId: "a;b" };

        const handler = layerEventRunner({ layer, stored });
        handler.storage.getNewBatchId.mockReturnValueOnce(42);

        // When one point of the object is clicked without being moved
        const points1 = handler.gatherPoints({ type: "pointerDown", points: ["b"] });
        expect(points1).toEqual(["b"]);
        const pointerDown = handler.events.pointerDown({ points: points1 });

        expect(pointerDown.history).toEqual<HistoryType>([
            // TODO: This is only used to force a rerender
            {
                batchId: 42,
                id: "a;b",
                object: { points: ["a", "b"], state: null },
            },
        ]);
        expect(pointerDown.discontinueInput).toBeFalsy();

        const pointerUp = handler.events.pointerUp();

        // Then that one point is removed from the object
        expect(pointerUp.history).toEqual<HistoryType>([
            { batchId: 42, id: "a;b", object: null },
            {
                batchId: 42,
                id: "a",
                object: { points: ["a"], state: null },
            },
        ]);
        expect(pointerUp.discontinueInput).toBeTruthy();
        expect(handler.storage.getNewBatchId).toBeCalledTimes(1);
    });

    it.todo("should delete a single-point object after a simple click");

    it.todo(
        "should not remove a point from an object when clicked if it was not the current object",
    );

    it("should not remove the starting point from an object if points were added/deleted", () => {
        // Given an object with two points
        const layer = getMultiPointLayer();
        const stored = LayerStorage.fromObjects<MultiPointLayerProps>({
            ids: ["a;b"],
            objs: [{ points: ["a", "b"], state: null }],
        });
        stored.permStorage = { currentObjectId: "a;b" };

        const handler = layerEventRunner({ layer, stored });
        handler.storage.getNewBatchId.mockReturnValueOnce(42);

        // When one of its points is selected, call it the starting point
        const points1 = handler.gatherPoints({ type: "pointerDown", points: ["b"] });
        expect(points1).toEqual(["b"]);
        handler.events.pointerDown({ points: points1 });

        // ... and points are added
        const points2 = handler.gatherPoints({ type: "pointerMove", points: ["c", "d"] });
        expect(points2).toEqual(["b", "c", "d"]);
        handler.events.pointerMove({ points: points2 });

        // ... and points are removed, ending with the starting point selected
        const points3 = handler.gatherPoints({ type: "pointerMove", points: ["a", "b"] });
        expect(points3).toEqual(["d", "a", "b"]);
        const pointerMove = handler.events.pointerMove({ points: points3 });

        // Then the starting point should remain and not be removed
        expect(pointerMove.history).toEqual<HistoryType>([
            { batchId: 42, id: "a;b", object: { points: ["b", "c"], state: null } },
        ]);
        expect(pointerMove.discontinueInput).toBeFalsy();

        const pointerUp = handler.events.pointerUp();
        expect(pointerUp.history).toEqual<HistoryType>([
            { batchId: 42, id: "a;b", object: null },
            { batchId: 42, id: "b;c", object: { points: ["b", "c"], state: null } },
        ]);
        expect(pointerUp.discontinueInput).toBeTruthy();
        expect(handler.storage.getNewBatchId).toBeCalledTimes(1);
    });

    it.todo("should delete the layers state then delete the object using the delete key");

    it.todo("should deselect an object when escape is pressed");

    it.todo("should select an object on undo/redo when object exists");

    it.todo("should select an object on undo/redo when object does not exist");
});
