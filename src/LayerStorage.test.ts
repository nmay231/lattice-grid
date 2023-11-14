import { LayerStorage } from "./LayerStorage";

describe("LayerStorage", () => {
    it("initializes empty", () => {
        // Given a new LayerStorage
        const storage = new LayerStorage();

        // all groups start empty
        expect(storage.entries("answer")).toEqual([]);
        expect(storage.entries("question")).toEqual([]);
        expect(storage.entries("ui")).toEqual([]);
    });

    it("sets new entries", () => {
        // Given a new LayerStorage
        const storage = new LayerStorage();

        // When entries are added
        storage.setEntries("question", [
            ["b", { a: false }],
            ["a", { a: true }],
        ]);

        // They are set and nothing else is
        expect(storage.entries("question")).toEqual([
            ["b", { a: false }],
            ["a", { a: true }],
        ]);
        expect(storage.entries("answer")).toEqual([]);
        expect(storage.entries("ui")).toEqual([]);
    });

    it("overrides entries for an existing group", () => {
        // Given a new LayerStorage with some entries
        const storage = new LayerStorage();
        storage.setEntries("answer", [
            ["b", { a: false }],
            ["a", { a: true }],
        ]);
        storage.setEntries("question", [
            ["c", { c: true }],
            ["d", { c: false }],
        ]);

        // When some entries are changed
        storage.setEntries("question", [
            ["e", { c: false }],
            ["d", { c: false }],
        ]);

        // That group is set and nothing else is
        expect(storage.entries("question")).toEqual([
            ["e", { c: false }],
            ["d", { c: false }],
        ]);
        expect(storage.entries("answer")).toEqual([
            ["b", { a: false }],
            ["a", { a: true }],
        ]);
        expect(storage.entries("ui")).toEqual([]);
    });

    it("clears objects of a group", () => {
        // Given a new LayerStorage with some entries
        const storage = new LayerStorage();
        storage.setEntries("answer", [
            ["b", { a: false }],
            ["a", { a: true }],
        ]);
        storage.setEntries("question", [
            ["c", { c: true }],
            ["d", { c: false }],
        ]);

        // When that group is cleared
        storage.clearGroup("answer");

        // Only that group is cleared
        expect(storage.entries("answer")).toEqual([]);
        expect(storage.entries("question")).toEqual([
            ["c", { c: true }],
            ["d", { c: false }],
        ]);
    });

    it("can add a new object in the middle of existing ones", () => {
        // Given a layer
        const storage = new LayerStorage();
        storage.setEntries("question", [
            ["first", { a: 1 }],
            ["second", { a: 2 }],
            ["another one", { a: 3 }],
        ]);

        // When a new object is added in the middle
        storage.setObject("question", "middle", { a: 4 }, "second");

        expect(storage.entries("question")).toEqual([
            ["first", { a: 1 }],
            ["second", { a: 2 }],
            ["middle", { a: 4 }],
            ["another one", { a: 3 }],
        ]);
    });
});
