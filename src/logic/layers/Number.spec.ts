import { LayerHandlerResult, NeedsUpdating } from "../../types";
import { getEventEssentials, GetEventEssentialsArg } from "../../utils/testUtils";
import { LayerStorage } from "../StorageManager";
import { NumberLayer, NumberProps } from "./Number";

describe("Number Layer", () => {
    const eventEssentials = (arg: GetEventEssentialsArg<NumberProps> = {}) =>
        getEventEssentials(arg);

    const EMPTY_STORED: LayerStorage<NumberProps> = {
        renderOrder: [],
        objects: {},
        extra: {},
    };

    // Layer with numbers 0-9
    const settings9 = { max: 9, negatives: true };
    const layer9 = NumberLayer.create({ layers: {} } as NeedsUpdating) as NumberLayer;
    layer9.newSettings({ ...eventEssentials(), newSettings: settings9 });

    // Layer with numbers -64 to 64
    const settings64 = { max: 64, negatives: true };
    const layer64 = NumberLayer.create({ layers: {} } as NeedsUpdating) as NumberLayer;
    layer64.newSettings({ ...eventEssentials(), newSettings: settings64 });

    type HistoryType = LayerHandlerResult<NumberProps>["history"];

    it("should place numbers", () => {
        const result = layer9.handleKeyDown({
            ...eventEssentials(),
            type: "keyDown",
            keypress: "1",
            points: ["id1", "id2"],
        });

        expect(result.history).toEqual<HistoryType>([
            { id: "id1", object: { point: "id1", state: "1" } },
            { id: "id2", object: { point: "id2", state: "1" } },
        ]);
    });

    it("should delete some numbers", () => {
        const stored: typeof EMPTY_STORED = {
            renderOrder: ["toDelete", "keep", "alsoDelete"],
            objects: {
                toDelete: { point: "toDelete", state: "1" },
                keep: { point: "keep", state: "5" },
                alsoDelete: { point: "alsoDelete", state: "3" },
            },
            extra: {},
        };

        const result = layer9.handleKeyDown({
            ...eventEssentials({ stored }),
            type: "delete",
            keypress: "Delete",
            points: ["toDelete", "alsoDelete"],
        });

        expect(result.history).toEqual<HistoryType>([
            { id: "toDelete", object: null },
            { id: "alsoDelete", object: null },
        ]);
    });

    it("should not delete objects when the number range increases", () => {
        const stored: LayerStorage<NumberProps> = {
            renderOrder: ["1,1", "2,2", "3,3"],
            objects: {
                "1,1": { point: "1,1", state: "0" },
                "2,2": { point: "2,2", state: "5" },
                "3,3": { point: "3,3", state: "9" },
            },
            extra: {},
        };

        const result = layer9.newSettings({
            ...eventEssentials({ stored }),
            newSettings: { max: 10, negatives: true },
        });
        expect(result?.history).toEqual([]);

        layer9.newSettings({ ...eventEssentials(), newSettings: settings9 });
    });

    it("should delete objects when the number range decreases", () => {
        const stored: LayerStorage<NumberProps> = {
            renderOrder: ["1,1", "2,2", "3,3", "4,4"],
            objects: {
                "1,1": { point: "1,1", state: "-10" },
                "2,2": { point: "2,2", state: "0" },
                "3,3": { point: "3,3", state: "5" },
                "4,4": { point: "4,4", state: "42" },
            },
            extra: {},
        };

        const result = layer64.newSettings({
            ...eventEssentials({ stored }),
            newSettings: { max: 7, negatives: false },
        });

        expect(result?.history).toEqual([
            { id: "1,1", object: null },
            { id: "4,4", object: null },
        ]);

        layer64.newSettings({ ...eventEssentials(), newSettings: settings9 });
    });
});
