// Offline / install check of the PRODUCTION build, in headless Chrome (needs Node 24 and Chrome/Edge).
//   1) npm run build
//   2) npm run preview -- --port 4173 --strictPort     (in another terminal)
//   3) npm run pwa:check
// It checks the manifest and installability, that the service worker keeps every file, and that the app
// still opens, shows pictures and fonts, and lets a child in with the network switched off.
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";
import { mkdirSync, readdirSync, writeFileSync } from "node:fs";

const SP = process.env.OUT ?? `${tmpdir()}/ttth-pwa-check`;
const CHROME = process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const URL_BASE = process.env.APP_URL ?? "http://localhost:4173/";
const PROFILE = `${SP}/chrome-profile-${Date.now()}`;
mkdirSync(PROFILE, { recursive: true });
console.log(`screenshots and a throwaway browser profile go to ${SP}`);
const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", "--remote-debugging-port=9555", `--user-data-dir=${PROFILE}`, "--window-size=1180,820", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const waitFor = async (expr, ms = 5000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await ev(expr)) return true; await sleep(80); } return false; };

let targets;
for (let i = 0; i < 50; i++) {
  try { targets = await (await fetch("http://127.0.0.1:9555/json")).json(); if (targets.find((t) => t.type === "page")) break; } catch {}
  await sleep(200);
}
const page = targets.find((t) => t.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0;
const pending = new Map();
const consoleErrors = [];
let loaded = null;
ws.onmessage = (m) => {
  const msg = JSON.parse(m.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
  else if (msg.method === "Page.loadEventFired" && loaded) loaded();
  else if (msg.method === "Runtime.exceptionThrown") consoleErrors.push(msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text);
  else if (msg.method === "Runtime.consoleAPICalled" && msg.params.type === "error") consoleErrors.push(msg.params.args.map((a) => a.value ?? a.description).join(" "));
};
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr) => {
  const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.result.exceptionDetails) throw new Error("eval failed: " + expr + "\n" + JSON.stringify(r.result.exceptionDetails.exception?.description));
  return r.result.result.value;
};
const viewport = (width, height) => send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
const nav = async (url) => { const p = new Promise((r) => (loaded = r)); await send("Page.navigate", { url }); await p; await sleep(400); };
const shot = async (name) => { await sleep(900); /* let pop-in animations finish */ const r = await send("Page.captureScreenshot", { format: "png" }); writeFileSync(`${SP}/${name}.png`, Buffer.from(r.result.data, "base64")); };
const center = (sel) => ev(`(() => { const r = document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })()`);
const mouse = (type, x, y) => send("Input.dispatchMouseEvent", { type, x, y, button: "left", buttons: type === "mouseReleased" ? 0 : 1, clickCount: 1 });
const click = async (sel) => { const [x, y] = await center(sel); await mouse("mousePressed", x, y); await mouse("mouseReleased", x, y); await sleep(60); };
const drag = async (fromSel, toSel) => {
  const [x1, y1] = await center(fromSel), [x2, y2] = await center(toSel);
  await mouse("mousePressed", x1, y1);
  for (let i = 1; i <= 6; i++) { await mouse("mouseMoved", x1 + ((x2 - x1) * i) / 6, y1 + ((y2 - y1) * i) / 6); await sleep(16); }
  await mouse("mouseReleased", x2, y2); await sleep(80);
};

let passed = 0, failed = 0;
let last = "start";
const check = (name, cond, extra = "") => { last = name; if (cond) passed++; else { failed++; console.log("FAIL:", name, extra); } };
setTimeout(() => { console.log("WATCHDOG: stuck after:", last); chrome.kill(); process.exit(2); }, 900000);

await send("Page.enable"); await send("Runtime.enable"); await send("Network.enable");
await viewport(1180, 820);
await send("Network.setCacheDisabled", { cacheDisabled: true });

