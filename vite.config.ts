import { defineConfig } from "vitest/config";

// Static, frontend-only build. `base: "./"` keeps asset paths relative so the
// `dist/` folder works on GitHub Pages, Netlify, or opened from a USB stick.
export default defineConfig({
  base: "./",
  build: { target: "es2020", outDir: "dist" },
  test: { include: ["tests/**/*.test.ts"], environment: "node" },
});
