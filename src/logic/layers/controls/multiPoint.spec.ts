import { vi } from "vitest";
import { Layer, LayerEvent, PartialHistoryAction, PointerMoveOrDown } from "../../../types";
import { smartSort } from "../../../utils/stringUtils";
import { getEventEssentials } from "../../../utils/testUtils";
import { LayerStorage } from "../../LayerStorage";
import { DummyLayer } from "../_DummyLayer";
import { handleEventsUnorderedSets, MultiPointLayerProps } from "./multiPoint";

describe("multiPoint.handleEventsUnorderedSets", () => {
    const getFakeLayer = () => {
        const layer = Object.create(DummyLayer) as Layer<MultiPointLayerProps>;
        return layer;
    };

    type SecondArg = Parameters<typeof handleEventsUnorderedSets>[1];
    const applySettings = (layer: Layer<MultiPointLayerProps>, arg?: SecondArg) =>
        handleEventsUnorderedSets(layer, {
            pointTypes: ["cells"],
            ...arg,
        });

    const getPointerEvent = (event: Pick<PointerMoveOrDown, "type">): PointerMoveOrDown => ({
        ctrlKey: false,
        shiftKey: false,
        altKey: false,
        cursor: { x: 1, y: 1 },
        points: [],
        ...event,
    });

    // TODO: This and the other controls tests might have to be rewritten to be more clear and more consistent. It's pretty much a hodge-pogge of assertions at the moment, which I guess is better than nothing for now...
    // For example, we have to call layer.gatherPoints each time because it's not a pure function. It's purposely not pure, but that doesn't have to be if modified appropriately.

    type HistoryType = PartialHistoryAction<MultiPointLayerProps>[];

    it("should draw a new single-point object when none were selected", () => {
        const layer = getFakeLayer();
        applySettings(layer);

        const stored = new LayerStorage<MultiPointLayerProps>();
        const selectPoints = vi.fn();
        const getBatchId = vi.fn();
        const essentials = getEventEssentials({ stored });
        essentials.grid.selectPointsWithCursor = selectPoints;
        essentials.storage.getNewBatchId = getBatchId;

        selectPoints.mockReturnValueOnce(["a"]);
        const fakeEvent: LayerEvent<MultiPointLayerProps> = {
            ...essentials,
            ...getPointerEvent({ type: "pointerDown" }),
        };

        const points = layer.gatherPoints(fakeEvent);
        expect(points).toEqual(["a"]);

        getBatchId.mockReturnValueOnce(1);
        let result = layer.handleEvent({ ...fakeEvent, points });
        expect(result.history).toEqual<HistoryType>([
            { batchId: 1, id: "a", object: { id: "a", points: ["a"], state: null } },
        ]);
        expect(result.discontinueInput).toBeFalsy();

        stored.objects.set("a", result.history?.[0].object);

        result = layer.handleEvent({ ...fakeEvent, type: "pointerUp" });
        expect(result.history?.length).toBeFalsy();
        expect(result.discontinueInput).toBeTruthy();
    });

    it("should draw a new object when a previous one was selected", () => {
        const layer = getFakeLayer();
        applySettings(layer);

        const stored = LayerStorage.fromObjects({
            ids: ["a"],
            objs: [{ id: "a", points: ["a"], state: null }],
        });
        const selectPoints = vi.fn();
        const getBatchId = vi.fn();
        const essentials = getEventEssentials({ stored });
        essentials.grid.selectPointsWithCursor = selectPoints;
        essentials.storage.getNewBatchId = getBatchId;

        // Select the existing object
        stored.extra.currentObjectId = "a";

        selectPoints.mockReturnValueOnce(["b"]);
        const fakeEvent: LayerEvent<MultiPointLayerProps> = {
            ...essentials,
            ...getPointerEvent({ type: "pointerDown" }),
        };
        const points = layer.gatherPoints(fakeEvent);
        expect(points).toEqual(["b"]);

        getBatchId.mockReturnValueOnce(1);
        let result = layer.handleEvent({ ...fakeEvent, points });
        expect(result.history).toEqual<HistoryType>([
            { batchId: 1, id: "b", object: { id: "b", points: ["b"], state: null } },
        ]);
        expect(result.discontinueInput).toBeFalsy();
        stored.objects.set("b", result.history?.[0].object);

        result = layer.handleEvent({ ...fakeEvent, type: "pointerUp" });
        expect(result.history?.length).toBeFalsy();
        expect(result.discontinueInput).toBeTruthy();
    });

    it("should expand and shrink an object", () => {
        const layer = getFakeLayer();
        applySettings(layer);

        const stored = new LayerStorage<MultiPointLayerProps>();
        const selectPoints = vi.fn();
        const getBatchId = vi.fn();
        const essentials = getEventEssentials({ stored });
        essentials.grid.selectPointsWithCursor = selectPoints;
        essentials.storage.getNewBatchId = getBatchId;

        // Start drawing the object
        selectPoints.mockReturnValueOnce(["b"]);
        const fakeEvent: LayerEvent<MultiPointLayerProps> = {
            ...essentials,
            ...getPointerEvent({ type: "pointerDown" }),
        };

        let points = layer.gatherPoints(fakeEvent);
        expect(points).toEqual(["b"]);

        getBatchId.mockReturnValueOnce(1);
        let result = layer.handleEvent({ ...fakeEvent, points });
        expect(result.history).toEqual<HistoryType>([
            { batchId: 1, id: "b", object: { id: "b", points: ["b"], state: null } },
        ]);
        expect(result.discontinueInput).toBeFalsy();

        stored.objects.set("b", result.history?.[0].object);

        // Expand the object
        selectPoints.mockReturnValueOnce(["c", "a"]);
        fakeEvent.type = "pointerMove";
        points = layer.gatherPoints(fakeEvent);
        expect(points).toEqual(["b", "c", "a"]);

        result = layer.handleEvent({ ...fakeEvent, points });
        points = [...points].sort(smartSort);
        expect(result.history).toEqual<HistoryType>([
            { batchId: 1, id: "b", object: { id: "b", points, state: null } },
        ]);
        expect(result.discontinueInput).toBeFalsy();

        stored.objects.set("b", result.history?.[0].object);

        // Shrink the object
        selectPoints.mockReturnValueOnce(["b"]);
        fakeEvent.type = "pointerMove";
        points = layer.gatherPoints(fakeEvent);
        expect(points).toEqual(["a", "b"]);

        result = layer.handleEvent({ ...fakeEvent, points });
        points = ["b", "c"];
        expect(result.history).toEqual<HistoryType>([
            { batchId: 1, id: "b", object: { id: "b", points, state: null } },
        ]);
        expect(result.discontinueInput).toBeFalsy();

        stored.objects.set("b", result.history?.[0].object);

        result = layer.handleEvent({ ...fakeEvent, type: "pointerUp" });
        expect(result.history).toEqual<HistoryType>([
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

        const stored = LayerStorage.fromObjects<MultiPointLayerProps>({
            ids: ["a;b"],
            objs: [{ id: "a;b", points: ["a", "b"], state: null }],
        });
        stored.extra = { currentObjectId: "a;b" };
        const selectPoints = vi.fn();
        const getBatchId = vi.fn();
        const essentials = getEventEssentials({ stored });
        essentials.grid.selectPointsWithCursor = selectPoints;
        essentials.storage.getNewBatchId = getBatchId;

        selectPoints.mockReturnValueOnce(["b"]);
        const fakeEvent: LayerEvent<MultiPointLayerProps> = {
            ...essentials,
            ...getPointerEvent({ type: "pointerDown" }),
        };
        const points = layer.gatherPoints(fakeEvent);
        expect(points).toEqual(["b"]);

        getBatchId.mockReturnValueOnce(1);
        let result = layer.handleEvent({ ...fakeEvent, points });
        expect(result.history).toEqual<HistoryType>([
            // TODO: Required to force a rerender
            {
                batchId: 1,
                id: "a;b",
                object: { id: "a;b", points: ["a", "b"], state: null },
            },
        ]);
        expect(result.discontinueInput).toBeFalsy();

        result = layer.handleEvent({ ...fakeEvent, type: "pointerUp" });
        expect(result.history).toEqual<HistoryType>([
            { batchId: 1, id: "a;b", object: null },
            {
                batchId: 1,
                id: "a",
                object: { id: "a", points: ["a"], state: null },
            },
        ]);
        expect(result.discontinueInput).toBeTruthy();
    });

    it.todo("should not remove a point from an object if it was not the current object");

    it("should not remove the starting point from an object if points were added/deleted", () => {
        const layer = getFakeLayer();
        applySettings(layer);

        const stored = LayerStorage.fromObjects<MultiPointLayerProps>({
            ids: ["a;b"],
            objs: [{ id: "a;b", points: ["a", "b"], state: null }],
        });
        stored.extra = { currentObjectId: "a;b" };
        const selectPoints = vi.fn();
        const getBatchId = vi.fn();
        const essentials = getEventEssentials<MultiPointLayerProps>({ stored });
        essentials.grid.selectPointsWithCursor = selectPoints;
        essentials.storage.getNewBatchId = getBatchId;

        // Select the starting point
        selectPoints.mockReturnValueOnce(["b"]);
        const fakeEvent: LayerEvent<MultiPointLayerProps> = {
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
        stored.objects.set("a;b", result.history?.[0].object);

        // Shrink
        selectPoints.mockReturnValueOnce(["d", "b"]);
        points = layer.gatherPoints(fakeEvent);

        result = layer.handleEvent({ ...fakeEvent, points });
        stored.objects.set("a;b", result.history?.[0].object);

        // End on the starting point
        result = layer.handleEvent({ ...fakeEvent, type: "pointerUp" });
        expect(result.history).toEqual<HistoryType>([
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

    it.todo("should delete the layers state then delete the object using the delete key");

    it.todo("should deselect an object when escape is pressed");

    it.todo("should select an object on undo/redo when object exists");

    it.todo("should select an object on undo/redo when object does not exist");
});
