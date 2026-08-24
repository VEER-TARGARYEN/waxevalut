import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  server: {
    port: 5173,
    // In dev, proxy /api to the real FastAPI backend when it is running, so the same
    // build can talk to mocks (VITE_USE_MOCK=1) or the live service with zero code change.
    proxy: {
      "/api": { target: "http://127.0.0.1:8099", changeOrigin: true },
    },
  },
  build: {
    // Cytoscape + layout is the only heavy chunk; keep it split so the Recall path stays light.
    rollupOptions: {
      output: {
        manualChunks: {
          graph: ["cytoscape", "cytoscape-fcose"],
          motion: ["framer-motion"],
        },
      },
    },
  },
});
