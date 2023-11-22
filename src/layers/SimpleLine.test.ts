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

    it("only changes storage filter when changing connection types", () => {
        const stored = new LayerStorage<SimpleLineProps>();
        const simpleLine = getSimpleLine({ stored });

        const updateSettings = (newSettings: Partial<SimpleLineLayer["settings"]>) => {
            const oldSettings = { ...simpleLine.settings };
            for (const [key, value] of Object.entries(newSettings)) {
                simpleLine.settings[key as keyof typeof simpleLine.settings] = value as any;
            }

            const essentials = layerEventEssentials({ stored });
            return simpleLine.updateSettings({
                ...essentials,
                puzzleSettings: essentials.settings,
                oldSettings,
            });
        };

        const result1 = updateSettings({
            pointType: "cells",
            stroke: "green",
            selectedState: "green",
        });
        expect(result1.removeFilters).toHaveLength(0);

        const result2 = updateSettings({ pointType: "corners" });
        expect(result2.removeFilters).toHaveLength(1);

        const result3 = updateSettings({ stroke: "blue", selectedState: "blue" });
        expect(result3.removeFilters).toHaveLength(0);

        const result4 = updateSettings({
            pointType: "cells",
            stroke: "green",
            selectedState: "green",
        });
        expect(result4.removeFilters).toHaveLength(1);
    });
});
