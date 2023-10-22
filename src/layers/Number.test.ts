import { LayerStorage } from "../LayerStorage";
import { LayerHandlerResult } from "../types";
import { IndexedOrderedMap } from "../utils/OrderedMap";
import { layerEventEssentials } from "../utils/testing/layerEventEssentials";
import { NumberLayer, NumberProps } from "./Number";

describe("Number Layer", () => {
    // Layer with numbers 0-9
    const settings9 = { max: 9, negatives: false };
    const layer9 = NumberLayer.create({ layers: new IndexedOrderedMap() });
    layer9.newSettings({ ...layerEventEssentials(), newSettings: settings9 });

    // Layer with numbers -64 to 64
    const settings64 = { max: 64, negatives: true };
    const layer64 = NumberLayer.create({ layers: new IndexedOrderedMap() });
    layer64.newSettings({ ...layerEventEssentials(), newSettings: settings64 });

    type HistoryType = LayerHandlerResult<NumberProps>["history"];

    it("places numbers", () => {
        const result = layer9.handleKeyDown({
            ...layerEventEssentials(),
            type: "keyDown",
            keypress: "1",
            points: ["id1", "id2"],
        });

        expect(result.history).toEqual<HistoryType>([
            { id: "id1", object: { state: "1" } },
            { id: "id2", object: { state: "1" } },
        ]);
    });

    it("deletes some numbers", () => {
        const stored = new LayerStorage<NumberProps>();
        stored.setEntries("question", [
            ["toDelete", { state: "1" }],
            ["keep", { state: "5" }],
            ["alsoDelete", { state: "3" }],
        ]);

        const result = layer9.handleKeyDown({
            ...layerEventEssentials({ stored }),
            type: "delete",
            keypress: "Delete",
            points: ["toDelete", "alsoDelete"],
        });

        expect(result.history).toEqual<HistoryType>([
            { id: "toDelete", object: null },
            { id: "alsoDelete", object: null },
        ]);
    });

    it("does not delete objects when the number range increases", () => {
        const stored = new LayerStorage<NumberProps>();
        stored.setEntries("question", [
            ["1,1", { state: "5" }],
            ["2,2", { state: "9" }],
            ["3,3", { state: "0" }],
        ]);

        const result = layer9.newSettings({
            ...layerEventEssentials({ stored }),
            newSettings: { max: 10, negatives: true },
        });
        expect(result.history).toEqual<HistoryType>([]);

        layer9.newSettings({ ...layerEventEssentials(), newSettings: settings9 });
    });

    it("deletes objects when the number range decreases", () => {
        const stored = new LayerStorage<NumberProps>();
        stored.setEntries("question", [
            ["1,1", { state: "-10" }],
            ["2,2", { state: "0" }],
            ["3,3", { state: "5" }],
            ["4,4", { state: "42" }],
        ]);

        const result = layer64.newSettings({
            ...layerEventEssentials({ stored }),
            newSettings: { max: 7, negatives: false },
        });

        expect(result.history).toEqual<HistoryType>([
            { id: "1,1", object: null },
            { id: "4,4", object: null },
        ]);

        layer64.newSettings({ ...layerEventEssentials(), newSettings: settings9 });
    });

    // TODO: Not implemented, might never be honestly.
    it.todo("does not delete objects when the range is infinite (max = -1)");
});
