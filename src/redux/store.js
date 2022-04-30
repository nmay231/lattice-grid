import { configureStore } from "@reduxjs/toolkit";
import modal, { modalMiddleware } from "./modal";
import puzzle from "./puzzle";

export const store = configureStore({
    reducer: { modal, puzzle },
    middleware: [modalMiddleware],
});
