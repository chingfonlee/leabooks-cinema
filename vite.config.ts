import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import legacy from "@vitejs/plugin-legacy";

export default defineConfig({
  plugins: [
    react(),
    legacy({
      targets: ["chrome >= 60", "android >= 8"],
      modernPolyfills: true,
    }),
  ],
  base: "./",
  build: {
    outDir: "dist",
    assetsInlineLimit: 0,
  },
});
