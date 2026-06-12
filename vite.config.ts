import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "blockly-field-color-wheel": path.resolve(
        projectRoot,
        "src/lib/fields/color-wheel.ts",
      ),
    },
  },
  base: process.env.NODE_ENV === "production" ? "/editor/" : "/",
  build: {
    rollupOptions: {
      output: {
        codeSplitting: true,
        manualChunks: (id) => {
          if (id.includes("node_modules/blockly")) {
            return "blockly";
          }
          if (id.includes("node_modules/konva")) {
            return "konva";
          }
          if (id.includes("node_modules")) {
            return "vendor";
          }
        },
      },
    },
  },
});
