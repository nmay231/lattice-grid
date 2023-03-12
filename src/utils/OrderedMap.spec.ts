import "./OrderedMap";
import { OrderedMap } from "./OrderedMap";

// TODO: Split this test suite into three groups: OrderedMap only, IndexedOrderedMap only, and both.
/*
describe.each([
    ["OrderedMap", () => new OrderedMap()],
    ["IndexedOrderedMap (always selectable)", () => new IndexedOrderedMap(() => true)],
    ["IndexedOrderedMap (sometimes selectable)", () => new IndexedOrderedMap<number>(x => x % 2 === 0)],
])
*/

describe("OrderedMap", () => {
    it.todo(
        "what does map.set(key, val, key) do (with and without key present in map)? It's undefined behavior, but might happen if there is a bug elsewhere",
    );

    it("initializes", () => {
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

    it("adds items before the specified key", () => {
        // Given a map with one item
        const map = new OrderedMap();
        map.set("a", 1);
        expect(map.order).toEqual(["a"]);

        // You can add a key before another key
        map.set("b", 1, "a");
        expect(map.order).toEqual(["b", "a"]);

        map.set("c", 1, "a");
        expect(map.order).toEqual(["b", "c", "a"]);

        map.set("d", 1, "b");
        expect(map.order).toEqual(["d", "b", "c", "a"]);

        // Inserting before a nonexistent key put the item at the end
        map.set("e", 1, "z");
        expect(map.order).toEqual(["d", "b", "c", "a", "e"]);
    });

    it("adds existing items", () => {
        // Given a map with some items
        const map = new OrderedMap();
        map.set("a", 1);
        map.set("b", 1);
        map.set("c", 1);

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

    it("adds existing items before the specified key", () => {
        // Given a map with some items
        const map = new OrderedMap();
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

    it("supports has, get, keys, values, and entries", () => {
        const map = new OrderedMap<number>();

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

    it("clears all items", () => {
        const map = new OrderedMap<number>();

        map.set("z", 1);
        map.set("a", 2);
        map.set("d", 3);

        map.clear();

        expect(map).toEqual({ map: {}, order: [] });
    });

    // TODO: Old tests from the bi-gone eras, kept as a reminder of what remains to be done

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
});
