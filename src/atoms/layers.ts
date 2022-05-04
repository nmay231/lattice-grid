import { modifiableAtom } from "./modifiableAtom";

type FakeLayer = {
    id: string;
    hidden: boolean;
    layerType: string;
};

export type LayersAtomValue = {
    layers: FakeLayer[];
    currentLayerId: string | null;
};

export const initialValue: LayersAtomValue = {
    layers: [],
    currentLayerId: null,
};

// This is in a function to help with testing
export const makeLayersAtom = () => {
    const { atom: baseAtom, setValue, getValue } = modifiableAtom(initialValue);

    return {
        // For use in components
        layersAtom: baseAtom,

        // For use outside of components
        getLayers: getValue,

        setLayers: (layers: LayersAtomValue["layers"]) => {
            if (!layers.length) {
                setValue(initialValue);
            } else {
                setValue((value) => ({ ...value, layers }));
            }
        },

        addLayer: (layer: FakeLayer) => {
            setValue((value) => ({
                layers: [...value.layers, layer],
                currentLayerId: layer.id,
            }));
        },

        removeLayer: (idToRemove: string) => {
            setValue((value) => {
                const layers = [...value.layers];
                const index = value.layers
                    .map(({ id }) => id)
                    .indexOf(idToRemove);
                layers.splice(index, 1);

                let currentLayerId = value.currentLayerId;
                if (currentLayerId === idToRemove) {
                    let nextId = null;

                    // We try to select the next layer without wrapping to the other end
                    for (let layer of layers.slice(index)) {
                        if (layer.hidden) continue;
                        nextId = layer.id;
                        break;
                    }

                    // If that fails, try selecting the previous layer
                    if (nextId === null) {
                        for (let i = index - 1; i >= 0; i--) {
                            const layer = layers[i];
                            if (layer.hidden) continue;
                            nextId = layer.id;
                            break;
                        }
                        // If THAT fails, then no layer is selectable anyways and currentLayerId should be null
                    }
                    currentLayerId = nextId;
                }

                return { layers, currentLayerId };
            });
        },

        selectLayer: (arg: { id: string } | { tab: number }) => {
            setValue((value) => {
                let { currentLayerId, layers } = value;
                if ("id" in arg) {
                    return { layers, currentLayerId: arg.id };
                } else if ("tab" in arg && currentLayerId !== null) {
                    const one = arg.tab; // positive or negative one
                    let index = layers
                        .map(({ id }) => id)
                        .indexOf(currentLayerId);

                    for (let count = 0; count < layers.length; count++) {
                        index = (layers.length + index + one) % layers.length;
                        if (!layers[index].hidden) {
                            return { layers, currentLayerId: layers[index].id };
                        }
                    }
                }
                return value;
            });
        },
    };
};

export const {
    layersAtom,
    getLayers,
    setLayers,
    addLayer,
    removeLayer,
    selectLayer,
} = makeLayersAtom();
