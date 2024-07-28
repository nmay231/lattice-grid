/// <reference types="vitest" />
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import svgrPlugin from "vite-plugin-svgr";
import { configDefaults } from "vitest/config";

export default defineConfig({
    appType: "spa",
    plugins: [react(), svgrPlugin()],
    server: { port: 3000, strictPort: true, host: true },
    test: {
        globals: true,
        environment: "jsdom",
        setupFiles: "./src/testing-utils/setupTests.ts",
        exclude: [...configDefaults.exclude, "e2e/**/*"],
        coverage: { exclude: ["src/utils/testUtils.ts"] },
    },
});
