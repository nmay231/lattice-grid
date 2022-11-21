import { arrayMove } from "@dnd-kit/sortable";
import { proxy } from "valtio";
import { errorNotification } from "../utils/DOMUtils";

// TODO: import { Layer } from "../types"
export type Layer = {
    id: string;
    type: string;
    displayName: string;
    ethereal: boolean;
};

export type LayersProxyState = {
    order: Layer["id"][];
    layers: Record<Layer["id"], Layer>;
    currentLayerId: null | Layer["id"];
};

export const createLayersState = () => {
    const state = proxy<LayersProxyState>({
        order: [],
        layers: {},
        currentLayerId: null,
    });

    return {
        state,

        reset: () => {
            state.order = [];
            state.layers = {};
            state.currentLayerId = null;
        },

        shuffleItemOnto: (beingMoved: Pick<Layer, "id">, target: Pick<Layer, "id">) => {
            const from = state.order.indexOf(beingMoved.id);
            const to = state.order.indexOf(target.id);
            if (from === -1 || to === -1) {
                throw errorNotification({
                    message:
                        "Layer id not present in shuffleItemOnto: " +
                        `${beingMoved.id} => ${target.id} not in ${state.order}`,
                });
            }
            state.order = arrayMove(state.order, from, to);
        },

        addLayer: (layer: Layer) => {
            state.order.push(layer.id);
            state.layers[layer.id] = layer;
            if (!layer.ethereal) state.currentLayerId = layer.id;
        },

        removeLayer: (idToRemove: string) => {
            const { order, layers } = state;

            const index = order.indexOf(idToRemove);
            if (index === -1) {
                throw errorNotification({
                    message: `removeLayer: ${idToRemove} not in ${order}`,
                });
            }
            order.splice(index, 1);
            delete layers[idToRemove];

            if (state.currentLayerId === idToRemove) {
                let nextId = null;

                // We try to select the next layer without wrapping to the other end
                for (const id of order.slice(index)) {
                    if (!layers[id].ethereal) {
                        nextId = id;
                        break;
                    }
                }

                // If that fails, try selecting the previous layer
                if (nextId === null) {
                    for (const id of order.slice(0, index).reverse()) {
                        if (!layers[id].ethereal) {
                            nextId = id;
                            break;
                        }
                    }
                    // If THAT fails, then no layer is selectable anyways and currentLayerId should be null
                }
                state.currentLayerId = nextId;
            }
        },

        selectLayer: (
            arg: { id: string } | { tab: number },
        ): LayersProxyState["currentLayerId"] => {
            if ("id" in arg) {
                if (!(arg.id in state.layers) || state.layers[arg.id].ethereal) {
                    throw errorNotification({
                        message: "selectLayer: trying to select a non-existent or ethereal layer",
                    });
                }
                state.currentLayerId = arg.id;
                return arg.id;
            } else if ("tab" in arg && state.currentLayerId !== null) {
                const one = arg.tab; // positive or negative one
                const { order } = state;
                let index = order.indexOf(state.currentLayerId);

                for (let count = 0; count < order.length; count++) {
                    index = (order.length + index + one) % order.length;
                    if (!state.layers[order[index]].ethereal) {
                        state.currentLayerId = order[index];
                        return order[index];
                    }
                }
            }
            return null;
        },
    };
};

export const Layers = createLayersState();
export const useLayers = () => ({ Layers });
