import { configureStore } from "@reduxjs/toolkit";
import modal, { modalMiddleware } from "./modal";

export const store = configureStore({
    reducer: { modal },
    middleware: [modalMiddleware],
});
