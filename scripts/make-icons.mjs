// Draws the app icons (Mèo Smarty on a soft blue) into public/icons/ using headless Chrome.
// Run again only if the mascot or colours change: `node scripts/make-icons.mjs`. The PNGs are committed.
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { mascotSVG } from "../src/ui/mascot.ts";

const CHROME = process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const OUT = new URL("../public/icons/", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
mkdirSync(OUT, { recursive: true });
const tmp = mkdtempSync(`${tmpdir()}/ttth-icons-`);

// The mascot fills 64% of the square, centred: inside the safe zone of "maskable" icons (the OS may crop to a circle).
const page = (size) => `<!doctype html><meta charset="utf-8"><style>
  html, body { margin: 0; width: ${size}px; height: ${size}px; overflow: hidden; }
  body { background: #eaf2ff; display: grid; place-items: center; }
  .m { width: ${Math.round(size * 0.64)}px; height: ${Math.round(size * 0.64)}px; }
  .m svg { width: 100%; height: 100%; }
</style><div class="m">${mascotSVG("detective")}</div>`;

for (const [name, size] of [["icon-192.png", 192], ["icon-512.png", 512], ["apple-touch-icon.png", 180]]) {
  const file = `${tmp}/${name}.html`;
  writeFileSync(file, page(size));
  const r = spawnSync(CHROME, ["--headless=new", "--disable-gpu", "--hide-scrollbars", `--window-size=${size},${size}`, `--screenshot=${OUT}${name}`, `file:///${file.replace(/\\/g, "/")}`], { stdio: "ignore" });
  console.log(name, r.status === 0 ? "ok" : "FAILED");
}
