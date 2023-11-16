import { IndexedOrderedMap, OrderedMap } from "./OrderedMap";

describe("OrderedMap", () => {
    const orderedAndIndexed = [
        () => new OrderedMap<number>(),
        () => new IndexedOrderedMap<number>(),
    ];

    it("initializes", () => {
        // Mostly a reminder to update tests if new internal state is added
        expect(new OrderedMap<number>()).toEqual({
            map: {},
            order: [],
        });
    });

    it("adds multiple items simply", () => {
        const map = new OrderedMap<number>();

        map.set("z", 1);
        map.set("a", 2);
        map.set("d", 3);

        expect(map).toEqual({
            map: { a: 2, d: 3, z: 1 },
            order: ["z", "a", "d"],
        });
    });

    it("deletes items", () => {
        const map = new OrderedMap<number>();

        map.set("a", 1);
        map.set("b", 2);
        map.set("c", 3);
        map.set("d", 4);
        map.set("e", 5);
        map.set("f", 6);
        map.set("g", 7);

        map.delete("g");
        expect(map).toEqual({
            map: { a: 1, b: 2, c: 3, d: 4, e: 5, f: 6 },
            order: ["a", "b", "c", "d", "e", "f"],
        });

        map.delete("a");
        expect(map).toEqual({
            map: { b: 2, c: 3, d: 4, e: 5, f: 6 },
            order: ["b", "c", "d", "e", "f"],
        });

        map.delete("d");
        expect(map).toEqual({
            map: { b: 2, c: 3, e: 5, f: 6 },
            order: ["b", "c", "e", "f"],
        });

        map.delete("z");
        expect(map).toEqual({
            map: { b: 2, c: 3, e: 5, f: 6 },
            order: ["b", "c", "e", "f"],
        });
    });

    it.each(orderedAndIndexed)("adds items after the specified key", (newMap) => {
        // Given a map with one item
        const map = newMap();
        map.set("a", 1);
        expect(map.order).toEqual(["a"]);

        // You can add a key after another key
        map.set("b", 1, "a");
        expect(map.order).toEqual(["a", "b"]);

        map.set("c", 1, "a");
        expect(map.order).toEqual(["a", "c", "b"]);

        map.set("d", 1, "c");
        expect(map.order).toEqual(["a", "c", "d", "b"]);

        // Inserting after a nonexistent key puts the item at the end
        map.set("e", 1, "z");
        expect(map.order).toEqual(["a", "c", "d", "b", "e"]);

        if (map instanceof IndexedOrderedMap) {
            expect(map.currentKey).toBe(null);
        }
    });

    it.each(orderedAndIndexed)("adds existing items", (newMap) => {
        // Given a map with some items
        const map = newMap();
        map.set("a", 1);
        map.set("b", 1);
        map.set("c", 1);
        expect(map.entries()).toEqual([
            ["a", 1],
            ["b", 1],
            ["c", 1],
        ]);

        map.set("c", 2);
        expect(map.entries()).toEqual([
            ["a", 1],
            ["b", 1],
            ["c", 2],
        ]);

        map.set("a", 3);
        expect(map.entries()).toEqual([
            ["b", 1],
            ["c", 2],
            ["a", 3],
        ]);
    });

    it.each(orderedAndIndexed)("adds existing items after the specified key", (newMap) => {
        // Given a map with some items
        const map = newMap();
        map.set("a", 1);
        map.set("b", 1);
        map.set("c", 1);

        map.set("c", 2, "a");
        expect(map.entries()).toEqual([
            ["a", 1],
            ["c", 2],
            ["b", 1],
        ]);

        map.set("a", 3, "z");
        expect(map.entries()).toEqual([
            ["c", 2],
            ["b", 1],
            ["a", 3],
        ]);

        map.set("b", 4, "c");
        expect(map.entries()).toEqual([
            ["c", 2],
            ["b", 4],
            ["a", 3],
        ]);
    });

    it("treats added keys equal to prevKey as if prevKey was unspecified", () => {
        // Given a map with some items
        const map = new OrderedMap<number>();
        map.set("a", 1);
        map.set("b", 1);

        map.set("c", 2, "c");
        expect(map.entries()).toEqual([
            ["a", 1],
            ["b", 1],
            ["c", 2],
        ]);

        map.set("c", 3, "c");
        expect(map.entries()).toEqual([
            ["a", 1],
            ["b", 1],
            ["c", 3],
        ]);

        map.set("a", 4, "a");
        expect(map.entries()).toEqual([
            ["b", 1],
            ["c", 3],
            ["a", 4],
        ]);
    });

    it.each(orderedAndIndexed)("supports has, get, keys, values, and entries", (newMap) => {
        const map = newMap();

        map.set("z", 1);
        map.set("a", 2);
        map.set("d", 3);

        expect(map.has("a")).toBe(true);
        expect(map.has("c")).toBe(false);

        expect(map.get("a")).toBe(2);
        expect(map.get("c")).toBe(undefined);

        expect(map.keys()).toEqual(["z", "a", "d"]);
        expect(map.values()).toEqual([1, 2, 3]);
        expect(map.entries()).toEqual([
            ["z", 1],
            ["a", 2],
            ["d", 3],
        ]);
    });

    it.each(orderedAndIndexed)("clears all items", (newMap) => {
        const map = newMap();

        map.set("z", 1);
        map.set("a", 2);
        map.set("d", 3);

        map.clear();

        expect([...map.entries()]).toEqual([]);
    });

    it.each(orderedAndIndexed)("gets the first and last key", (newMap) => {
        const map = newMap();

        map.set("a", 1);
        map.set("b", 2);
        map.set("c", 3);

        expect(map.getFirstKey()).toEqual("a");
        expect(map.getLastKey()).toEqual("c");

        expect(newMap().getFirstKey()).toEqual(null);
        expect(newMap().getLastKey()).toEqual(null);
    });
});

