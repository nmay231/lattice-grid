import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    renderOrder: [],
    groups: {},
};

export const blitsSlice = createSlice({
    name: "blits",
    initialState,
    reducers: {
        // TODO: allow more granular change
        setBlitGroups: (state, action) => {
            state.groups = action.payload.groups;
            state.renderOrder = action.payload.renderOrder;
        },
    },
});

export const { setBlitGroups } = blitsSlice.actions;

export default blitsSlice.reducer;
