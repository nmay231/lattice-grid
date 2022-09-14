import { Layer, LayerEvent, LayerStorage, PointerMoveOrDown } from "../../../types";
import { getEventEssentials } from "../../../utils/testUtils";
import { DummyLayer } from "../_DummyLayer";
import { handleEventsCurrentSetting, MinimalSettings, TwoPointProps } from "./twoPoint";

type TwoPointLayer = Layer<TwoPointProps> & {
    settings: MinimalSettings;
};

describe("twoPoint.handleEventsCurrentSetting", () => {
    const getFakeLayer = () => {
        const layer = Object.create(DummyLayer) as TwoPointLayer;
        layer.settings = { selectedState: { x: 42 } };
        return layer;
    };

    type SecondArg = Parameters<typeof handleEventsCurrentSetting>[1];
    const applySettings = (layer: TwoPointLayer, arg?: SecondArg) =>
        handleEventsCurrentSetting(layer, {
            deltas: [{ dx: 1, dy: 1 }],
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

    it("should only add/change particular properties", () => {
        const layer = {};
        applySettings(layer as any);
        expect(layer).toEqual({
            gatherPoints: expect.any(Function),
            handleEvent: expect.any(Function),
        });
    });

    it("should select one line", () => {
        const layer = getFakeLayer();
        applySettings(layer);

        const selectPoints = jest.fn();
        const essentials = getEventEssentials<TwoPointProps>();
        essentials.grid.selectPointsWithCursor = selectPoints;

        selectPoints.mockReturnValueOnce(["a"]);
        const fakeEvent: LayerEvent<TwoPointProps> = {
            ...essentials,
            ...getPointerEvent({ type: "pointerDown" }),
        };

        let points = layer.gatherPoints(fakeEvent);
        expect(points).toEqual([]);

        selectPoints.mockReturnValueOnce(["b"]);
        fakeEvent.type = "pointerMove";
        points = layer.gatherPoints(fakeEvent);
        expect(points).toEqual(["a", "b"]);

        let result = layer.handleEvent({ ...fakeEvent, points });
        expect(result.history).toEqual([
            {
                batchId: undefined,
                id: "a;b",
                object: { points: ["a", "b"], state: { x: 42 } },
            },
        ]);
        expect(result.discontinueInput).toBeFalsy();

        result = layer.handleEvent({ ...fakeEvent, type: "pointerUp" });
        expect(result.history?.length).toBeFalsy();
        expect(result.discontinueInput).toBeTruthy();
    });

    it("should select multiple lines", () => {
        const layer = getFakeLayer();
        applySettings(layer);

        const selectPoints = jest.fn();
        const essentials = getEventEssentials<TwoPointProps>();
        essentials.grid.selectPointsWithCursor = selectPoints;

        selectPoints.mockReturnValueOnce(["a"]);
        const fakeEvent: LayerEvent<TwoPointProps> = {
            ...essentials,
            ...getPointerEvent({ type: "pointerDown" }),
        };

        let points = layer.gatherPoints(fakeEvent);
        expect(points).toEqual([]);

        selectPoints.mockReturnValueOnce(["c", "b"]);
        fakeEvent.type = "pointerMove";
        points = layer.gatherPoints(fakeEvent);
        expect(points).toEqual(["a", "c", "b"]);

        let result = layer.handleEvent({ ...fakeEvent, points });
        expect(result.history).toEqual([
            {
                batchId: undefined,
                id: "a;c",
                object: { points: ["a", "c"], state: { x: 42 } },
            },
            {
                batchId: undefined,
                id: "b;c",
                object: { points: ["b", "c"], state: { x: 42 } },
            },
        ]);
        expect(result.discontinueInput).toBeFalsy();

        selectPoints.mockReturnValueOnce(["d", "e"]);
        points = layer.gatherPoints(fakeEvent);
        expect(points).toEqual(["b", "d", "e"]);

        result = layer.handleEvent({ ...fakeEvent, points });
        expect(result.history).toEqual([
            {
                batchId: undefined,
                id: "b;d",
                object: { points: ["b", "d"], state: { x: 42 } },
            },
            {
                batchId: undefined,
                id: "d;e",
                object: { points: ["d", "e"], state: { x: 42 } },
            },
        ]);
        expect(result.discontinueInput).toBeFalsy();

        result = layer.handleEvent({ ...fakeEvent, type: "pointerUp" });
        expect(result.history?.length).toBeFalsy();
        expect(result.discontinueInput).toBeTruthy();
    });

    it("should erase some lines when drawing over existing ones with the same state", () => {
        const layer = getFakeLayer();
        applySettings(layer);

        const stored: LayerStorage<TwoPointProps> = {
            renderOrder: ["a;b"],
            objects: {
                "a;b": { id: "a;b", points: ["a", "b"], state: { x: 42 } },
            },
        };
        const essentials = getEventEssentials({ stored });
        const selectPoints = jest.fn();
        essentials.grid.selectPointsWithCursor = selectPoints;

        selectPoints.mockReturnValueOnce(["b"]);
        const fakeEvent: LayerEvent<TwoPointProps> = {
            ...essentials,
            ...getPointerEvent({ type: "pointerDown" }),
        };

        let points = layer.gatherPoints(fakeEvent);
        expect(points).toEqual([]);

        selectPoints.mockReturnValueOnce(["a"]);
        fakeEvent.type = "pointerMove";
        points = layer.gatherPoints(fakeEvent);
        expect(points).toEqual(["b", "a"]);

        let result = layer.handleEvent({ ...fakeEvent, points });
        expect(result.history).toEqual([{ batchId: undefined, id: "a;b", object: null }]);
        expect(result.discontinueInput).toBeFalsy();

        result = layer.handleEvent({ ...fakeEvent, type: "pointerUp" });
        expect(result.history?.length).toBeFalsy();
        expect(result.discontinueInput).toBeTruthy();
    });

    it("should override some lines when drawing over existing ones with a different state", () => {
        const layer = getFakeLayer();
        applySettings(layer);

        const stored: LayerStorage<TwoPointProps> = {
            renderOrder: ["a;b"],
            objects: {
                "a;b": {
                    id: "a;b",
                    points: ["a", "b"],
                    state: { different: true },
                },
            },
        };
        const essentials = getEventEssentials({ stored });
        const selectPoints = jest.fn();
        essentials.grid.selectPointsWithCursor = selectPoints;

        selectPoints.mockReturnValueOnce(["b"]);
        const fakeEvent: LayerEvent<TwoPointProps> = {
            ...essentials,
            ...getPointerEvent({ type: "pointerDown" }),
        };

        let points = layer.gatherPoints(fakeEvent);
        expect(points).toEqual([]);

        selectPoints.mockReturnValueOnce(["a"]);
        fakeEvent.type = "pointerMove";
        points = layer.gatherPoints(fakeEvent);
        expect(points).toEqual(["b", "a"]);

        let result = layer.handleEvent({ ...fakeEvent, points });
        expect(result.history).toEqual([
            {
                batchId: undefined,
                id: "a;b",
                object: { points: ["a", "b"], state: { x: 42 } },
            },
        ]);
        expect(result.discontinueInput).toBeFalsy();

        result = layer.handleEvent({ ...fakeEvent, type: "pointerUp" });
        expect(result.history?.length).toBeFalsy();
        expect(result.discontinueInput).toBeTruthy();
    });

    it("should not erase lines when drawing over lines and adding lines", () => {
        const layer = getFakeLayer();
        applySettings(layer);

        const stored: LayerStorage<TwoPointProps> = {
            renderOrder: ["1;2"],
            objects: {
                "1;2": { id: "1;2", points: ["1", "2"], state: { x: 42 } },
            },
        };
        const essentials = getEventEssentials({ stored });
        const selectPoints = jest.fn();
        essentials.grid.selectPointsWithCursor = selectPoints;

        selectPoints.mockReturnValueOnce(["3"]);
        const fakeEvent: LayerEvent<TwoPointProps> = {
            ...essentials,
            ...getPointerEvent({ type: "pointerDown" }),
        };

        let points = layer.gatherPoints(fakeEvent);
        expect(points).toEqual([]);

        selectPoints.mockReturnValueOnce(["2"]);
        fakeEvent.type = "pointerMove";
        points = layer.gatherPoints(fakeEvent);
        expect(points).toEqual(["3", "2"]);

        let result = layer.handleEvent({ ...fakeEvent, points });
        expect(result.history).toEqual([
            {
                batchId: undefined,
                id: "2;3",
                object: { points: ["2", "3"], state: { x: 42 } },
            },
        ]);
        expect(result.discontinueInput).toBeFalsy();

        selectPoints.mockReturnValueOnce(["1"]);
        points = layer.gatherPoints(fakeEvent);
        expect(points).toEqual(["2", "1"]);

        result = layer.handleEvent({ ...fakeEvent, points });
        expect(result.history).toEqual([
            // This action is technically unnecessary since the object "1;2" already exists, but the main point is that it doesn't get deleted (or that the state changes)
            // TODO: it should not pollute history by adding lines that already exist
            {
                batchId: undefined,
                id: "1;2",
                object: { points: ["1", "2"], state: { x: 42 } },
            },
        ]);
        expect(result.discontinueInput).toBeFalsy();

        result = layer.handleEvent({ ...fakeEvent, type: "pointerUp" });
        expect(result.history?.length).toBeFalsy();
        expect(result.discontinueInput).toBeTruthy();
    });

    it("should not add lines when deleting lines and drawing over nothing", () => {
        const layer = getFakeLayer();
        applySettings(layer);

        const stored: LayerStorage<TwoPointProps> = {
            renderOrder: ["1;2"],
            objects: {
                "1;2": { id: "1;2", points: ["1", "2"], state: { x: 42 } },
            },
        };
        const essentials = getEventEssentials({ stored });
        const selectPoints = jest.fn();
        essentials.grid.selectPointsWithCursor = selectPoints;

        selectPoints.mockReturnValueOnce(["1"]);
        const fakeEvent: LayerEvent<TwoPointProps> = {
            ...essentials,
            ...getPointerEvent({ type: "pointerDown" }),
        };

        let points = layer.gatherPoints(fakeEvent);
        expect(points).toEqual([]);

        selectPoints.mockReturnValueOnce(["2"]);
        fakeEvent.type = "pointerMove";
        points = layer.gatherPoints(fakeEvent);
        expect(points).toEqual(["1", "2"]);

        let result = layer.handleEvent({ ...fakeEvent, points });
        expect(result.history).toEqual([{ batchId: undefined, id: "1;2", object: null }]);
        expect(result.discontinueInput).toBeFalsy();

        selectPoints.mockReturnValueOnce(["3"]);
        points = layer.gatherPoints(fakeEvent);
        expect(points).toEqual(["2", "3"]);

        result = layer.handleEvent({ ...fakeEvent, points });
        // Unlike the test above, deleting empty lines doesn't pollute history (you are not undoing a no-op)
        expect(result.history?.length).toBeFalsy();
        expect(result.discontinueInput).toBeFalsy();

        result = layer.handleEvent({ ...fakeEvent, type: "pointerUp" });
        expect(result.history?.length).toBeFalsy();
        expect(result.discontinueInput).toBeTruthy();
    });

    // TODO: Not implemented yet
    it.todo("should expand or shrink in the same motion when that setting is active");
});
