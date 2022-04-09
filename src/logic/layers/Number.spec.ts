import { cloneDeep } from "lodash";
import { NumberLayer } from "./Number";

describe("Number Layer", () => {
    // Fake storage
    const START_STORED: {
        renderOrder: string[];
        objects: Record<string, any>;
    } = {
        renderOrder: [],
        objects: {},
    };
    let stored = cloneDeep(START_STORED);
    const storage = {
        getStored: () => stored,
    };

    // Fake grid
    const START_GRID: {
        convertIdAndPoints: (...args: any[]) => any;
    } = {
        convertIdAndPoints: ({ pointsToId, idToPoints }) => {
            if (pointsToId) {
                return pointsToId.join(";");
            } else {
                return idToPoints.split(";");
            }
        },
    };
    let grid = START_GRID;

    // Fake Date.now
    const START_TIME = 1649519000000;

    // Puzzle settings
    const puzzleSettings = { actionWindowMs: 600 };

    // Layer with numbers 1-9
    const settings1to9 = { min: 1, max: 9 };
    const layer1to9 = new NumberLayer();
    layer1to9.newSettings({
        newSettings: settings1to9,
        grid,
        storage,
        attachSelectionsHandler: jest.fn(),
    });

    // Layer with numbers -9 to 64
    const settings9to64 = { min: -9, max: 64 };
    const layer9to64 = new NumberLayer();
    layer9to64.newSettings({
        newSettings: settings9to64,
        grid: null,
        storage,
        attachSelectionsHandler: jest.fn(),
    });

    it("should place numbers", () => {
        stored = cloneDeep(START_STORED);

        const { history } = layer1to9.handleKeyDown({
            event: {
                points: ["id1", "id2"],
                key: "1",
                code: "Digit1",
            },
            grid,
            settings: puzzleSettings,
            storage,
        });
        expect(history).toMatchInlineSnapshot(`
            Array [
              Object {
                "id": "id1",
                "object": Object {
                  "point": "id1",
                  "state": "1",
                },
              },
              Object {
                "id": "id2",
                "object": Object {
                  "point": "id2",
                  "state": "1",
                },
              },
            ]
        `);
    });

    it("should delete some numbers", () => {
        stored = {
            renderOrder: ["toDelete", "keep", "alsoDelete"],
            objects: {
                toDelete: { point: "toDelete", state: "1" },
                keep: { point: "keep", state: "5" },
                alsoDelete: { point: "alsoDelete", state: "3" },
            },
        };

        const { history } = layer1to9.handleKeyDown({
            event: {
                points: ["toDelete", "alsoDelete"],
                key: "Delete",
                code: "Delete",
            },
            grid,
            settings: puzzleSettings,
            storage,
        });
        expect(history).toMatchInlineSnapshot(`
            Array [
              Object {
                "id": "toDelete",
                "object": null,
              },
              Object {
                "id": "alsoDelete",
                "object": null,
              },
            ]
        `);
    });

    it("should not delete objects when the number range increases", () => {
        stored = {
            renderOrder: ["1,1", "2,2", "3,3"],
            objects: {
                "1,1": { point: "1,1", state: "1" },
                "2,2": { point: "2,2", state: "5" },
                "3,3": { point: "3,3", state: "9" },
            },
        };

        const { history } = layer1to9.newSettings({
            newSettings: { min: -1, max: 10 },
            grid,
            storage,
            attachSelectionsHandler: jest.fn(),
        });
        expect(history).toMatchInlineSnapshot(`Array []`);

        layer1to9.newSettings({
            newSettings: settings1to9,
            grid,
            storage,
            attachSelectionsHandler: jest.fn(),
        });
    });

    it("should delete objects when the number range decreases", () => {
        stored = {
            renderOrder: ["1,1", "2,2", "3,3"],
            objects: {
                "1,1": { point: "1,1", state: "1" },
                "2,2": { point: "2,2", state: "5" },
                "3,3": { point: "3,3", state: "9" },
            },
        };

        const { history } = layer1to9.newSettings({
            newSettings: { min: 3, max: 7 },
            grid,
            storage,
            attachSelectionsHandler: jest.fn(),
        });
        expect(history).toMatchInlineSnapshot(`
            Array [
              Object {
                "id": "1,1",
                "object": null,
              },
              Object {
                "id": "3,3",
                "object": null,
              },
            ]
        `);

        layer1to9.newSettings({
            newSettings: settings1to9,
            grid,
            storage,
            attachSelectionsHandler: jest.fn(),
        });
    });

    it("should add a second digit when typed fast enough", () => {
        // Fake Date.now
        let fakeNow = START_TIME;
        const dateNowSpy = jest
            .spyOn(Date, "now")
            .mockImplementation(() => fakeNow);

        stored = {
            renderOrder: ["id"],
            objects: { id: { point: "id", state: "4" } },
            // INTERNALS!
            lastTime: Date.now(),
            lastIds: ["id"],
        } as typeof stored;
        fakeNow += 200;

        const { history } = layer9to64.handleKeyDown({
            event: { points: ["id"], key: "2", code: "Digit2" },
            grid,
            settings: puzzleSettings,
            storage,
        });
        expect(history).toMatchInlineSnapshot(`
            Array [
              Object {
                "id": "id",
                "object": Object {
                  "point": "id",
                  "state": "42",
                },
              },
            ]
        `);

        dateNowSpy.mockRestore();
    });

    it("should not add a second digit when not typed fast enough", () => {
        // Fake Date.now
        let fakeNow = START_TIME;
        const dateNowSpy = jest
            .spyOn(Date, "now")
            .mockImplementation(() => fakeNow);

        stored = {
            renderOrder: ["id"],
            objects: { id: { point: "id", state: "4" } },
            // INTERNALS!
            lastTime: Date.now(),
            lastIds: ["id"],
        } as typeof stored;
        fakeNow += 800;

        const { history } = layer9to64.handleKeyDown({
            event: { points: ["id"], key: "2", code: "Digit2" },
            grid,
            settings: puzzleSettings,
            storage,
        });
        expect(history).toMatchInlineSnapshot(`
            Array [
              Object {
                "id": "id",
                "object": Object {
                  "point": "id",
                  "state": "2",
                },
              },
            ]
        `);

        dateNowSpy.mockRestore();
    });

    it("should not add a second digit when the selection is not the same", () => {
        // Fake Date.now
        let fakeNow = START_TIME;
        const dateNowSpy = jest
            .spyOn(Date, "now")
            .mockImplementation(() => fakeNow);

        stored = {
            renderOrder: ["id", "id2"],
            objects: {
                id: { point: "id", state: "4" },
                id2: { point: "id2", state: "4" },
            },
            // INTERNALS!
            lastTime: Date.now(),
            lastIds: ["id", "id2"],
        } as typeof stored;
        fakeNow += 200;

        const { history } = layer9to64.handleKeyDown({
            event: { points: ["id", "id3"], key: "2", code: "Digit2" },
            grid,
            settings: puzzleSettings,
            storage,
        });
        expect(history).toMatchInlineSnapshot(`
            Array [
              Object {
                "id": "id",
                "object": Object {
                  "point": "id",
                  "state": "2",
                },
              },
              Object {
                "id": "id3",
                "object": Object {
                  "point": "id3",
                  "state": "2",
                },
              },
            ]
        `);

        dateNowSpy.mockRestore();
    });

    it("should not add a second digit when the numbers are not the same", () => {
        // Fake Date.now
        let fakeNow = START_TIME;
        const dateNowSpy = jest
            .spyOn(Date, "now")
            .mockImplementation(() => fakeNow);

        stored = {
            renderOrder: ["id", "id2"],
            objects: {
                id: { point: "id", state: "4" },
                id2: { point: "id2", state: "3" },
            },
            // INTERNALS!
            lastTime: Date.now(),
            lastIds: ["id", "id2"],
        } as typeof stored;
        fakeNow += 200;

        const { history } = layer9to64.handleKeyDown({
            event: { points: ["id", "id2"], key: "2", code: "Digit2" },
            grid,
            settings: puzzleSettings,
            storage,
        });
        expect(history).toMatchInlineSnapshot(`
            Array [
              Object {
                "id": "id",
                "object": Object {
                  "point": "id",
                  "state": "2",
                },
              },
              Object {
                "id": "id2",
                "object": Object {
                  "point": "id2",
                  "state": "2",
                },
              },
            ]
        `);

        dateNowSpy.mockRestore();
    });

    it.todo("should understand single-digit hexadecimal");

    it.todo("should not understand multi-digit hexadecimal");

    it.todo("should have some tests with negative numbers and such");
});
