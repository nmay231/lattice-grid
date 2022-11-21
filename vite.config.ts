import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import svgrPlugin from "vite-plugin-svgr";

export default defineConfig({
    plugins: [react(), svgrPlugin()],
    server: { port: 3000, strictPort: true },
});
