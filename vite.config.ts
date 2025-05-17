/// <reference types="vite/client" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import cesium from "vite-plugin-cesium";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react(), cesium({ rebuildCesium: true })],
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".jsx"],
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  // test: {
  //   globals: true,
  //   environment: "jsdom",
  //   setupFiles: "./src/test/setup.ts",
  // },
  server: {
    port: 3000,
  },
});
