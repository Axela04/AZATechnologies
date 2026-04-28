import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig(({ mode }) => ({
  base: "./",
  plugins: mode === "standalone" ? [viteSingleFile()] : [],
  build: {
    outDir: mode === "standalone" ? "standalone" : "dist",
    target: "es2022",
    sourcemap: mode !== "standalone",
    assetsInlineLimit: mode === "standalone" ? 100_000_000 : 4096,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        inlineDynamicImports: mode === "standalone",
      },
    },
  },
  server: {
    host: true,
    port: 5173,
  },
}));