describe("IndexedOrderedMap", () => {
    it("initializes", () => {
        // Mostly a reminder to update tests if new internal state is added
        const selectable = () => true;
        expect(new IndexedOrderedMap<number>(selectable)).toEqual({
            currentKey: null,
            map: {},
            order: [],
            selectable,
        });
    });

    it("adds multiple items simply", () => {
        const map = new IndexedOrderedMap<number>();

        map.set("z", 1);
        map.set("a", 2);
        map.set("d", 3);

        expect(map).toMatchObject({
            currentKey: null,
            map: { a: 2, d: 3, z: 1 },
            order: ["z", "a", "d"],
        });
    });

    it("selects items if they exist", () => {
        const map = new IndexedOrderedMap<number>();

        map.set("z", 1);
        map.set("a", 2);
        map.set("d", 3);
        expect(map.select("z")).toBe(true);

        expect(map).toMatchObject({
            currentKey: "z",
            map: { a: 2, d: 3, z: 1 },
            order: ["z", "a", "d"],
        });
        expect(map.select("d")).toBe(true);
        expect(map.currentKey).toBe("d");

        expect(map.select("asdf")).toBe(false);
        expect(map.currentKey).toBe("d");
    });

    it("deletes items with some selected", () => {
        const map = new IndexedOrderedMap<number>();

        map.set("a", 1);
        map.set("b", 2);
        map.set("c", 3);
        map.set("d", 4);
        map.set("e", 5);
        map.set("f", 6);
        map.set("g", 7);

        map.delete("g");
        expect(map).toMatchObject({
            currentKey: null,
            map: { a: 1, b: 2, c: 3, d: 4, e: 5, f: 6 },
            order: ["a", "b", "c", "d", "e", "f"],
        });

        expect(map.select("a")).toBe(true);
        expect(map.currentKey).toBe("a");
        map.delete("a");
        expect(map).toMatchObject({
            currentKey: null,
            map: { b: 2, c: 3, d: 4, e: 5, f: 6 },
            order: ["b", "c", "d", "e", "f"],
        });

        expect(map.select("f")).toBe(true);
        map.delete("d");
        expect(map).toMatchObject({
            currentKey: "f",
            map: { b: 2, c: 3, e: 5, f: 6 },
            order: ["b", "c", "e", "f"],
        });

        map.delete("z");
        expect(map).toMatchObject({
            currentKey: "f",
            map: { b: 2, c: 3, e: 5, f: 6 },
            order: ["b", "c", "e", "f"],
        });
    });

    it("treats added keys equal to prevKey as if prevKey was unspecified", () => {
        // Given a map with some items
        const map = new IndexedOrderedMap<number>();
        map.set("a", 1);
        map.set("b", 3);
        map.set("c", 2, "c");

        expect(map.entries()).toEqual([
            ["a", 1],
            ["b", 3],
            ["c", 2],
        ]);
        expect(map.select("c")).toBe(true);
        expect(map.currentKey).toBe("c");

        map.set("c", 4, "c");
        // TODO: I guess I should keep it selected, but I'm not certain... It's more undefined behavior, because this is uncommon in the first place
        expect(map.currentKey).toBe("c");
        expect(map.entries()).toEqual([
            ["a", 1],
            ["b", 3],
            ["c", 4],
        ]);

        map.set("a", 5, "a");
        expect(map.currentKey).toBe("c");
        expect(map.entries()).toEqual([
            ["b", 3],
            ["c", 4],
            ["a", 5],
        ]);
    });

    it("gets first and last selectable keys", () => {
        const map = new IndexedOrderedMap<number>();

        map.set("d", 3);
        map.set("z", 2);
        map.set("a", 4);
        map.set("y", 1);

        expect(map.getFirstSelectableKey()).toBe("d");
        expect(map.getLastSelectableKey()).toBe("y");

        map.selectable = (x) => x % 2 === 0;
        expect(map.getFirstSelectableKey()).toBe("z");
        expect(map.getLastSelectableKey()).toBe("a");
    });
});
