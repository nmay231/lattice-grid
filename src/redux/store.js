import { configureStore } from "@reduxjs/toolkit";
import settings from "./settings";

export const store = configureStore({
    reducer: { settings },
});
