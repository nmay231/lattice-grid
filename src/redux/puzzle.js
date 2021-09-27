import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    minX: 0,
    minY: 0,
    width: 0,
    height: 0,
    visibleLayers: [],
    layerModifiers: [],
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
    },
});

export const { resizeCanvas } = puzzleSlice.actions;

export default puzzleSlice.reducer;
