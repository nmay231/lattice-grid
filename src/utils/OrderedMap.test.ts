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

    it.each(orderedAndIndexed)("adds items before the specified key", (newMap) => {
        // Given a map with one item
        const map = newMap();
        map.set("a", 1);
        expect(map.order).toEqual(["a"]);

        // You can add a key before another key
        map.set("b", 1, "a");
        expect(map.order).toEqual(["b", "a"]);

        map.set("c", 1, "a");
        expect(map.order).toEqual(["b", "c", "a"]);

        map.set("d", 1, "b");
        expect(map.order).toEqual(["d", "b", "c", "a"]);

        // Inserting before a nonexistent key puts the item at the end
        map.set("e", 1, "z");
        expect(map.order).toEqual(["d", "b", "c", "a", "e"]);

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

    it.each(orderedAndIndexed)("adds existing items before the specified key", (newMap) => {
        // Given a map with some items
        const map = newMap();
        map.set("a", 1);
        map.set("b", 1);
        map.set("c", 1);

        map.set("c", 2, "b");
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

        map.set("c", 4, "b");
        expect(map.entries()).toEqual([
            ["c", 4],
            ["b", 1],
            ["a", 3],
        ]);
    });

    it("treats added keys equal to nextKey as if nextKey was unspecified", () => {
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

        expect(map).toMatchObject({ map: {}, order: [] });
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

    // TODO: Old tests from the bi-gone eras, kept as a reminder of what remains to be done
    // TODO: I guess it depends on if I want IndexedOrderedMap to have the logic of tabbing forward and backward, or not
    // TODO: I don't really need it as much since I now let the browser actually tab forwards and backwards through the elements.

    /*
    // it("tabs forward through layers", () => {
    //     const { state, addLayer, selectLayer } = createLayersState();

    //     for (const id of fullState.order) {
    //         addLayer({ ...fullState.map[id] });
    //     }

    //     const ids = [
    //         "layer4", // Initial
    //         "layer1", // Wrap from the end to the beginning
    //         "layer3", // Skip the second ethereal layer
    //         "layer4", // Tab forward one layer
    //     ];

    //     for (const id of ids) {
    //         expect(state.currentKey).toEqual(id);
    //         selectLayer({ tab: 1 });
    //     }
    // });

    // it("tabs backward through layers", () => {
    //     const { state, addLayer, selectLayer } = createLayersState();

    //     for (const id of fullState.order) {
    //         addLayer({ ...fullState.map[id] });
    //     }

    //     const ids = [
    //         "layer4", // Initial
    //         "layer3", // Tab backward one layer
    //         "layer1", // Skip the ethereal 2 layer
    //         "layer4", // Wrap from the beginning to the end
    //     ];

    //     for (const id of ids) {
    //         expect(state.currentKey).toEqual(id);
    //         selectLayer({ tab: -1 });
    //     }
    // });

    // it("selects a new layer by id", () => {
    //     const { state, addLayer, selectLayer } = createLayersState();

    //     for (const id of fullState.order) {
    //         addLayer({ ...fullState.map[id] });
    //     }

    //     expect(state.currentKey).toEqual("layer4");
    //     selectLayer({ id: "layer1" });
    //     expect(state.currentKey).toEqual("layer1");
    //     // Should throw error since layer is ethereal
    //     expect(() => selectLayer({ id: "layer2" })).toThrow();
    //     expect(state.currentKey).toEqual("layer1");
    // });

    // it("removes a layer that is not selected", () => {
    //     const { state, addLayer, selectLayer, removeLayer } = createLayersState();

    //     for (const id of fullState.order) {
    //         addLayer({ ...fullState.map[id] });
    //     }
    //     // Select a layer and remove a layer before it
    //     selectLayer({ id: "layer3" });
    //     removeLayer("layer2");

    //     // eslint-disable-next-line @typescript-eslint/no-unused-vars
    //     const { layer2, ...layers } = fullState.map;
    //     expect(state).toEqual<LayersProxyState>({
    //         order: [fullState.order[0], fullState.order[2], fullState.order[3]],
    //         map: layers,
    //         // Removing a different layer should not change the current layer
    //         currentKey: "layer3",
    //     });
    // });

    // it("selects the next layer if the current is removed", () => {
    //     const { state, addLayer, selectLayer, removeLayer } = createLayersState();

    //     for (const id of fullState.order) {
    //         addLayer({ ...fullState.map[id] });
    //     }
    //     // Select a layer and remove a layer before it
    //     selectLayer({ id: "layer1" });

    //     expect(state.currentKey).toEqual("layer1");
    //     removeLayer("layer1");
    //     // Removing the layer should select the next non-ethereal layer
    //     expect(state.currentKey).toEqual("layer3");
    // });

    // it("selects the next layer if the current is removed and there is none after", () => {
    //     const { state, addLayer, removeLayer } = createLayersState();

    //     // Skip the fourth layer
    //     for (const id of fullState.order.slice(0, 3)) {
    //         addLayer({ ...fullState.map[id] });
    //     }

    //     expect(state.currentKey).toEqual("layer3");
    //     removeLayer("layer3");
    //     // Removing the layer should select the next non-ethereal layer
    //     expect(state.currentKey).toEqual("layer1");
    // });

    // it("does not select an ethereal layer when adding it", () => {
    //     const { state, addLayer } = createLayersState();

    //     // The last layer added is ethereal
    //     for (const id of fullState.order.slice(0, 2)) {
    //         addLayer({ ...fullState.map[id] });
    //     }

    //     expect(state).toEqual<LayersProxyState>({
    //         order: fullState.order.slice(0, 2),
    //         map: { layer1: fullState.map.layer1, layer2: fullState.map.layer2 },
    //         currentKey: "layer1",
    //     });
    // });
    */
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

    it("treats added keys equal to nextKey as if nextKey was unspecified", () => {
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
