import { LayerStorage } from "../LayerStorage";
import { IndexedOrderedMap } from "../utils/OrderedMap";
import { layerEventEssentials } from "../utils/testing/layerEventEssentials";
import { SimpleLineLayer, SimpleLineProps } from "./SimpleLine";

describe("SimpleLine", () => {
    type Arg = {
        stored?: LayerStorage<SimpleLineProps>;
        settings?: SimpleLineProps["Settings"];
    };
    const getSimpleLine = ({ stored, settings }: Arg) => {
        const layer = SimpleLineLayer.create({ layers: new IndexedOrderedMap() });
        const essentials = layerEventEssentials({ stored });
        let oldSettings: typeof settings = undefined;
        if (settings) {
            oldSettings = layer.settings;
            layer.settings = { ...settings };
        }
        layer.updateSettings({ ...essentials, puzzleSettings: essentials.settings, oldSettings });

        return layer;
    };

    it("deletes all objects when changing connection types", () => {
        const stored = new LayerStorage<SimpleLineProps>();
        stored.setEntries("question", [
            ["something", { id: "something", points: [], stroke: "green" }],
        ]);

        const simpleLine = getSimpleLine({
            stored,
            settings: {
                pointType: "cells",
                stroke: "green",
                selectedState: "green",
            },
        });

        const oldSettings = simpleLine.settings;
        simpleLine.settings = {
            pointType: "corners",
            stroke: "green",
            selectedState: "green",
        };
        const essentials = layerEventEssentials({ stored });
        const result = simpleLine.updateSettings({
            ...essentials,
            puzzleSettings: essentials.settings,
            oldSettings,
        });

        expect(result?.history).toEqual([{ id: "something", object: null }]);
    });

    it("does not delete any objects when changing anything but connection types", () => {
        const stored = new LayerStorage<SimpleLineProps>();
        stored.setEntries("question", [
            ["something", { id: "something", points: [], stroke: "green" }],
        ]);

        const simpleLine = getSimpleLine({
            stored,
            settings: {
                pointType: "cells",
                stroke: "green",
                selectedState: "green",
            },
        });

        const oldSettings = simpleLine.settings;
        simpleLine.settings = {
            pointType: "cells",
            stroke: "blue",
            selectedState: "blue",
        };
        const essentials = layerEventEssentials({ stored });
        const result = simpleLine.updateSettings({
            ...essentials,
            puzzleSettings: essentials.settings,
            oldSettings,
        });

        expect(result.history ?? []).toEqual([]);
    });
});
