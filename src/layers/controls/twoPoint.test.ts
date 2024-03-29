import { vi } from "vitest";
import { LayerStorage } from "../../LayerStorage";
import { PartialHistoryAction } from "../../types";
import { layerEventRunner } from "../../utils/testing/layerEventRunner";
import {
    TwoPointCurrentStateParameters,
    TwoPointProps,
    handleEventsCurrentSetting as twoPointCurrentSetting,
} from "./twoPoint";

describe("twoPoint.handleEventsCurrentSetting", () => {
    type State = { x: string };
    const getTwoPointLayer = (
        { settings = { x: "default" }, ...arg } = {} as { settings?: State } & Partial<
            TwoPointCurrentStateParameters<State>
        >,
    ) => {
        const { gatherPoints, handleEvent } = twoPointCurrentSetting({
            pointTypes: ["cells"],
            deltas: [
                { dx: 0, dy: 2 },
                { dx: 0, dy: -2 },
                { dx: 2, dy: 0 },
                { dx: -2, dy: 0 },
            ],
            stateKeys: Object.keys(settings),
            ...arg,
        });

        return {
            id: "DummyLayer",
            settings,
            gatherPoints,
            handleEvent,
        };
    };

    type HistoryType = PartialHistoryAction<TwoPointProps<State>>[];

    // TODO: we have to call layer.gatherPoints each time because it's not a pure function. We might not have to if modified appropriately.

    afterEach(() => {
        vi.resetAllMocks();
    });

    it("converts states with multiple keys back and forth with nothing lost", () => {
        const { stateToString, stringToState } = twoPointCurrentSetting({
            pointTypes: ["cells"],
            deltas: [{ dx: 420, dy: 69 }],
            stateKeys: ["a", "c", "b"],
        });

        const state = { a: "1", b: "2", c: "3" };
        expect(state).toEqual(stringToState(stateToString(state)));
    });

    it("selects one line", () => {
        // Given an empty grid
        const layer = getTwoPointLayer();
        const handler = layerEventRunner({ layer });
        handler.storage.getNewBatchId.mockReturnValueOnce(13);

        // When two points are selected
        const points1 = handler.gatherPoints({ type: "pointerDown", points: ["a"] });
        expect(points1).toEqual([]);
        const points2 = handler.gatherPoints({ type: "pointerMove", points: ["b"] });
        expect(points2).toEqual(["a", "b"]);

        const pointerMove = handler.events.pointerMove({ points: points2 });

        // Then one line will be created
        expect(pointerMove.history).toEqual<HistoryType>([
            {
                batchId: 13,
                id: "a;b",
                object: { points: ["a", "b"], pointType: "cells", x: "default" },
            },
        ]);

        // Ensure clean result
        const pointerUp = handler.events.pointerUp();
        expect(pointerUp.history?.length).toBeFalsy();
        expect(handler.storage.getNewBatchId).toBeCalledTimes(1);
    });

    it("selects multiple lines", () => {
        // Given an empty grid
        const layer = getTwoPointLayer();
        const handler = layerEventRunner({ layer });
        handler.storage.getNewBatchId.mockReturnValueOnce(13);

        // When three points are selected
        const points1 = handler.gatherPoints({ type: "pointerDown", points: ["a"] });
        expect(points1).toEqual([]);
        const points2 = handler.gatherPoints({ type: "pointerMove", points: ["c", "b"] });
        expect(points2).toEqual(["a", "c", "b"]);

        const pointerMove1 = handler.events.pointerMove({ points: points2 });

        // Then two lines will be created
        expect(pointerMove1.history).toEqual<HistoryType>([
            {
                batchId: 13,
                id: "a;c",
                object: { points: ["a", "c"], pointType: "cells", x: "default" },
            },
            {
                batchId: 13,
                id: "b;c",
                object: { points: ["b", "c"], pointType: "cells", x: "default" },
            },
        ]);

        // When two more points are selected
        const points3 = handler.gatherPoints({ type: "pointerMove", points: ["d", "e"] });
        expect(points3).toEqual(["b", "d", "e"]);

        const pointerMove2 = handler.events.pointerMove({ points: points3 });

        // Then two more lines will be created
        expect(pointerMove2.history).toEqual<HistoryType>([
            {
                batchId: 13,
                id: "b;d",
                object: { points: ["b", "d"], pointType: "cells", x: "default" },
            },
            {
                batchId: 13,
                id: "d;e",
                object: { points: ["d", "e"], pointType: "cells", x: "default" },
            },
        ]);

        // Ensure clean result
        const pointerUp = handler.events.pointerUp();
        expect(pointerUp.history?.length).toBeFalsy();
        expect(handler.storage.getNewBatchId).toBeCalledTimes(1);
    });

    it("erases some lines when drawing over existing ones with the same state", () => {
        // Given an existing line
        const layer = getTwoPointLayer();
        const stored = new LayerStorage<TwoPointProps<State>>();
        stored.setEntries("question", [
            ["a;b", { points: ["a", "b"], pointType: "cells", x: "default" }],
        ]);
        const handler = layerEventRunner({ layer, stored });
        handler.storage.getNewBatchId.mockReturnValueOnce(13);

        // When the existing line is drawn over with the same settings
        const points1 = handler.gatherPoints({ type: "pointerDown", points: ["b"] });
        expect(points1).toEqual([]);
        const points2 = handler.gatherPoints({ type: "pointerMove", points: ["a"] });
        expect(points2).toEqual(["b", "a"]);

        const pointerMove = handler.events.pointerMove({ points: points2 });

        // Then it will be deleted
        expect(pointerMove.history).toEqual<HistoryType>([
            { batchId: 13, id: "a;b", object: null },
        ]);

        // Ensure clean result
        const pointerUp = handler.events.pointerUp();
        expect(pointerUp.history?.length).toBeFalsy();
        expect(handler.storage.getNewBatchId).toBeCalledTimes(1);
    });

    it("overrides some lines when drawing over existing ones with a different state", () => {
        // Given an existing line with a different state
        const layer = getTwoPointLayer();
        const stored = new LayerStorage<TwoPointProps<State>>();
        stored.setEntries("question", [
            ["a;b", { points: ["a", "b"], pointType: "cells", x: "different" }],
        ]);
        const handler = layerEventRunner({ layer, stored });
        handler.storage.getNewBatchId.mockReturnValueOnce(13);

        // When the line is drawn over
        const points1 = handler.gatherPoints({ type: "pointerDown", points: ["b"] });
        expect(points1).toEqual([]);
        const points2 = handler.gatherPoints({ type: "pointerMove", points: ["a"] });
        expect(points2).toEqual(["b", "a"]);

        const pointerMove = handler.events.pointerMove({ points: points2 });

        // Then its state will be changed to the current state
        expect(pointerMove.history).toEqual<HistoryType>([
            {
                batchId: 13,
                id: "a;b",
                object: { points: ["a", "b"], pointType: "cells", x: "default" },
            },
        ]);

        // Ensure clean result
        const pointerUp = handler.events.pointerUp();
        expect(pointerUp.history?.length).toBeFalsy();
        expect(handler.storage.getNewBatchId).toBeCalledTimes(1);
    });

    it("does not erase lines when drawing over similar lines after drawing at all", () => {
        // Given an existing line
        const layer = getTwoPointLayer();
        const stored = new LayerStorage<TwoPointProps<State>>();
        stored.setEntries("question", [
            ["1;2", { points: ["1", "2"], pointType: "cells", x: "default" }],
        ]);
        const handler = layerEventRunner({ layer, stored });
        handler.storage.getNewBatchId.mockReturnValueOnce(13);

        // When drawing a new line
        const points1 = handler.gatherPoints({ type: "pointerDown", points: ["3"] });
        expect(points1).toEqual([]);
        const points2 = handler.gatherPoints({ type: "pointerMove", points: ["2"] });
        expect(points2).toEqual(["3", "2"]);

        const pointerMove1 = handler.events.pointerMove({ points: points2 });

        // Then the new line is created
        expect(pointerMove1.history).toEqual<HistoryType>([
            {
                batchId: 13,
                id: "2;3",
                object: { points: ["2", "3"], pointType: "cells", x: "default" },
            },
        ]);

        // When the existing line is drawn over
        const points3 = handler.gatherPoints({ type: "pointerMove", points: ["1"] });
        expect(points3).toEqual(["2", "1"]);

        const pointerMove2 = handler.events.pointerMove({ points: points3 });

        // Then it should be ignored or left unchanged
        expect(pointerMove2.history).toEqual<HistoryType>([
            // This action is technically unnecessary since the object "1;2" already exists, but the main point is that it doesn't get deleted (or that the state changes)
            // TODO: it should not pollute history by adding lines that already exist
            {
                batchId: 13,
                id: "1;2",
                object: { points: ["1", "2"], pointType: "cells", x: "default" },
            },
        ]);

        // Ensure clean result
        const pointerUp = handler.events.pointerUp();
        expect(pointerUp.history?.length).toBeFalsy();
        expect(handler.storage.getNewBatchId).toBeCalledTimes(1);
    });

    it("does not add lines when deleting lines and drawing over nothing", () => {
        // Given an existing line
        const layer = getTwoPointLayer();
        const stored = new LayerStorage<TwoPointProps<State>>();
        stored.setEntries("question", [
            ["1;2", { points: ["1", "2"], pointType: "cells", x: "default" }],
        ]);
        const handler = layerEventRunner({ layer, stored });
        handler.storage.getNewBatchId.mockReturnValueOnce(13);

        // When drawing over it
        const points1 = handler.gatherPoints({ type: "pointerDown", points: ["1"] });
        expect(points1).toEqual([]);
        const points2 = handler.gatherPoints({ type: "pointerMove", points: ["2"] });
        expect(points2).toEqual(["1", "2"]);

        const pointerMove1 = handler.events.pointerMove({ points: points2 });

        // Then it should be deleted
        expect(pointerMove1.history).toEqual<HistoryType>([
            { batchId: 13, id: "1;2", object: null },
        ]);

        // When selecting more points over untouched area
        const points3 = handler.gatherPoints({ type: "pointerMove", points: ["3"] });
        expect(points3).toEqual(["2", "3"]);

        const pointerMove2 = handler.events.pointerMove({ points: points3 });

        // Then they should not draw lines
        expect(pointerMove2.history?.length).toBeFalsy();

        // Ensure clean result
        const pointerUp = handler.events.pointerUp();
        expect(pointerUp.history?.length).toBeFalsy();
        expect(handler.storage.getNewBatchId).toBeCalledTimes(1);
    });

    // TODO: Not implemented yet
    it.todo("expands/shrinks in the same motion when that setting is active");
});
