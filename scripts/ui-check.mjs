// UI regression check: drives the dev server in headless Chrome through the DevTools protocol
// (real mouse events, real layout). Needs Node 24 and Chrome/Edge.
//   1) npm run dev            (in another terminal)
//   2) npm run ui:check       (env: APP_URL, CHROME, OUT for screenshots; defaults below)
// It currently checks the step-1 foundation through the dev-only gallery at #/kit.
// Extend it with the checks for each screen you build (BUILD_PLAN.md "Done when" lines).
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

const SP = process.env.OUT ?? `${tmpdir()}/ttth-ui-check`;
const CHROME = process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const URL_BASE = process.env.APP_URL ?? "http://localhost:5173/";
const PROFILE = `${SP}/chrome-profile-${Date.now()}`;
mkdirSync(PROFILE, { recursive: true });
console.log(`screenshots and a throwaway browser profile go to ${SP}`);
const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", "--remote-debugging-port=9333", `--user-data-dir=${PROFILE}`, "--window-size=1180,820", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let targets;
for (let i = 0; i < 50; i++) {
  try { targets = await (await fetch("http://127.0.0.1:9333/json")).json(); if (targets.find((t) => t.type === "page")) break; } catch {}
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
const shot = async (name) => { const r = await send("Page.captureScreenshot", { format: "png" }); writeFileSync(`${SP}/${name}.png`, Buffer.from(r.result.data, "base64")); };
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
setTimeout(() => { console.log("WATCHDOG: stuck after:", last); chrome.kill(); process.exit(2); }, 100000);

await send("Page.enable"); await send("Runtime.enable");
await viewport(1180, 820);

// ---------- 1. empty stage ----------
await nav(URL_BASE);
check("stage exists at 1180x820", await ev(`(() => { const r = document.querySelector('.stage').getBoundingClientRect(); return Math.round(r.width) === 1180 && Math.round(r.height) === 820; })()`));
check("fx classes default on", await ev(`['fx-anim','fx-decor','fx-celebrate','fx-sfx'].every(c => document.documentElement.classList.contains(c))`));
check("placeholder text shown", (await ev(`document.querySelector('.placeholder h1')?.textContent`)) === "Thám tử Toán học Tí hon");
check("svg defs injected once", (await ev(`document.querySelectorAll('#ttth-defs').length`)) === 1);
await shot("ui-1-placeholder");

// ---------- 2. scaling + portrait ----------
await viewport(2360, 1640);
await sleep(100);
check("scales up 2x", await ev(`Math.round(document.querySelector('.stage').getBoundingClientRect().width) === 2360`));
await viewport(800, 560);
await sleep(100);
check("scales down (800 wide window)", await ev(`Math.abs(document.querySelector('.stage').getBoundingClientRect().width - 800) < 2`));
await viewport(590, 410);
await sleep(100);
check("small phone-ish landscape is blocked (min side < 420)", await ev(`document.body.classList.contains('portrait')`));
await viewport(820, 1180);
await sleep(100);
check("portrait notice on", await ev(`document.body.classList.contains('portrait') && getComputedStyle(document.querySelector('#rotate')).display === 'flex' && getComputedStyle(document.querySelector('.stage')).display === 'none'`));
await shot("ui-2-portrait");
await viewport(1180, 820);
await sleep(100);
check("portrait notice off again", await ev(`!document.body.classList.contains('portrait') && getComputedStyle(document.querySelector('#rotate')).display === 'none'`));

// ---------- 3. settings drive the page ----------
const setFx = (o) => ev(`__app.store.update(d => ({...d, settings: {...d.settings, fx: ${JSON.stringify(o)}}}))`);
await setFx({ anim: false, decor: false, celebrate: false, sfx: false });
check("calm: all fx classes removed", await ev(`['fx-anim','fx-decor','fx-celebrate','fx-sfx'].every(c => !document.documentElement.classList.contains(c))`));
check("calm: decoration hidden", await ev(`getComputedStyle(document.querySelector('.decor')).display === 'none'`));
await setFx({ anim: true, decor: true, celebrate: true, sfx: true });
check("all: decoration visible", await ev(`getComputedStyle(document.querySelector('.decor')).display === 'block'`));
check("settings saved to localStorage", await ev(`JSON.parse(localStorage.getItem('ttth.data')).settings.fx.decor === true`));

// ---------- 4. component kit ----------
await ev(`location.hash = "#/kit"`); await sleep(400);
check("kit screen mounted", await ev(`!!document.querySelector('#kit-status')`));
check("topbar: Vòng 2 and 5 dots (2 done, 1 now)", await ev(`document.querySelector('.tier-badge').textContent === 'Vòng 2' && document.querySelectorAll('.dots span').length === 5 && document.querySelectorAll('.dots .done').length === 2 && document.querySelectorAll('.dots .now').length === 1`));
check("five Mèo moods drawn", (await ev(`document.querySelectorAll('.meo svg').length`)) >= 5);
await shot("ui-3-kit");

// speaker toggles mute for everyone
check("starts unmuted", await ev(`!document.documentElement.classList.contains('is-muted')`));
await click(".speaker");
check("speaker mutes (class + saved)", await ev(`document.documentElement.classList.contains('is-muted') && __app.store.data.settings.muted === true && __app.voice.muted === true && __app.sfx.muted === true`));
await click(".speaker");
check("speaker unmutes", await ev(`!document.documentElement.classList.contains('is-muted') && __app.store.data.settings.muted === false`));

// number pad
const pad = (n) => click(`#kit-pad [data-n="${n}"]`);
await pad(1); await pad(2); await pad(3);
check("numpad: max 2 digits", (await ev(`document.querySelector('#box-a').dataset.v`)) === "12");
await click("#box-b"); await pad(7);
check("numpad: second box", (await ev(`document.querySelector('#box-b').dataset.v`)) === "7" && (await ev(`document.querySelector('#kit-status').textContent`)) === "boxes: 12 / 7");
await click("#kit-pad [data-del]");
check("numpad: xoá", (await ev(`document.querySelector('#box-b').dataset.v`)) === "");
await send("Input.dispatchKeyEvent", { type: "keyDown", key: "5", text: "5" });
check("numpad: keyboard digit", (await ev(`document.querySelector('#box-b').dataset.v`)) === "5");
check("numpad: 0 first then digit replaces it", await (async () => { await click("#box-a"); await click("#kit-pad [data-del]"); await click("#kit-pad [data-del]"); await pad(0); await pad(4); return (await ev(`document.querySelector('#box-a').dataset.v`)) === "4"; })());

// drag and tap
const inZone = (z) => ev(`document.querySelectorAll('#zone-${z} [data-item]').length`);
check("start: 4 items in A, 0 in B", (await inZone("A")) === 4 && (await inZone("B")) === 0);
const firstItem = `#zone-A [data-item]:not([data-fixed])`;
await drag(firstItem, "#zone-B");
check("drag: item moved A → B", (await inZone("B")) === 1 && (await inZone("A")) === 3);
check("drag: status reported", (await ev(`document.querySelector('#kit-status').textContent`)) === "moved to B");
check("drag: no ghost left behind", (await ev(`document.querySelectorAll('.ghost').length`)) === 0);
await drag(`#zone-A [data-fixed]`, "#zone-B");
check("fixed item cannot be dragged", (await inZone("B")) === 1);
await click(firstItem); // tap = select
check("tap: item selected", await ev(`document.querySelectorAll('.selected').length === 1`));
await click("#zone-B"); // tap the zone = move
check("tap-then-tap: moved to B", (await inZone("B")) === 2 && (await ev(`document.querySelectorAll('.selected').length`)) === 0);
await click(firstItem);
await click(`#zone-B [data-item]`); // tap an item in the other zone also moves
check("tap item then tap item in other zone: moved", (await inZone("B")) === 3);
await click(`#zone-B [data-item]`); await click(`#zone-B [data-item]`);
check("tap the same item twice deselects", (await ev(`document.querySelectorAll('.selected').length`)) === 0);

// adult gate: quick tap shows hint, hold opens
const [gx, gy] = await center(".gate-btn");
await mouse("mousePressed", gx, gy); await sleep(300); await mouse("mouseReleased", gx, gy); await sleep(60);
check("gate: quick tap shows hint, does not open", (await ev(`document.querySelector('.gate-tip').classList.contains('show')`)) && (await ev(`document.querySelector('#kit-status').textContent`)) !== "gate opened");
await mouse("mousePressed", gx, gy); await sleep(1350);
check("gate: hold ~1.1 s opens", (await ev(`document.querySelector('#kit-status').textContent`)) === "gate opened");
await mouse("mouseReleased", gx, gy);

// feedback overlay
await click("#kit-fb-ok");
check("feedback: overlay + title + confetti", (await ev(`document.querySelector('.overlay h2')?.textContent`)) === "Giỏi quá!" && (await ev(`document.querySelectorAll('.confetti').length`)) > 0);
await shot("ui-4-feedback");
await click(".overlay [data-close]");
check("feedback: closes, callback ran", (await ev(`document.querySelectorAll('.overlay').length`)) === 0 && (await ev(`document.querySelector('#kit-status').textContent`)) === "feedback ok closed");
await sleep(2600); // let the previous confetti finish falling
await setFx({ anim: true, decor: true, celebrate: false, sfx: true });
await click("#kit-fb-retry");
check("feedback retry: no confetti; secondary button", (await ev(`document.querySelectorAll('.confetti').length`)) === 0 && (await ev(`!!document.querySelector('.overlay .btn-secondary')`)));
await click(".overlay [data-close]");
await click("#kit-fb-stars");
check("feedback: 3 stars", (await ev(`document.querySelectorAll('.overlay .stars img').length`)) === 3);
await click(".overlay [data-close]");
await click(".btn-round.info");
check("guide: 3 steps", (await ev(`document.querySelectorAll('.overlay ol li').length`)) === 3);
await click(".overlay [data-close]");
check("guide: closed callback", (await ev(`document.querySelector('#kit-status').textContent`)) === "guide closed");

// leaving a screen cleans up
await ev(`location.hash = '#/home'`); await sleep(200);
check("navigation: kit gone, listeners cleaned", await ev(`!document.querySelector('#kit-status') && document.querySelectorAll('.gate-btn, .ghost, .overlay').length === 0 && !!document.querySelector('.placeholder')`));
await send("Input.dispatchKeyEvent", { type: "keyDown", key: "9", text: "9" });
check("no console errors", consoleErrors.length === 0, JSON.stringify(consoleErrors));

console.log(`browser checks: ${passed} passed, ${failed} failed`);
ws.close(); chrome.kill();
process.exit(failed ? 1 : 0);
