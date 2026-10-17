import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { defineConfig, type Plugin } from "vitest/config";

/** Every file under `dir` as a path relative to it, with forward slashes. */
function listFiles(dir: string, base = ""): string[] {
  return readdirSync(join(dir, base)).flatMap((name) => {
    const rel = base ? `${base}/${name}` : name;
    return statSync(join(dir, rel)).isDirectory() ? listFiles(dir, rel) : [rel];
  });
}

/** The voice packs found under public/audio/<pack>/: every folder with clips (or a pack.json describing it). */
function scanVoicePacks() {
  const audio = join(process.cwd(), "public", "audio");
  if (!existsSync(audio)) return { packs: [] };
  const packs = readdirSync(audio)
    .filter((name) => statSync(join(audio, name)).isDirectory())
    .map((id) => {
      const dir = join(audio, id);
      const clips = readdirSync(dir).filter((f) => f.endsWith(".mp3")).map((f) => f.slice(0, -4)).sort();
      const metaFile = join(dir, "pack.json");
      const meta = existsSync(metaFile) ? (JSON.parse(readFileSync(metaFile, "utf8")) as { name?: string; note?: string; order?: number }) : null;
      return { id, name: meta?.name ?? id, note: meta?.note ?? "", order: meta?.order ?? 100, clips, listed: clips.length > 0 || !!meta };
    })
    .filter((p) => p.listed)
    .map(({ listed: _listed, ...p }) => p);
  return { packs };
}

/**
 * Publishes audio/packs.json (the list of voice packs, see src/audio/packs.ts): written into the build,
 * and answered on the fly by the dev server, so a pack exists exactly when its folder does.
 */
function voicePacks(): Plugin {
  return {
    name: "ttth-voice-packs",
    configureServer(server) {
      server.middlewares.use("/audio/packs.json", (_req, res) => {
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(scanVoicePacks()));
      });
    },
    generateBundle() {
      this.emitFile({ type: "asset", fileName: "audio/packs.json", source: JSON.stringify(scanVoicePacks()) });
    },
  };
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
  plugins: [voicePacks(), serviceWorker()], // voicePacks first: the worker's file list must include audio/packs.json
  build: { target: "es2020", outDir: "dist" },
  test: { include: ["tests/**/*.test.ts"], environment: "node" },
});
