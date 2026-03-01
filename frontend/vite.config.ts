import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Allow preview hosts (e.g. emergentcf.cloud); use true to allow any host in preview envs
    allowedHosts: [
      "preview-intact.cluster-0.preview.emergentcf.cloud",
      ".preview.emergentcf.cloud",
    ],
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
