import { PuzzleManager } from "./PuzzleManager";

// I think this is completely useless because I will switch to focus-based layer selection

describe.skip("puzzle layers", () => {
    PuzzleManager;
    // const fullState: LayersProxyState = {
    //     map: {},
    //     order: [],
    //     currentKey: "layer4",
    // };
    // for (let i = 1; i <= 4; i++) {
    //     const L = { id: `layer${i}`, displayName: `Layer${i}`, type: `type${i}`, ethereal: false };
    //     fullState.map[L.id] = L;
    //     fullState.order.push(L.id);
    // }
    // fullState.map["layer2"].ethereal = true;

    // it("should start with the correct state", () => {
    //     const { state } = createLayersState();
    //     expect(state).toEqual<LayersProxyState>({ currentKey: null, map: {}, order: [] });
    // });

    // it("should add multiple layers normally", () => {
    //     const { state, addLayer } = createLayersState();

    //     for (const id of fullState.order) {
    //         addLayer({ ...fullState.map[id] });
    //     }

    //     expect(state).toEqual<LayersProxyState>(fullState);
    // });

    // it("should reorder layers", () => {
    //     const { state, addLayer, shuffleItemOnto } = createLayersState();

    //     // First add them in reverse order
    //     for (const id of [...fullState.order].reverse()) {
    //         addLayer({ ...fullState.map[id] });
    //     }

    //     expect(state).toEqual<LayersProxyState>({
    //         map: fullState.map,
    //         order: ["layer4", "layer3", "layer2", "layer1"],
    //         currentKey: "layer1",
    //     });

    //     shuffleItemOnto({ id: "layer4" }, { id: "layer1" });
    //     expect(state).toEqual<LayersProxyState>({
    //         map: fullState.map,
    //         order: ["layer3", "layer2", "layer1", "layer4"],
    //         currentKey: "layer1",
    //     });
    // });

    // it("should reset to initial state if all layers are removed", () => {
    //     const { state, addLayer, reset } = createLayersState();

    //     for (const id of fullState.order) {
    //         addLayer({ ...fullState.map[id] });
    //     }

    //     reset();
    //     expect(state).toEqual<LayersProxyState>({ currentKey: null, map: {}, order: [] });
    // });

    // it("should tab forward through layers", () => {
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

    // it("should tab backward through layers", () => {
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

    // it("should select a new layer by id", () => {
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

    // it("should remove a layer that is not selected", () => {
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

    // it("should select the next layer if the current is removed", () => {
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

    // it("should select the next layer if the current is removed and there is none after", () => {
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

    // it("should not select an ethereal layer when adding it", () => {
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