// ---------- online: first visit ----------
await nav(URL_BASE);
check("manifest: linked from the page", await ev(`!!document.querySelector('link[rel=manifest]')`));
const m = await send("Page.getAppManifest");
const manifest = JSON.parse(m.result.data || "{}");
check("manifest: parses without errors", (m.result.errors ?? []).length === 0, JSON.stringify(m.result.errors));
check("manifest: name, landscape, fullscreen, start page", manifest.name === "Thám tử Toán học Tí hon" && manifest.orientation === "landscape" && manifest.display === "fullscreen" && manifest.start_url?.endsWith("/"), JSON.stringify(manifest));
check("manifest: 192 and 512 icons exist", (manifest.icons ?? []).length === 2 && await ev(`Promise.all(${JSON.stringify((manifest.icons ?? []).map((i) => i.src))}.map(src => fetch(new URL(src, location.href)).then(r => r.ok))).then(a => a.every(Boolean))`));
check("page: Apple touch icon and title are set", await ev(`!!document.querySelector('link[rel=apple-touch-icon]') && !!document.querySelector('meta[name=apple-mobile-web-app-title]')`));
check("fonts: nothing is fetched from Google any more", await ev(`![...document.querySelectorAll('link')].some(l => /googleapis|gstatic/.test(l.href)) && ![...document.styleSheets].some(s => { try { return [...s.cssRules].some(r => /googleapis|gstatic/.test(r.cssText)); } catch { return false; } })`));
check("service worker: registered and active", await ev(`navigator.serviceWorker.ready.then(r => !!r.active)`));
await sleep(1500);
const cached = await ev(`(async () => { const keys = await caches.keys(); const c = await caches.open(keys[0]); const reqs = await c.keys(); return { names: keys, urls: reqs.map(r => new URL(r.url).pathname) }; })()`);
check("cache: one cache, named for this build", cached.names.length === 1 && /^ttth-[0-9a-f]{10}$/.test(cached.names[0]), JSON.stringify(cached.names));
const has = (re) => cached.urls.some((u) => re.test(u));
check("cache: the page, manifest and icons", has(/\/index\.html$/) && has(/\/manifest\.webmanifest$/) && has(/\/icons\/icon-512\.png$/), JSON.stringify(cached.urls.filter((u) => !u.includes("emoji") && !u.includes("fonts"))));
check("cache: the script and the style", has(/\/assets\/index-.*\.js$/) && has(/\/assets\/index-.*\.css$/));
check("cache: all the fonts", cached.urls.filter((u) => u.endsWith(".woff2")).length === 21);
const emojiFiles = readdirSync(new URL("../public/assets/emoji/", import.meta.url)).filter((f) => f.endsWith(".png")).length;
check("cache: all the pictures", cached.urls.filter((u) => u.includes("/assets/emoji/")).length === emojiFiles, `${cached.urls.filter((u) => u.includes("/assets/emoji/")).length} of ${emojiFiles}`);
const emojiOnDisk = await ev(`fetch('./assets/emoji/robot_3d.png').then(r => r.ok)`);
check("cache: pictures load", emojiOnDisk === true);
const installErrors = await send("Page.getInstallabilityErrors");
check("install: Chrome finds nothing in the way of installing", (installErrors.result.installabilityErrors ?? []).length === 0, JSON.stringify(installErrors.result.installabilityErrors));
check("a missing voice clip is not cached as if it existed", await ev(`fetch('./audio/n3.mp3').then(r => r.status).then(async (st) => { const keys = await caches.keys(); const c = await caches.open(keys[0]); return st !== 200 ? !(await c.match('./audio/n3.mp3')) : true; })`));
// let the page be controlled by the worker, then add a child while online
await nav(URL_BASE);
check("service worker: controls the page after a reload", await ev(`!!navigator.serviceWorker.controller`));
await click("#app .name-input").catch(() => {});
await send("Input.insertText", { text: "An" }); await sleep(100);
await click(".add-card .btn-primary");
await sleep(300);
check("online: a child was added", (await ev(`JSON.parse(localStorage.getItem('ttth.data')).order.length`)) === 1);

// ---------- offline ----------
await send("Network.emulateNetworkConditions", { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
await send("Page.reload");
await sleep(2500);
check("offline: the app opens", await ev(`!!document.querySelector('.screen-who')`));
check("offline: the child saved earlier is there", await ev(`document.querySelectorAll('.kid[data-profile]').length === 1`));
check("offline: pictures are shown", await ev(`[...document.querySelectorAll('img')].length > 0 && [...document.querySelectorAll('img')].every(i => i.complete && i.naturalWidth > 0)`));
check("offline: the fonts are loaded", await ev(`document.fonts.ready.then(() => [...document.fonts].filter(f => f.status === 'loaded').length >= 2)`));
check("offline: Baloo 2 and Be Vietnam Pro are really used", await ev(`document.fonts.check('800 24px "Baloo 2"', 'Chào') && document.fonts.check('400 16px "Be Vietnam Pro"', 'Chào')`));
await click(".kid[data-profile]");
check("offline: a child can go to the home screen", await waitFor(`!!document.querySelector('.screen-home') && document.querySelectorAll('.tile').length === 6`, 4000));
await click(".tile[data-game=split]");
check("offline: a game opens (the guide shows the first time)", await waitFor(`!!document.querySelector('.guide-card')`, 4000));
await click(".guide-card .btn-primary");
check("offline: the question is drawn", await ev(`!!document.querySelector('.sp') && document.querySelectorAll('.sp img').length > 0`));
await shot("pwa-offline-game");
await send("Page.navigate", { url: URL_BASE + "#/home" });
await sleep(800);
check("offline: a deep link still opens the app", await ev(`!!document.querySelector('.screen-home')`));
check("offline: no console errors besides the missing voice clips", consoleErrors.filter((e) => !/\.mp3|Failed to load resource|net::ERR/.test(e)).length === 0, JSON.stringify(consoleErrors.slice(0, 5)));

console.log(`pwa checks: ${passed} passed, ${failed} failed`);
ws.close(); chrome.kill();
process.exit(failed ? 1 : 0);
