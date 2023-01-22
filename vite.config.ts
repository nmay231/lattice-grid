/// <reference types="vitest" />
import react from "@vitejs/plugin-react";
import { defineConfig, UserConfigExport } from "vite";
import svgrPlugin from "vite-plugin-svgr";

const config = {
    plugins: [react(), svgrPlugin()],
    server: { port: 3000, strictPort: true },
    test: {
        globals: true,
        environment: "jsdom",
        setupFiles: "./src/setupTests.ts",
        coverage: { exclude: ["src/utils/testUtils.ts"] },
    },
} as UserConfigExport; // TODO: *mumble grumble* I don't know which dependency broke the triple slash reference above...

export default defineConfig(config);
