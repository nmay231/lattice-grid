import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    // TODO: rename to borderPadding
    border: 15,
    cellSize: 48,
    // TODO: After I switch to SVG
    // zoom: 100,
};

export const settingsSlice = createSlice({
    name: "settings",
    initialState,
    reducers: {
        setBorderPadding: (state, action) => {
            state.border = action.payload;
        },
    },
});

export const { setBorderPadding } = settingsSlice.actions;

export default settingsSlice.reducer;
