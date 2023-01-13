import { LayerStorage } from "../LayerStorage";
import { NeedsUpdating } from "../types";
import { getEventEssentials } from "../utils/testUtils";
import { SimpleLineLayer, SimpleLineProps } from "./SimpleLine";

describe("SimpleLine", () => {
    type Arg = {
        stored?: LayerStorage<SimpleLineProps>;
        settings?: SimpleLineProps["RawSettings"];
    };
    const getSimpleLine = ({ stored, settings }: Arg) => {
        const simpleLine = SimpleLineLayer.create({ layers: {} } as NeedsUpdating);
        simpleLine.newSettings({
            ...getEventEssentials({ stored }),
            newSettings: settings || {
                connections: "Cell to Cell",
                fill: "green",
            },
        });

        return simpleLine;
    };

    it("should delete all objects when changing connection types", () => {
        const stored = LayerStorage.fromObjects<SimpleLineProps>({
            ids: ["something"],
            objs: [{ id: "something", points: [], state: { fill: "" } }],
        });

        const simpleLine = getSimpleLine({
            stored,
            settings: { connections: "Cell to Cell", fill: "green" },
        });

        const result = simpleLine.newSettings({
            ...getEventEssentials({ stored }),
            newSettings: {
                connections: "Corner to Corner",
                fill: "green",
            },
        });

        expect(result?.history).toEqual([{ id: "something", object: null }]);
    });

    it("should delete all objects when changing anything but connection types", () => {
        const stored = LayerStorage.fromObjects<SimpleLineProps>({
            ids: ["something"],
            objs: [{ id: "something", points: [], state: { fill: "" } }],
        });

        const simpleLine = getSimpleLine({
            stored,
            settings: { connections: "Cell to Cell", fill: "green" },
        });

        const result = simpleLine.newSettings({
            ...getEventEssentials({ stored }),
            newSettings: {
                connections: "Cell to Cell",
                fill: "blue",
            },
        });

        expect(result?.history?.length).toBeFalsy();
    });
});
