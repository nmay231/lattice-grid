import { configureStore } from "@reduxjs/toolkit";

import blits from "./blits";
import puzzle from "./puzzle";
import settings from "./settings";

export const store = configureStore({
    reducer: { blits, puzzle, settings },
});
