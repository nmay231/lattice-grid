import { LayerStorage } from "../LayerStorage";
import { HistoryAction, LayerHandlerResult, StorageFilter } from "../types";
import { IndexedOrderedMap } from "../utils/OrderedMap";
import { layerEventEssentials } from "../utils/testing/layerEventEssentials";
import { NumberLayer, NumberProps } from "./Number";

describe("Number Layer", () => {
    type Arg = {
        stored?: LayerStorage<NumberProps>;
        settings?: Partial<Omit<NumberProps["Settings"], "_numberTyper">>;
    };
    const getNumberLayer = ({ stored, settings } = {} as Arg) => {
        const layer = NumberLayer.create({ layers: new IndexedOrderedMap() });
        const essentials = layerEventEssentials({ stored });

        let oldSettings: NumberProps["Settings"] | undefined = undefined;
        layer.updateSettings({ ...essentials, puzzleSettings: essentials.settings, oldSettings });

        if (settings) {
            oldSettings = layer.settings;
            Object.assign(layer.settings, settings);
            layer.updateSettings({
                ...essentials,
                puzzleSettings: essentials.settings,
                oldSettings,
            });
        }

        return layer;
    };

    type HistoryType = LayerHandlerResult<NumberProps>["history"];

    it("places numbers", () => {
        const layer9 = getNumberLayer({ settings: { currentCharacter: "1" } });
        const result = layer9.handleKeyDown({
            ...layerEventEssentials(),
            points: ["id1", "id2"],
        });

        expect(result.history).toEqual<HistoryType>([
            { id: "id1", object: { state: "1" } },
            { id: "id2", object: { state: "1" } },
        ]);
    });

    it("deletes some numbers", () => {
        const stored = new LayerStorage<NumberProps>();
        const layer9 = getNumberLayer({ stored, settings: { currentCharacter: null } });
        stored.setEntries("question", [
            ["toDelete", { state: "1" }],
            ["keep", { state: "5" }],
            ["alsoDelete", { state: "3" }],
        ]);

        const result = layer9.handleKeyDown({
            ...layerEventEssentials({ stored }),
            points: ["toDelete", "alsoDelete"],
        });

        expect(result.history).toEqual<HistoryType>([
            { id: "toDelete", object: null },
            { id: "alsoDelete", object: null },
        ]);
    });

    it("does not delete objects when the number range increases", () => {
        const stored = new LayerStorage<NumberProps>();
        const layer9 = getNumberLayer({ stored });
        stored.setEntries("question", [
            ["1,1", { state: "5" }],
            ["2,2", { state: "9" }],
            ["3,3", { state: "0" }],
        ]);

        const oldSettings = { ...layer9.settings };
        Object.assign(layer9.settings, { max: 10, negatives: true });
        const essentials = layerEventEssentials({ stored });
        layer9.updateSettings({
            ...essentials,
            puzzleSettings: essentials.settings,
            oldSettings,
        });

        const actions = stored.entries("question").map(
            ([objectId, object]) =>
                ({
                    layerId: layer9.id,
                    objectId,
                    object,
                    prevObjectId: null,
                    storageMode: "question",
                }) satisfies HistoryAction<NumberProps>,
        );

        const puzzle = layerEventEssentials();
        expect(actions.map((action) => layer9.filterNumbersOutOfRange(puzzle, action))).toEqual<
            ReturnType<StorageFilter>[]
        >([{ keep: true }, { keep: true }, { keep: true }]);
    });

    it("deletes objects when the number range decreases", () => {
        const stored = new LayerStorage<NumberProps>();
        const layer64 = getNumberLayer({ settings: { max: 64, negatives: true }, stored });
        stored.setEntries("question", [
            ["1,1", { state: "-10" }],
            ["2,2", { state: "0" }],
            ["3,3", { state: "5" }],
            ["4,4", { state: "42" }],
        ]);

        const oldSettings = { ...layer64.settings };
        Object.assign(layer64.settings, { max: 7, negatives: false });
        const essentials = layerEventEssentials({ stored });
        layer64.updateSettings({
            ...essentials,
            puzzleSettings: essentials.settings,
            oldSettings,
        });

        const actions = stored.entries("question").map(
            ([objectId, object]) =>
                ({
                    layerId: layer64.id,
                    objectId,
                    object,
                    prevObjectId: null,
                    storageMode: "question",
                }) satisfies HistoryAction<NumberProps>,
        );

        const puzzle = layerEventEssentials();
        expect(actions.map((action) => layer64.filterNumbersOutOfRange(puzzle, action))).toEqual<
            ReturnType<StorageFilter>[]
        >([{ keep: false }, { keep: true }, { keep: true }, { keep: false }]);
    });

    // TODO: Not implemented, might never be honestly.
    it.todo("does not delete objects when the range is infinite (max = -1)");
});
