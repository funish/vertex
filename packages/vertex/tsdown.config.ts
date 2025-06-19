import { defineConfig } from "tsdown";

export default defineConfig({
  // Entry files
  entry: ["src/index.ts"],

  // Output formats
  format: ["esm", "cjs"],

  // Output directory
  outDir: "dist",

  // Platform target
  platform: "neutral",

  // Generate declaration files
  dts: true,

  // Auto-generate package.json exports
  exports: true,

  // Enable publint checks
  publint: true,

  // Source maps
  sourcemap: true,

  // Clean output directory
  clean: true,
});
