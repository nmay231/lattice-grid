import { LayerHandlerResult, LayerStorage, NeedsUpdating } from "../../types";
import { getEventEssentials, GetEventEssentialsArg } from "../../utils/testUtils";
import { NumberLayer, NumberProps } from "./Number";

describe("Number Layer", () => {
    const eventEssentials = (arg: GetEventEssentialsArg<NumberProps> = {}) =>
        getEventEssentials(arg);

    const EMPTY_STORED: LayerStorage<NumberProps> = {
        renderOrder: [],
        objects: {},
        extra: {},
    };

    // Used to fake Date.now
    const START_TIME = 1649519000000;
    const attachSelectionHandler = jest.fn();

    // Layer with numbers 1-9
    const settings1to9 = { min: 1, max: 9 };
    const layer1to9 = NumberLayer.create({ layers: {} } as NeedsUpdating) as NumberLayer;
    layer1to9.newSettings({
        ...eventEssentials(),
        newSettings: settings1to9,
        attachSelectionHandler,
    });

    // Layer with numbers -9 to 64
    const settingsN9to64 = { min: -9, max: 64 };
    const layerN9to64 = NumberLayer.create({ layers: {} } as NeedsUpdating) as NumberLayer;
    layerN9to64.newSettings({
        ...eventEssentials(),
        newSettings: settingsN9to64,
        attachSelectionHandler,
    });

    it("should place numbers", () => {
        const result = layer1to9.handleKeyDown({
            ...eventEssentials(),
            type: "keyDown",
            keypress: "1",
            points: ["id1", "id2"],
        });

        expect(result.history).toEqual<LayerHandlerResult["history"]>([
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

        const result = layer1to9.handleKeyDown({
            ...eventEssentials({ stored }),
            type: "delete",
            keypress: "Delete",
            points: ["toDelete", "alsoDelete"],
        });

        expect(result.history).toEqual<LayerHandlerResult["history"]>([
            { id: "toDelete", object: null },
            { id: "alsoDelete", object: null },
        ]);
    });

    it("should not delete objects when the number range increases", () => {
        const stored: LayerStorage<NumberProps> = {
            renderOrder: ["1,1", "2,2", "3,3"],
            objects: {
                "1,1": { point: "1,1", state: "1" },
                "2,2": { point: "2,2", state: "5" },
                "3,3": { point: "3,3", state: "9" },
            },
            extra: {},
        };

        const result = layer1to9.newSettings({
            ...eventEssentials({ stored }),
            newSettings: { min: -1, max: 10 },
            attachSelectionHandler,
        });
        expect(result?.history).toEqual([]);

        layer1to9.newSettings({
            ...eventEssentials(),
            newSettings: settings1to9,
            attachSelectionHandler,
        });
    });

    it("should delete objects when the number range decreases", () => {
        const stored: LayerStorage<NumberProps> = {
            renderOrder: ["1,1", "2,2", "3,3"],
            objects: {
                "1,1": { point: "1,1", state: "1" },
                "2,2": { point: "2,2", state: "5" },
                "3,3": { point: "3,3", state: "9" },
            },
            extra: {},
        };

        const result = layer1to9.newSettings({
            ...eventEssentials({ stored }),
            newSettings: { min: 3, max: 7 },
            attachSelectionHandler,
        });

        expect(result?.history).toEqual([
            { id: "1,1", object: null },
            { id: "3,3", object: null },
        ]);

        layer1to9.newSettings({
            ...eventEssentials(),
            newSettings: settings1to9,
            attachSelectionHandler,
        });
    });

    it("should add a second digit when typed fast enough", () => {
        // Fake Date.now
        let fakeNow = START_TIME;
        const dateNowSpy = jest.spyOn(Date, "now").mockImplementation(() => fakeNow);

        const stored: LayerStorage<NumberProps> = {
            renderOrder: ["id"],
            objects: { id: { point: "id", state: "4" } },
            extra: {
                // TODO: This test depends on internals and should eventually be modified so it doesn't
                lastTime: Date.now(),
                lastIds: ["id"],
            },
        };
        fakeNow += 200;

        const result = layerN9to64.handleKeyDown({
            ...eventEssentials({ stored }),
            type: "keyDown",
            keypress: "2",
            points: ["id"],
        });
        expect(result.history).toEqual<LayerHandlerResult["history"]>([
            { id: "id", object: { point: "id", state: "42" } },
        ]);

        dateNowSpy.mockRestore();
    });

    it("should not add a second digit when not typed fast enough", () => {
        // Fake Date.now
        let fakeNow = START_TIME;
        const dateNowSpy = jest.spyOn(Date, "now").mockImplementation(() => fakeNow);

        const stored: LayerStorage<NumberProps> = {
            renderOrder: ["id"],
            objects: { id: { point: "id", state: "4" } },
            extra: {
                // TODO: INTERNALS!
                lastTime: Date.now(),
                lastIds: ["id"],
            },
        };
        fakeNow += 800;

        const result = layerN9to64.handleKeyDown({
            ...eventEssentials({ stored }),
            type: "keyDown",
            keypress: "2",
            points: ["id"],
        });
        expect(result.history).toEqual<LayerHandlerResult["history"]>([
            { id: "id", object: { point: "id", state: "2" } },
        ]);

        dateNowSpy.mockRestore();
    });

    it("should not add a second digit when the selection is not the same", () => {
        // Fake Date.now
        let fakeNow = START_TIME;
        const dateNowSpy = jest.spyOn(Date, "now").mockImplementation(() => fakeNow);

        const stored: LayerStorage<NumberProps> = {
            renderOrder: ["id", "id2"],
            objects: {
                id: { point: "id", state: "4" },
                id2: { point: "id2", state: "4" },
            },
            extra: {
                // TODO: INTERNALS!
                lastTime: Date.now(),
                lastIds: ["id", "id2"],
            },
        };
        fakeNow += 200;

        const result = layerN9to64.handleKeyDown({
            ...eventEssentials({ stored }),
            type: "keyDown",
            keypress: "2",
            points: ["id", "id3"],
        });

        expect(result.history).toEqual<LayerHandlerResult["history"]>([
            { id: "id", object: { point: "id", state: "2" } },
            { id: "id3", object: { point: "id3", state: "2" } },
        ]);

        dateNowSpy.mockRestore();
    });

    it("should not add a second digit when the numbers are not the same", () => {
        // Fake Date.now
        let fakeNow = START_TIME;
        const dateNowSpy = jest.spyOn(Date, "now").mockImplementation(() => fakeNow);

        const stored: LayerStorage<NumberProps> = {
            renderOrder: ["id", "id2"],
            objects: {
                id: { point: "id", state: "4" },
                id2: { point: "id2", state: "3" },
            },
            extra: {
                // INTERNALS!
                lastTime: Date.now(),
                lastIds: ["id", "id2"],
            },
        };
        fakeNow += 200;

        const result = layerN9to64.handleKeyDown({
            ...eventEssentials({ stored }),
            type: "keyDown",
            keypress: "2",
            points: ["id", "id2"],
        });

        expect(result.history).toEqual<LayerHandlerResult["history"]>([
            { id: "id", object: { point: "id", state: "2" } },
            { id: "id2", object: { point: "id2", state: "2" } },
        ]);

        dateNowSpy.mockRestore();
    });

    it.todo("should understand single-digit hexadecimal");

    it.todo("should not understand multi-digit hexadecimal");

    it.todo("should have some tests with negative numbers and such");
});
