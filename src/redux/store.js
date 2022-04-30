import { configureStore } from "@reduxjs/toolkit";
import modal, { modalMiddleware } from "./modal";
import puzzle from "./puzzle";
import settings from "./settings";

export const store = configureStore({
    reducer: { modal, puzzle, settings },
    middleware: [modalMiddleware],
});
