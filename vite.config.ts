import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8787",
        changeOrigin: true,
        // Upstream Mattilsynet API can take 30-90s per page; don't bail early.
        timeout: 120_000,
        proxyTimeout: 120_000,
      },
    },
  },
});
