import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: path.resolve(__dirname, "src/dashboard"),
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "src/shared"),
      "@dashboard": path.resolve(__dirname, "src/dashboard"),
    },
  },
  clearScreen: false,
  server: {
    port: 5891,
    strictPort: true,
    proxy: {
      "/api": "http://localhost:7891",
      "/ws": {
        target: "ws://localhost:7891",
        ws: true,
      },
    },
  },
  build: {
    outDir: path.resolve(__dirname, "dist/dashboard"),
    emptyOutDir: true,
  },
});
