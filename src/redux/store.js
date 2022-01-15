import { configureStore } from "@reduxjs/toolkit";
import blits from "./blits";
import modal, { modalMiddleware } from "./modal";
import puzzle from "./puzzle";
import settings from "./settings";

export const store = configureStore({
    reducer: {
        blits,
        modal,
        puzzle,
        settings,
    },
    middleware: [modalMiddleware],
});
