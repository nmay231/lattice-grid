import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import svgrPlugin from "vite-plugin-svgr";

export default defineConfig({
    appType: "spa",
    plugins: [react(), svgrPlugin()],
    server: { port: 3000, strictPort: true },
    test: {
        globals: true,
        environment: "jsdom",
        setupFiles: "./src/setupTests.ts",
        coverage: { exclude: ["src/utils/testUtils.ts"] },
    },
});
