import { act, renderHook } from "@testing-library/react-hooks";
import { useAtomValue } from "jotai";
import { initialValue, LayersAtomValue, makeLayersAtom } from "./layers";

describe("layers atom", () => {
    const fourLayers: LayersAtomValue["layers"] = [
        { id: "layer1", layerType: "class1", hidden: false },
        { id: "layer2", layerType: "class2", hidden: true },
        { id: "layer3", layerType: "class1", hidden: false },
        { id: "layer4", layerType: "class3", hidden: false },
    ];

    it("should synchronize component and external state", () => {
        const { layersAtom, addLayer, getLayers } = makeLayersAtom();
        const { result } = renderHook(() => useAtomValue(layersAtom));

        const expected: LayersAtomValue = {
            currentLayerId: "layerId",
            layers: [{ id: "layerId", layerType: "asdf", hidden: false }],
        };

        act(() => addLayer({ ...expected.layers[0] }));

        expect(getLayers()).toEqual(expected);
        expect(result.current).toEqual(expected);
    });

    it("should add multiple layers normally", () => {
        const { layersAtom, addLayer } = makeLayersAtom();
        const { result } = renderHook(() => useAtomValue(layersAtom));

        act(() => {
            for (let layer of fourLayers) {
                addLayer({ ...layer });
            }
        });

        expect(result.current).toEqual<LayersAtomValue>({
            layers: fourLayers,
            currentLayerId: "layer4",
        });
    });

    it("should reorder layers", () => {
        const { layersAtom, addLayer, setLayers } = makeLayersAtom();
        const { result } = renderHook(() => useAtomValue(layersAtom));

        act(() => {
            // First add them in reverse order
            for (let layer of [...fourLayers].reverse()) {
                addLayer({ ...layer });
            }
            // Then reset the order
            setLayers(fourLayers);
        });

        expect(result.current).toEqual<LayersAtomValue>({
            layers: fourLayers,
            currentLayerId: "layer1",
        });
    });

    it("should clear layers and currentLayerId", () => {
        const { layersAtom, addLayer, setLayers } = makeLayersAtom();
        const { result } = renderHook(() => useAtomValue(layersAtom));

        act(() => {
            // First add them
            for (let layer of fourLayers) {
                addLayer({ ...layer });
            }
            // Then clear them out for a fresh puzzle
            setLayers([]);
        });

        expect(result.current).toEqual(initialValue);
    });

    it("should tab forward through layers", () => {
        const { layersAtom, addLayer, selectLayer } = makeLayersAtom();
        const { result } = renderHook(() => useAtomValue(layersAtom));

        act(() => {
            for (let layer of fourLayers) {
                addLayer({ ...layer });
            }
        });

        const ids = [
            "layer4", // Initial
            "layer1", // Wrap from the end to the beginning
            "layer3", // Skip the hidden second layer
            "layer4", // Tab forward one layer
        ];

        for (let id of ids) {
            expect(result.current.currentLayerId).toEqual(id);
            act(() => selectLayer({ tab: 1 }));
        }
    });

    it("should tab backward through layers", () => {
        const { layersAtom, addLayer, selectLayer } = makeLayersAtom();
        const { result } = renderHook(() => useAtomValue(layersAtom));

        act(() => {
            for (let layer of fourLayers) {
                addLayer({ ...layer });
            }
        });

        const ids = [
            "layer4", // Initial
            "layer3", // Tab backward one layer
            "layer1", // Skip the hidden 2 layer
            "layer4", // Wrap from the beginning to the end
        ];

        for (let id of ids) {
            expect(result.current.currentLayerId).toEqual(id);
            act(() => selectLayer({ tab: -1 }));
        }
    });

    it("should select a new layer by id", () => {
        const { layersAtom, addLayer, selectLayer } = makeLayersAtom();
        const { result } = renderHook(() => useAtomValue(layersAtom));

        act(() => {
            for (let layer of fourLayers) {
                addLayer({ ...layer });
            }
        });

        expect(result.current.currentLayerId).toEqual("layer4");
        act(() => selectLayer({ id: "layer2" }));
        expect(result.current.currentLayerId).toEqual("layer2");
    });

    it("should remove a layer that is not selected", () => {
        const { layersAtom, addLayer, selectLayer, removeLayer } =
            makeLayersAtom();
        const { result } = renderHook(() => useAtomValue(layersAtom));

        act(() => {
            for (let layer of fourLayers) {
                addLayer({ ...layer });
            }
            // Select a layer and remove a layer before it
            selectLayer({ id: "layer3" });
            removeLayer("layer2");
        });

        expect(result.current).toEqual<LayersAtomValue>({
            layers: [
                fourLayers[0],
                // Second layer removed
                fourLayers[2],
                fourLayers[3],
            ],
            // Removing a different layer should not change the current layer
            currentLayerId: "layer3",
        });
    });

    it("should remove a layer that is selected with layers after it", () => {
        const { layersAtom, addLayer, selectLayer, removeLayer } =
            makeLayersAtom();
        const { result } = renderHook(() => useAtomValue(layersAtom));

        act(() => {
            for (let layer of fourLayers) {
                addLayer({ ...layer });
            }
            selectLayer({ id: "layer1" });
        });

        expect(result.current.currentLayerId).toEqual("layer1");
        act(() => removeLayer("layer1"));
        // Removing the layer should select the next non-hidden layer
        expect(result.current.currentLayerId).toEqual("layer3");
    });

    it("should remove a layer that is selected with layer before it", () => {
        const { layersAtom, addLayer, removeLayer } = makeLayersAtom();
        const { result } = renderHook(() => useAtomValue(layersAtom));

        act(() => {
            // Skip the fourth layer
            for (let layer of fourLayers.slice(0, 3)) {
                addLayer({ ...layer });
            }
        });

        expect(result.current.currentLayerId).toEqual("layer3");
        act(() => removeLayer("layer3"));
        // Removing the layer should select the next non-hidden layer
        expect(result.current.currentLayerId).toEqual("layer1");
    });

    it.todo("should reset to initial state if all layers are removed");

    it.todo(
        "should handle adding a hidden layer after a normal layer (the hidden layer should not be selected)",
    );
});
