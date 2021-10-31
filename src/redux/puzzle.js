import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    minX: 0,
    minY: 0,
    width: 0,
    height: 0,
    layers: [],
    selectedLayer: null,
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
        resizeCanvas: (state, action) => {
            const { minX, minY, width, height } = action.payload;
            state.minX = minX;
            state.minY = minY;
            state.width = width;
            state.height = height;
        },
        addLayer: (state, action) => {
            state.layers.push(action.payload);
            state.selectedLayer = action.payload.id;
        },
        removeLayer: (state, action) => {
            const index = state.layers
                .map(({ id }) => id)
                .indexOf(action.payload);
            state.layers.splice(index, 1);
            // TODO: the next layer is not necessarily one that can be selected
            state.selectedLayer = state.layers[index % state.layers.length].id;
        },
    },
});

export const { addLayer, newPuzzle, removeLayer, resizeCanvas } =
    puzzleSlice.actions;

export default puzzleSlice.reducer;
