import { createSlice } from "@reduxjs/toolkit";

let modalCallback = null;
export const awaitModalFormSubmission = async () => {
    return new Promise((resolve) => {
        modalCallback = resolve;
    });
};

export const modalMiddleware = () => (next) => (action) => {
    if (action.type === closeModal.toString() && modalCallback) {
        modalCallback(action.payload);
        modalCallback = null;
    }
    next(action);
};

const initialState = {
    isOpen: false,
    data: undefined,
    schema: undefined,
    uischema: undefined,
};

export const modalSlice = createSlice({
    name: "modal",
    initialState,
    reducers: {
        openModal: (state, action) => {
            const { data, schema, uischema } = action.payload;
            state.isOpen = true;
            state.data = data;
            state.schema = schema;
            state.uischema = uischema;
        },
        closeModal: (state, action) => {
            state.isOpen = false;
            state.data = null;
            state.schema = null;
            state.uischema = null;
        },
    },
});

export const { closeModal, openModal } = modalSlice.actions;

export default modalSlice.reducer;
