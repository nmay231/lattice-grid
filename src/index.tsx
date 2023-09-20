import "@total-typescript/ts-reset";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";

const root = createRoot(document.getElementById("root")!);
// eslint-disable-next-line vitest/require-hook -- Why you be like this?
root.render(
    <StrictMode>
        <App />
    </StrictMode>,
);
