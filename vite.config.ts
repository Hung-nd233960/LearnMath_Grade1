import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { defineConfig, type Plugin } from "vitest/config";

/** Every file under `dir` as a path relative to it, with forward slashes. */
function listFiles(dir: string, base = ""): string[] {
  return readdirSync(join(dir, base)).flatMap((name) => {
    const rel = base ? `${base}/${name}` : name;
    return statSync(join(dir, rel)).isDirectory() ? listFiles(dir, rel) : [rel];
  });
}

/**
 * Writes dist/sw.js: the service worker with the list of every file the app needs, so it works offline.
 * (No extra dependency: the worker itself is scripts/sw.template.js.)
 */
function serviceWorker(): Plugin {
  return {
    name: "ttth-service-worker",
    apply: "build",
    generateBundle(_options, bundle) {
      const publicDir = join(process.cwd(), "public");
      const publicFiles = listFiles(publicDir).filter((f) => !f.endsWith(".md")); // notes for humans stay out of the cache
      // index.html is written by Vite's HTML step after this hook, so it is listed by hand
      const files = ["./", "index.html", ...Object.keys(bundle), ...publicFiles].map((f) => (f === "./" ? f : `./${f}`));
      // the version changes whenever a bundled file (its name carries a content hash) or a public file changes
      const hash = createHash("sha1");
      for (const f of Object.keys(bundle)) hash.update(f);
      for (const f of publicFiles) hash.update(f).update(String(statSync(join(publicDir, f)).size));
      const source = readFileSync(join(process.cwd(), "scripts", "sw.template.js"), "utf8")
        .replace("__VERSION__", hash.digest("hex").slice(0, 10))
        .replace("__PRECACHE__", JSON.stringify(files, null, 2));
      this.emitFile({ type: "asset", fileName: "sw.js", source });
    },
  };
}

// Static, frontend-only build. `base: "./"` keeps asset paths relative so the
// `dist/` folder works on GitHub Pages, Netlify, or opened from a USB stick.
export default defineConfig({
  base: "./",
  plugins: [serviceWorker()],
  build: { target: "es2020", outDir: "dist" },
  test: { include: ["tests/**/*.test.ts"], environment: "node" },
});
