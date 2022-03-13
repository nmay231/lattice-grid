import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    borderPadding: 60,
    cellSize: 60,
    // TODO: After I switch to SVG
    // zoom: 100,
    // The time window allowed between parts of a single action, e.g. typing a two-digit number
    actionWindowMs: 600,
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
