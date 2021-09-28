import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    minX: 0,
    minY: 0,
    width: 0,
    height: 0,
    layers: [],
};

export const puzzleSlice = createSlice({
    name: "puzzle",
    initialState,
    reducers: {
        resizeCanvas: (state, action) => {
            const { minX, minY, width, height } = action.payload;
            state.minX = minX;
            state.minY = minY;
            state.width = width;
            state.height = height;
        },
        addLayer: (state, action) => {
            state.layers.push(action.payload);
        },
        removeLayer: (state, action) => {
            state.layers = state.layers.filter(
                ({ id }) => id !== action.payload
            );
        },
    },
});

export const { addLayer, removeLayer, resizeCanvas } = puzzleSlice.actions;

export default puzzleSlice.reducer;
