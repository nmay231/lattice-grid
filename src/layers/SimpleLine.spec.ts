import { LayerStorage } from "../LayerStorage";
import { IndexedOrderedMap } from "../utils/OrderedMap";
import { getEventEssentials } from "../utils/testUtils";
import { SimpleLineLayer, SimpleLineProps } from "./SimpleLine";

describe("SimpleLine", () => {
    type Arg = {
        stored?: LayerStorage<SimpleLineProps>;
        settings?: SimpleLineProps["RawSettings"];
    };
    const getSimpleLine = ({ stored, settings }: Arg) => {
        const simpleLine = SimpleLineLayer.create({ layers: new IndexedOrderedMap() });
        simpleLine.newSettings({
            ...getEventEssentials({ stored }),
            newSettings: settings || {
                connections: "Cell to Cell",
                stroke: "green",
            },
        });

        return simpleLine;
    };

    it("should delete all objects when changing connection types", () => {
        const stored = LayerStorage.fromObjects<SimpleLineProps>({
            ids: ["something"],
            objs: [{ id: "something", points: [], state: { stroke: "" } }],
        });

        const simpleLine = getSimpleLine({
            stored,
            settings: { connections: "Cell to Cell", stroke: "green" },
        });

        const result = simpleLine.newSettings({
            ...getEventEssentials({ stored }),
            newSettings: {
                connections: "Corner to Corner",
                stroke: "green",
            },
        });

        expect(result?.history).toEqual([{ id: "something", object: null }]);
    });

    it("should not delete any objects when changing anything but connection types", () => {
        const stored = LayerStorage.fromObjects<SimpleLineProps>({
            ids: ["something"],
            objs: [{ id: "something", points: [], state: { stroke: "" } }],
        });

        const simpleLine = getSimpleLine({
            stored,
            settings: { connections: "Cell to Cell", stroke: "green" },
        });

        const result = simpleLine.newSettings({
            ...getEventEssentials({ stored }),
            newSettings: {
                connections: "Cell to Cell",
                stroke: "blue",
            },
        });

        expect(result?.history?.length).toBeFalsy();
    });
});
