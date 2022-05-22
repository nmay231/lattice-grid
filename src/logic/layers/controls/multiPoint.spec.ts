import { getEventEssentials } from "../../../utils/testUtils";
import { LayerStorage } from "../../StorageManager";
import { ILayer, LayerEvent, PointerMoveOrDown } from "../baseLayer";
import { DummyLayer } from "../_DummyLayer";
import { handleEventsUnorderedSets, MinimalState } from "./multiPoint";

type multiPointLayer<
    ObjectState extends MinimalState = MinimalState,
    RawSettings = object,
> = ILayer<ObjectState, RawSettings>;

describe("multiPoint.handleEventsUnorderedSets", () => {
    const getFakeLayer = () => {
        const layer = Object.create(DummyLayer) as multiPointLayer;
        return layer;
    };

    type SecondArg = Parameters<typeof handleEventsUnorderedSets>[1];
    const applySettings = (layer: multiPointLayer, arg?: SecondArg) =>
        handleEventsUnorderedSets(layer, {
            pointTypes: ["cells"],
            ...arg,
        });

    const getPointerEvent = (
        event: Pick<PointerMoveOrDown, "type">,
    ): PointerMoveOrDown => ({
        ctrlKey: false,
        shiftKey: false,
        altKey: false,
        cursor: { x: 1, y: 1 },
        points: [],
        ...event,
    });

    // TODO: This and the other controls tests might have to be rewritten to be more clear and more consistent. It's pretty much a hodge-pogge of assertions at the moment, which I guess is better than nothing for now...
    // For example, we have to call layer.gatherPoints each time because it's not a pure function. It's purposely not pure, but that doesn't have to be if modified appropriately.

    it("should draw a new single-point object when none were selected", () => {
        const layer = getFakeLayer();
        applySettings(layer);

        const selectPoints = jest.fn();
        const getBatchId = jest.fn();
        const essentials = getEventEssentials<MinimalState>();
        essentials.grid.selectPointsWithCursor = selectPoints;
        essentials.storage.getNewBatchId = getBatchId;

        selectPoints.mockReturnValueOnce(["a"]);
        let fakeEvent: LayerEvent<MinimalState> = {
            ...essentials,
            ...getPointerEvent({ type: "pointerDown" }),
        };

        let points = layer.gatherPoints(fakeEvent);
        expect(points).toEqual(["a"]);

        getBatchId.mockReturnValueOnce(1);
        let result = layer.handleEvent({ ...fakeEvent, points });
        expect(result.history).toEqual([
            { batchId: 1, id: "a", object: { points: ["a"], state: null } },
        ]);
        expect(result.discontinueInput).toBeFalsy();

        essentials.stored.objects.a = result.history?.[0].object;
        essentials.stored.renderOrder.push("a");

        result = layer.handleEvent({ ...fakeEvent, type: "pointerUp" });
        expect(result.history?.length).toBeFalsy();
        expect(result.discontinueInput).toBeTruthy();
    });

    it("should draw a new object when a previous one was selected", () => {
        const layer = getFakeLayer();
        applySettings(layer);

        const stored: LayerStorage<MinimalState> = {
            objects: { a: { id: "a", points: ["a"], state: null } },
            renderOrder: ["a"],
        };
        const selectPoints = jest.fn();
        const getBatchId = jest.fn();
        const essentials = getEventEssentials<MinimalState>({ stored });
        essentials.grid.selectPointsWithCursor = selectPoints;
        essentials.storage.getNewBatchId = getBatchId;

        // Select the existing object
        essentials.stored.currentObjectId = "a";

        selectPoints.mockReturnValueOnce(["b"]);
        let fakeEvent: LayerEvent<MinimalState> = {
            ...essentials,
            ...getPointerEvent({ type: "pointerDown" }),
        };
        let points = layer.gatherPoints(fakeEvent);
        expect(points).toEqual(["b"]);

        getBatchId.mockReturnValueOnce(1);
        let result = layer.handleEvent({ ...fakeEvent, points });
        expect(result.history).toEqual([
            { batchId: 1, id: "b", object: { points: ["b"], state: null } },
        ]);
        expect(result.discontinueInput).toBeFalsy();
        essentials.stored.objects.b = result.history?.[0].object;
        essentials.stored.renderOrder.push("b");

        result = layer.handleEvent({ ...fakeEvent, type: "pointerUp" });
        expect(result.history?.length).toBeFalsy();
        expect(result.discontinueInput).toBeTruthy();
    });

    it("should expand and shrink an object", () => {
        const layer = getFakeLayer();
        applySettings(layer);

        const selectPoints = jest.fn();
        const getBatchId = jest.fn();
        const essentials = getEventEssentials<MinimalState>();
        essentials.grid.selectPointsWithCursor = selectPoints;
        essentials.storage.getNewBatchId = getBatchId;

        // Start drawing the object
        selectPoints.mockReturnValueOnce(["b"]);
        let fakeEvent: LayerEvent<MinimalState> = {
            ...essentials,
            ...getPointerEvent({ type: "pointerDown" }),
        };

        let points = layer.gatherPoints(fakeEvent);
        expect(points).toEqual(["b"]);

        getBatchId.mockReturnValueOnce(1);
        let result = layer.handleEvent({ ...fakeEvent, points });
        expect(result.history).toEqual([
            { batchId: 1, id: "b", object: { points: ["b"], state: null } },
        ]);
        expect(result.discontinueInput).toBeFalsy();

        essentials.stored.objects.b = result.history?.[0].object;
        essentials.stored.renderOrder.push("b");

        // Expand the object
        selectPoints.mockReturnValueOnce(["c", "a"]);
        fakeEvent.type = "pointerMove";
        points = layer.gatherPoints(fakeEvent);
        expect(points).toEqual(["b", "c", "a"]);

        result = layer.handleEvent({ ...fakeEvent, points });
        points = [...points].sort();
        expect(result.history).toEqual([
            { batchId: 1, id: "b", object: { points, state: null } },
        ]);
        expect(result.discontinueInput).toBeFalsy();

        essentials.stored.objects.b = result.history?.[0].object;

        // Shrink the object
        selectPoints.mockReturnValueOnce(["b"]);
        fakeEvent.type = "pointerMove";
        points = layer.gatherPoints(fakeEvent);
        expect(points).toEqual(["a", "b"]);

        result = layer.handleEvent({ ...fakeEvent, points });
        points = ["b", "c"];
        expect(result.history).toEqual([
            { batchId: 1, id: "b", object: { points, state: null } },
        ]);
        expect(result.discontinueInput).toBeFalsy();

        essentials.stored.objects.b = result.history?.[0].object;

        result = layer.handleEvent({ ...fakeEvent, type: "pointerUp" });
        expect(result.history).toEqual([
            { batchId: 1, id: "b", object: null },
            {
                batchId: 1,
                id: "b;c",
                object: { id: "b;c", points, state: null },
            },
        ]);
        expect(result.discontinueInput).toBeTruthy();
    });

    it("should remove a point from an object after a simple click", () => {
        const layer = getFakeLayer();
        applySettings(layer);

        const stored: LayerStorage<MinimalState> = {
            objects: { "a;b": { id: "a;b", points: ["a", "b"], state: null } },
            renderOrder: ["a;b"],
            currentObjectId: "a;b",
        };
        const selectPoints = jest.fn();
        const getBatchId = jest.fn();
        const essentials = getEventEssentials<MinimalState>({ stored });
        essentials.grid.selectPointsWithCursor = selectPoints;
        essentials.storage.getNewBatchId = getBatchId;

        selectPoints.mockReturnValueOnce(["b"]);
        let fakeEvent: LayerEvent<MinimalState> = {
            ...essentials,
            ...getPointerEvent({ type: "pointerDown" }),
        };
        let points = layer.gatherPoints(fakeEvent);
        expect(points).toEqual(["b"]);

        getBatchId.mockReturnValueOnce(1);
        let result = layer.handleEvent({ ...fakeEvent, points });
        expect(result.history).toEqual([
            // TODO: Required to force a rerender
            {
                batchId: 1,
                id: "a;b",
                object: { id: "a;b", points: ["a", "b"], state: null },
            },
        ]);
        expect(result.discontinueInput).toBeFalsy();

        result = layer.handleEvent({ ...fakeEvent, type: "pointerUp" });
        expect(result.history).toEqual([
            { batchId: 1, id: "a;b", object: null },
            {
                batchId: 1,
                id: "a",
                object: { id: "a", points: ["a"], state: null },
            },
        ]);
        expect(result.discontinueInput).toBeTruthy();
    });

    it("should not remove the starting point from an object if points were added/deleted", () => {
        const layer = getFakeLayer();
        applySettings(layer);

        const stored: LayerStorage<MinimalState> = {
            objects: { "a;b": { id: "a;b", points: ["a", "b"], state: null } },
            renderOrder: ["a;b"],
            currentObjectId: "a;b",
        };
        const selectPoints = jest.fn();
        const getBatchId = jest.fn();
        const essentials = getEventEssentials<MinimalState>({ stored });
        essentials.grid.selectPointsWithCursor = selectPoints;
        essentials.storage.getNewBatchId = getBatchId;

        // Select the starting point
        selectPoints.mockReturnValueOnce(["b"]);
        let fakeEvent: LayerEvent<MinimalState> = {
            ...essentials,
            ...getPointerEvent({ type: "pointerDown" }),
        };
        let points = layer.gatherPoints(fakeEvent);

        getBatchId.mockReturnValueOnce(1);
        let result = layer.handleEvent({ ...fakeEvent, points });

        // Expand
        selectPoints.mockReturnValueOnce(["c", "d"]);
        fakeEvent.type = "pointerMove";
        points = layer.gatherPoints(fakeEvent);

        result = layer.handleEvent({ ...fakeEvent, points });
        essentials.stored.objects["a;b"] = result.history?.[0].object;

        // Shrink
        selectPoints.mockReturnValueOnce(["d", "b"]);
        points = layer.gatherPoints(fakeEvent);

        result = layer.handleEvent({ ...fakeEvent, points });
        essentials.stored.objects["a;b"] = result.history?.[0].object;

        // End on the starting point
        result = layer.handleEvent({ ...fakeEvent, type: "pointerUp" });
        expect(result.history).toEqual([
            { batchId: 1, id: "a;b", object: null },
            {
                batchId: 1,
                // Point b should remain even though the event started and ended on it
                id: "a;b;c",
                object: { id: "a;b;c", points: ["a", "b", "c"], state: null },
            },
        ]);
        expect(result.discontinueInput).toBeTruthy();
    });

    it.todo("should delete a single-point object after a simple click");

    it.todo(
        "should delete the layers state then delete the object using the delete key",
    );

    it.todo("should deselect an object when escape is pressed");

    it.todo("should select an object on undo/redo when object exists");

    it.todo("should select an object on undo/redo when object does not exist");
});
