import { getEventEssentials } from "../../utils/testUtils";
import { LayerStorage } from "../StorageManager";
import { ObjectState, RawSettings, SimpleLineLayer } from "./SimpleLine";

describe("SimpleLine", () => {
    const attachSelectionsHandler = jest.fn();

    type Arg = { stored?: LayerStorage<ObjectState>; settings?: RawSettings };
    const getSimpleLine = ({ stored, settings }: Arg) => {
        const simpleLine: typeof SimpleLineLayer =
            Object.create(SimpleLineLayer);
        if (!simpleLine.newSettings) {
            throw Error("Expected simpleLine.newSettings to be defined");
        }
        simpleLine.newSettings({
            ...getEventEssentials({ stored }),
            attachSelectionsHandler,
            newSettings: settings || {
                connections: "Cell to Cell",
                fill: "green",
            },
        });

        return simpleLine;
    };

    it("should delete all objects when changing connection types", () => {
        const stored: LayerStorage<ObjectState> = {
            renderOrder: ["something"],
            objects: { something: { points: [], state: { fill: "" } } },
        };
        const simpleLine = getSimpleLine({
            stored,
            settings: { connections: "Cell to Cell", fill: "green" },
        });

        const result = simpleLine.newSettings?.({
            ...getEventEssentials({ stored }),
            attachSelectionsHandler,
            newSettings: {
                connections: "Corner to Corner",
                fill: "green",
            },
        });

        expect(result?.history).toEqual([{ id: "something", object: null }]);
    });

    it("should delete all objects when changing anything but connection types", () => {
        const stored: LayerStorage<ObjectState> = {
            renderOrder: ["something"],
            objects: { something: { points: [], state: { fill: "" } } },
        };
        const simpleLine = getSimpleLine({
            stored,
            settings: { connections: "Cell to Cell", fill: "green" },
        });

        const result = simpleLine.newSettings?.({
            ...getEventEssentials({ stored }),
            attachSelectionsHandler,
            newSettings: {
                connections: "Cell to Cell",
                fill: "blue",
            },
        });

        expect(result?.history?.length).toBeFalsy();
    });
});
