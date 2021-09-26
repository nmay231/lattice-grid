import { configureStore } from "@reduxjs/toolkit";

import blits from "./blits";
import settings from "./settings";

export const store = configureStore({
    reducer: { settings, blits },
});
