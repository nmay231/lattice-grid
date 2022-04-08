import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    layers: [],
    currentLayerId: null,
};

export const puzzleSlice = createSlice({
    name: "puzzle",
    initialState,
    reducers: {
        newPuzzle: (state) => {
            for (let key in initialState) {
                // TODO: This is a latent bug and simply lazy. Sounds like a normal day...
                // To clarify, it's a bug because not everything should be reset, new state fields will not be reset, etc.
                state[key] = initialState[key];
            }
        },
        addLayer: (state, action) => {
            // TODO: defaultRenderOrder
            state.layers.push(action.payload);
            state.currentLayerId = action.payload.id;
        },
        removeLayer: (state, action) => {
            const index = state.layers
                .map(({ id }) => id)
                .indexOf(action.payload);
            state.layers.splice(index, 1);
            if (state.currentLayerId === action.payload) {
                let nextId = null;
                // We try to select the next layer without wrapping to the other end
                for (let layer of state.layers.slice(index)) {
                    if (layer.hidden) continue;
                    nextId = layer.id;
                    break;
                }
                if (nextId === null) {
                    // If that fails, try selecting the previous layer
                    for (let i = index - 1; i >= 0; i--) {
                        const layer = state.layers[i];
                        if (layer.hidden) continue;
                        nextId = layer.id;
                        break;
                    }
                    // If THAT fails, then no layer is selectable anyways and currentLayerId should be null
                }
                state.currentLayerId = nextId;
            }
        },
        selectLayer: (state, action) => {
            if ("id" in action.payload) {
                state.currentLayerId = action.payload.id;
            } else if ("tab" in action.payload) {
                const one = action.payload.tab; // positive or negative one
                let index = state.layers
                    .map(({ id }) => id)
                    .indexOf(state.currentLayerId);

                for (let count = 0; count < state.layers.length; count++) {
                    index =
                        (state.layers.length + index + one) %
                        state.layers.length;
                    if (!state.layers[index].hidden) {
                        state.currentLayerId = state.layers[index].id;
                        break;
                    }
                }
            }
        },
        reorderLayers: (state, action) => {
            state.layers = action.payload;
        },
    },
});

export const { addLayer, newPuzzle, removeLayer, reorderLayers, selectLayer } =
    puzzleSlice.actions;

export default puzzleSlice.reducer;
