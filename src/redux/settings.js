import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    borderPadding: 60,
    cellSize: 60,
    // TODO: After I switch to SVG
    // zoom: 100,
};

export const settingsSlice = createSlice({
    name: "settings",
    initialState,
    reducers: {
        setBorderPadding: (state, action) => {
            state.borderPadding = action.payload;
        },
    },
});

export const { setBorderPadding } = settingsSlice.actions;

export default settingsSlice.reducer;
