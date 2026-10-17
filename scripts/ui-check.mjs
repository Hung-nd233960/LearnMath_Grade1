// UI regression check: drives the dev server in headless Chrome through the DevTools protocol
// (real mouse events, real layout). Needs Node 24 and Chrome/Edge.
//   1) npm run dev            (in another terminal)
//   2) npm run ui:check       (env: APP_URL, CHROME, OUT for screenshots; defaults below)
// It checks the shared UI through the dev-only gallery at #/kit, then profiles + home (step 2),
// then plays whole sets of Mấy và mấy (step 3), Tính theo hình (step 4), Giỏ trái cây (step 5), Cái cân (step 6), Rô-bốt (step 7), So sánh cân (step 8), screen time (step 9), the teacher area (step 10), the guide (step 11) and Mèo's worked examples (step 13).
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

await send("Page.enable"); await send("Runtime.enable");
await viewport(1180, 820);

// ---------- 1. empty stage ----------
await nav(URL_BASE);
check("stage exists at 1180x820", await ev(`(() => { const r = document.querySelector('.stage').getBoundingClientRect(); return Math.round(r.width) === 1180 && Math.round(r.height) === 820; })()`));
check("fx classes default on", await ev(`['fx-anim','fx-decor','fx-celebrate','fx-sfx'].every(c => document.documentElement.classList.contains(c))`));
check("first run: no child yet, so the picker opens with the add form", await ev(`!!document.querySelector('.screen-who') && !!document.querySelector('.overlay .add-card')`));
check("svg defs injected once", (await ev(`document.querySelectorAll('#ttth-defs').length`)) === 1);
await shot("ui-1-first-run");

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
check("navigation: kit gone, listeners cleaned; no child chosen so the picker shows", await ev(`!document.querySelector('#kit-status') && document.querySelectorAll('.ghost').length === 0 && document.querySelectorAll('.gate-btn').length === 1 && !!document.querySelector('.screen-who')`));

// ---------- 5. profiles and home (step 2) ----------
const key = (k, extra = {}) => send("Input.dispatchKeyEvent", { type: "keyDown", key: k, ...extra });
const typeName = async (name) => { await sleep(150); await send("Input.insertText", { text: name }); await sleep(50); };
const names = () => ev(`Object.values(__app.store.data.profiles).map(p => p.name).join(',')`);
const goHash = async (h) => { await ev(`location.hash = ${JSON.stringify(h)}`); await sleep(350); };

check("guard: guarded route with no child goes to the picker", (await ev(`__app.store.activeProfile === null && !!document.querySelector('.screen-who')`)));
await sleep(200);
check("add form: OK disabled while the name is empty", await ev(`document.querySelector('.add-card .btn-primary').disabled === true`));
await key("Enter", { code: "Enter", windowsVirtualKeyCode: 13, text: "\r" });
check("add form: Enter with an empty name does nothing", (await names()) === "" && await ev(`!!document.querySelector('.add-card')`));
await typeName("Bình");
check("add form: typing enables OK", await ev(`document.querySelector('.add-card .btn-primary').disabled === false`));
await click('.av-opt[data-avatar="strawberry"]');
check("add form: chosen picture is marked", await ev(`document.querySelector('.av-opt.on').dataset.avatar === 'strawberry'`));
await ev(`__app.store.update(d => ({ ...d, settings: { ...d.settings, limits: { ...d.settings.limits, sessionMin: 600 } } }))`);
await shot("ui-5-add-form");
await click(".add-card .btn-primary");
check("child 1 added (name + picture) and form closed", (await names()) === "Bình" && (await ev(`Object.values(__app.store.data.profiles)[0].avatar`)) === "strawberry" && await ev(`!document.querySelector('.overlay')`));
check("picker shows the child and the add tile", await ev(`document.querySelectorAll('.kid[data-profile]').length === 1 && !!document.querySelector('#add-friend')`));

await click("#add-friend");
await typeName("An");
await key("Enter", { code: "Enter", windowsVirtualKeyCode: 13, text: "\r" });
check("child 2 added with Enter (default picture)", (await names()) === "Bình,An" && (await ev(`Object.values(__app.store.data.profiles)[1].avatar`)) === "rocket");
await click("#add-friend");
await sleep(150);
await click(".add-card .btn-secondary");
check("add form: Huỷ closes without adding", (await names()) === "Bình,An" && await ev(`!document.querySelector('.overlay')`));

// seed different progress for the two children (what the play loop will do in step 3)
await ev(`(async () => {
  const { recordSet } = await import('/src/core/profiles.ts');
  const d = __app.store.data, [a] = d.order, now = Date.now(), today = __app.today();
  const sum = (score, stars) => ({ seed: {tier:1,step:0}, score, total: 5, stars, nextSeed: {tier:1,step:1}, peakTier: 2, firstTries: [] });
  let p = recordSet(d.profiles[a], 'scale', sum(5, 3), d.settings, now, today);
  p = recordSet(p, 'robot', sum(2, 1), d.settings, now, today);
  __app.store.update(x => ({ ...x, profiles: { ...x.profiles, [a]: p } }));
})()`);
await goHash("#/who");
await shot("ui-5-picker");
const idOf = (name) => ev(`Object.values(__app.store.data.profiles).find(p => p.name === ${JSON.stringify(name)}).id`);
const binhId = await idOf("Bình"), anId = await idOf("An");
// the guide (i) opens by itself the first time a child plays a game: mark it seen here, section 14 tests it
const markGuidesSeen = (id) => ev(`__app.store.update(d => ({ ...d, profiles: { ...d.profiles, [${JSON.stringify(id)}]: { ...d.profiles[${JSON.stringify(id)}], games: Object.fromEntries(Object.entries(d.profiles[${JSON.stringify(id)}].games).map(([k, g]) => [k, { ...g, seenGuide: true }])) } } }))`);
await markGuidesSeen(binhId); await markGuidesSeen(anId);
await click(`.kid[data-profile="${binhId}"]`);
check("tapping a child opens home as that child", (await ev(`location.hash`)) === "#/home" && (await ev(`document.querySelector('#greeting').textContent`)) === "Chào thám tử nhí Bình!" && (await ev(`__app.store.data.activeId`)) === binhId);
const chips = async () => (await ev(`[...document.querySelectorAll('.chip')].map(c => c.textContent.trim()).join('|')`)).replace(/còn \d+ phút/, 'còn N phút');
check("home shows that child's stars, streak and time", (await chips()) === "4 sao|1 ngày liền|còn N phút", await chips());
check("home: six tiles; all six games are playable", await ev(`document.querySelectorAll('.tile').length === 6 && document.querySelectorAll('.tile.soon').length === 0 && !document.querySelector('.tile[data-game=split]').classList.contains('soon') && [...document.querySelectorAll('.tile h3')].map(h => h.textContent).join(',') === 'Cái cân,Rô-bốt,Giỏ trái cây,Tính theo hình,Mấy và mấy,So sánh cân'`));
check("home: week strip has today marked and one starred day", await ev(`document.querySelectorAll('.week span').length === 7 && document.querySelectorAll('.week .is-today').length === 1 && document.querySelectorAll('.week .ok').length === 1`));
check("home: padlock present, speaker works", await ev(`!!document.querySelector('.gate-btn') && !!document.querySelector('.speaker')`));
await shot("ui-5-home");

await click("#who-chip");
check("tapping the child chip goes back to the picker", (await ev(`location.hash`)) === "#/who");
await click(`.kid[data-profile="${anId}"]`);
check("second child sees their own stars and streak", (await chips()) === "0 sao|Chuỗi mới nào!|còn N phút" && (await ev(`document.querySelector('#greeting').textContent`)) === "Chào thám tử nhí An!", await chips());

await nav(URL_BASE);
check("reload keeps the last child (home, not the picker)", (await ev(`!!document.querySelector('.screen-home') && document.querySelector('#greeting').textContent`)) === "Chào thám tử nhí An!");

// dev-only look of ready tiles
await nav(URL_BASE + "?allready");
check("?allready (dev): tiles playable; unplayed ones are 'Mới!'", await ev(`document.querySelectorAll('.tile.soon').length === 0 && document.querySelectorAll('.tile .new').length === 6`));
await ev(`__app.store.setActive(${JSON.stringify(binhId)}); __app.go('home')`);
await sleep(300);
check("?allready (dev): played games show best stars (3 and 1)", await ev(`document.querySelector('.tile[data-game=scale] .got img:not(.dim)') !== null && document.querySelectorAll('.tile[data-game=scale] .got img:not(.dim)').length === 3 && document.querySelectorAll('.tile[data-game=robot] .got img:not(.dim)').length === 1 && document.querySelectorAll('.tile[data-game=basket] .new').length === 1`));
await shot("ui-5-home-ready");

// many children: pages of 8
await ev(`for (let i = 3; i <= 10; i++) __app.store.addProfile('Bạn ' + i, 'kite')`);
await goHash("#/who");
check("picker: first page holds 8 tiles, pager shown", await ev(`document.querySelectorAll('.kid').length === 8 && !!document.querySelector('#page-next') && document.querySelector('#page-prev').disabled === true`));
await click("#page-next");
check("picker: second page holds the rest including the add tile", await ev(`document.querySelectorAll('.kid').length === 3 && !!document.querySelector('#add-friend') && document.querySelector('#page-next').disabled === true`));
await shot("ui-5-picker-page2");

// guard: nobody chosen → guarded routes go to the picker
await ev(`__app.store.setActive(null)`);
await goHash("#/home");
check("guard: home without a chosen child goes to the picker", await ev(`!!document.querySelector('.screen-who') && !document.querySelector('.screen-home')`));

// ---------- 6. play whole sets of Mấy và mấy (step 3) ----------
const waitFor = async (expr, ms = 5000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await ev(expr)) return true; await sleep(80); } return false; };
const typeNumber = async (n) => { for (const d of String(n)) await click(`#numpad [data-n="${d}"]`); };
const readSplit = () => ev(`(() => {
  const mode = document.querySelector('.sp').dataset.mode;
  const boxes = [...document.querySelectorAll('.sp-sent .answer-box')].map(b => b.dataset.slot);
  const given = [...document.querySelectorAll('.sp-sent .given')].map(g => +g.textContent);
  const kinds = {};
  document.querySelectorAll('.sp-item').forEach(i => { kinds[i.dataset.kind] = (kinds[i.dataset.kind] || 0) + 1; });
  return { mode, boxes, given, items: document.querySelectorAll('.sp-item').length, kinds, tier: document.querySelector('.tier-badge').textContent };
})()`);
/** The right answer for each blank, worked out from what is on screen (like a child would). */
const solutionOf = (q) => {
  if (q.mode === "picture") return { whole: q.items };
  if (q.mode === "picture+bond") return { a: q.kinds[0] || 0, b: q.kinds[1] || 0 };
  return { [q.boxes[0]]: q.given[0] - q.given[1] };
};
const fillAnswer = async (q, { wrong = false } = {}) => {
  const sol = solutionOf(q);
  for (let i = 0; i < q.boxes.length; i++) {
    const slot = q.boxes[i];
    if (i > 0) await click(`.answer-box[data-slot="${slot}"]`);
    await typeNumber(sol[slot] + (wrong && i === 0 ? 1 : 0));
  }
};
const overlayKind = async () => { await waitFor(`!!document.querySelector('.overlay[data-kind]')`, 15000); return ev(`document.querySelector('.overlay').dataset.kind`); };
const closeOverlay = async () => { await click(".overlay [data-close]"); await sleep(120); };
const nextQuestionReady = () => waitFor(`!document.querySelector('.overlay') && !!document.querySelector('.sp .answer-box') && !document.querySelector('.answer-box.right, .answer-box.wrong')`);
const questionIndex = () => ev(`document.querySelectorAll('.dots .done').length`);
const profileOf = (id) => ev(`JSON.parse(JSON.stringify(__app.store.data.profiles[${JSON.stringify(id)}]))`);

// An has never played; play as An
await ev(`__app.store.setActive(${JSON.stringify(anId)}); __app.go('home')`);
await sleep(400);
await click(".tile[data-game=split]");
check("tapping the Mấy và mấy tile opens the play screen", (await ev(`location.hash`)) === "#/play/split" && (await waitFor(`!!document.querySelector('.sp .answer-box')`)));
await shot("ui-6-play-first-question");
check("play screen: Vòng 1, 5 dots, prompt, guide button, speaker", await ev(`document.querySelector('.tier-badge').textContent === 'Vòng 1' && document.querySelectorAll('.dots span').length === 5 && !!document.querySelector('.prompt span').textContent && !!document.querySelector('.btn-round.info') && !!document.querySelector('.speaker')`));
await click(".btn-round.info");
check("guide (i) opens with the game's steps and closes", (await ev(`document.querySelectorAll('.overlay ol li').length`)) === 4);
await closeOverlay();
// tapping an item marks it as counted
await click(".sp-item");
check("tapping a flower marks it as counted", await ev(`document.querySelectorAll('.sp-item.counted').length === 1`));
// pressing Xong with nothing typed does not count as an answer
await click("#xong");
check("Xong with an empty box is not an answer (no overlay, still question 1)", (await ev(`!document.querySelector('.overlay')`)) && (await questionIndex()) === 0);

// --- set 1: all correct ---
const tiers1 = [];
for (let i = 0; i < 5; i++) {
  const q = await readSplit();
  tiers1.push(q.tier);
  await fillAnswer(q);
  await click("#xong");
  const kind = await overlayKind();
  check(`set 1, question ${i + 1}: correct answer is praised`, kind === "correct", kind);
  if (i === 0) await shot("ui-6-feedback-correct");
  await closeOverlay();
  if (i < 4) await nextQuestionReady();
}
check("set 1: difficulty rose after the first correct answer (Vòng 1 then 2)", tiers1.join() === "Vòng 1,Vòng 2,Vòng 2,Vòng 2,Vòng 2", tiers1.join());
check("set 1: star screen shows 3 stars, 5/5 and the streak", await waitFor(`!!document.querySelector('.screen-stars')`) && (await ev(`document.querySelectorAll('.star-row img:not(.dim)').length`)) === 3 && (await ev(`document.querySelector('.score').textContent`)) === "Em trả lời đúng 5/5 câu" && (await ev(`document.querySelector('.chip.fire').textContent.trim()`)) === "1 ngày liền");
await shot("ui-6-stars");
const an1 = await profileOf(anId);
check("set 1 saved: 3 stars, 1 set, seed moved up one step, history", an1.stars === 3 && an1.games.split.sets === 1 && an1.games.split.bestStars === 3 && an1.games.split.seed.tier === 1 && an1.games.split.seed.step === 1 && an1.history.length === 1 && an1.history[0].score === 5);
await click("#back-home");
check("back to home: the tile shows the best stars and the new total", (await ev(`!!document.querySelector('.screen-home')`)) && (await chips()) === "3 sao|1 ngày liền|còn N phút" && (await ev(`document.querySelectorAll('.tile[data-game=split] .got img:not(.dim)').length`)) === 3, await chips());

// --- set 2: wrong then right (retry), out of tries (reveal), then correct ---
await click(".tile[data-game=split]");
await nextQuestionReady();
let q = await readSplit();
await fillAnswer(q, { wrong: true });
await click("#xong");
check("wrong first try: retry card, not the answer", (await overlayKind()) === "retry" && (await ev(`document.querySelector('.overlay h2').textContent`)) === "Gần đúng rồi!");
check("wrong first try: the mistaken box is marked red", await ev(`document.querySelectorAll('.answer-box.wrong').length >= 1`));
await shot("ui-6-feedback-retry");
await closeOverlay();
check("retry: the wrong box is cleared and editable again", await ev(`!document.querySelector('.answer-box.wrong') && [...document.querySelectorAll('.answer-box')].some(b => b.dataset.v === '' || b.dataset.v === undefined)`));
check("retry: still question 1", (await questionIndex()) === 0);
// refill only what is empty
const emptySlots = await ev(`[...document.querySelectorAll('.answer-box')].filter(b => !b.dataset.v).map(b => b.dataset.slot)`);
const sol1 = solutionOf(q);
for (let i = 0; i < emptySlots.length; i++) { if (i > 0 || emptySlots[0] !== q.boxes[0]) await click(`.answer-box[data-slot="${emptySlots[i]}"]`); await typeNumber(sol1[emptySlots[i]]); }
await click("#xong");
check("right on the retry: praised, moves on", (await overlayKind()) === "correct");
await closeOverlay();
await nextQuestionReady();
check("question 2 shown", (await questionIndex()) === 1);
// question 2: wrong twice → reveal
q = await readSplit();
await fillAnswer(q, { wrong: true });
await click("#xong");
check("question 2 first wrong: retry", (await overlayKind()) === "retry");
await closeOverlay();
await click(`.answer-box[data-slot="${q.boxes[0]}"]`);
await typeNumber(solutionOf(q)[q.boxes[0]] + 1);
await click("#xong");
check("question 2 second wrong: the answer is revealed", (await overlayKind()) === "reveal" && (await ev(`document.querySelectorAll('.answer-box.right').length`)) === q.boxes.length);
const revealed = await ev(`[...document.querySelectorAll('.answer-box')].map(b => b.dataset.slot + '=' + b.dataset.v).join()`);
const wantRevealed = q.boxes.map((slot) => `${slot}=${solutionOf(q)[slot]}`).join();
check("reveal shows the correct numbers", revealed === wantRevealed, `${revealed} vs ${wantRevealed}`);
await closeOverlay();
await nextQuestionReady();
for (let i = 2; i < 5; i++) {
  const qq = await readSplit();
  await fillAnswer(qq);
  await click("#xong");
  await overlayKind();
  await closeOverlay();
  if (i < 4) await nextQuestionReady();
}
check("set 2: star screen after the last question", await waitFor(`!!document.querySelector('.screen-stars')`));
const an2 = await profileOf(anId);
const lastSetRecord = an2.history[an2.history.length - 1];
check("set 2: retries and revealed answers do not count (score 3 of 5, 2 stars)", lastSetRecord.score === 3 && lastSetRecord.stars === 2 && an2.stars === 5 && an2.games.split.sets === 2 && an2.games.split.bestStars === 3, JSON.stringify(lastSetRecord));
check("set 2: today's streak still 1 (one day)", (await ev(`document.querySelector('.chip.fire') === null || document.querySelector('.chip.fire').textContent.trim()`)) !== "2 ngày liền");
await click("#back-home");

// --- leaving a set early saves nothing ---
await click(".tile[data-game=split]");
await nextQuestionReady();
q = await readSplit();
await fillAnswer(q);
await click("#xong");
await overlayKind();
await closeOverlay();
await nextQuestionReady();
await click(".topbar .btn-round:first-child");
check("back button leaves the set; nothing is saved", (await ev(`!!document.querySelector('.screen-home')`)) && (await profileOf(anId)).history.length === 2 && (await profileOf(anId)).stars === 5);

// --- routes ---
await ev(`location.hash = '#/play/nonsense'`); await sleep(400);
check("an unknown game goes home", await ev(`!!document.querySelector('.screen-home')`));
await ev(`location.hash = '#/stars'`); await sleep(400);
check("the star screen with no finished set goes home", await ev(`!!document.querySelector('.screen-home')`));
await ev(`__app.store.setActive(null)`);
await ev(`location.hash = '#/play/split'`); await sleep(400);
check("guard: playing with no child chosen goes to the picker", await ev(`!!document.querySelector('.screen-who')`));
await ev(`__app.store.setActive(${JSON.stringify(anId)})`);

// --- dev preview route (one deterministic question) ---
await ev(`location.hash = '#/dev/split/2/1/7'`); await sleep(500);
check("dev route: tier 2 question, same every time", await ev(`document.querySelector('.sp').dataset.mode === 'picture+bond' && document.querySelectorAll('.sp-item').length === 3`));
await click("#dev-solve");
await sleep(1500);
check("dev route: 'Giải' fills the correct answer", (await ev(`document.querySelector('#dev-status').textContent`)) === "revealed" && (await ev(`document.querySelectorAll('.answer-box.right').length`)) === 2);
await ev(`location.hash = '#/dev/split/1/2/5'`); await sleep(500);
await typeNumber(1);
await click("#xong");
check("dev route: a wrong answer is judged but nothing is saved", await waitFor(`document.querySelector('#dev-status').textContent.startsWith('✘')`) && (await profileOf(anId)).history.length === 2);

// ---------- 7. Tính theo hình (step 4) ----------
const readEq = () => ev(`(() => {
  const rows = [...document.querySelectorAll('.eq-row.clue')].map(r => ({ fruits: r.dataset.fruits.split(','), total: +r.dataset.total }));
  const known = [...document.querySelectorAll('.eq-known .kv')].map(k => ({ fruit: k.dataset.fruit, value: +k.dataset.value }));
  const ask = document.querySelector('.eq-row.q').dataset.ask.split(',');
  return { rows, known, ask, tier: document.querySelector('.tier-badge').textContent };
})()`);
/** What a careful child would do: find the fruit values that fit every clue, then add up the question. */
const solveEq = (q) => {
  const knownV = Object.fromEntries(q.known.map((k) => [k.fruit, k.value]));
  const unknown = [...new Set([...q.rows.flatMap((r) => r.fruits), ...q.ask])].filter((f) => !(f in knownV));
  const answers = new Set();
  const v = { ...knownV };
  const rec = (i) => {
    if (i === unknown.length) {
      if (q.rows.every((r) => r.fruits.reduce((t, f) => t + v[f], 0) === r.total)) answers.add(q.ask.reduce((t, f) => t + v[f], 0));
      return;
    }
    for (let x = 0; x <= 10; x++) { v[unknown[i]] = x; rec(i + 1); }
  };
  rec(0);
  return answers;
};
const eqReady = () => waitFor(`!document.querySelector('.overlay') && !!document.querySelector('.eq-row.q') && !document.querySelector('.answer-box.right, .answer-box.wrong')`);

await ev(`location.hash = '#/home'`); await sleep(400);
check("home: the equations tile is playable", await ev(`!document.querySelector('.tile[data-game=equations]').classList.contains('soon')`));
await click(".tile[data-game=equations]");
await eqReady();
await shot("ui-7-equations-first");
check("equations: question row, answer box, numpad, Xong; Vòng 1 has the value table", await ev(`!!document.querySelector('.eq-row.q .answer-box') && document.querySelectorAll('#numpad button').length === 11 && !!document.querySelector('#xong') && !!document.querySelector('.eq-known')`));
await click("#xong");
check("equations: Xong with an empty box is not an answer", (await ev(`!document.querySelector('.overlay')`)) && (await questionIndex()) === 0);

const eqTiers = [], eqUnique = [];
for (let i = 0; i < 5; i++) {
  const eq = await readEq();
  eqTiers.push(eq.tier);
  const answers = solveEq(eq);
  eqUnique.push(answers.size);
  await typeNumber([...answers][0]);
  await click("#xong");
  const kind = await overlayKind();
  check(`equations set, question ${i + 1}: correct answer is praised`, kind === "correct", kind);
  if (i === 2) await shot("ui-7-equations-feedback");
  await closeOverlay();
  if (i < 4) await eqReady();
}
check("equations: every puzzle on screen has exactly one answer", eqUnique.every((n) => n === 1), eqUnique.join());
check("equations: starts at Vòng 1 and rises after a correct answer", eqTiers[0] === "Vòng 1" && eqTiers[1] === "Vòng 2", eqTiers.join());
check("equations: star screen, 3 stars", (await waitFor(`!!document.querySelector('.screen-stars')`)) && (await ev(`document.querySelectorAll('.star-row img:not(.dim)').length`)) === 3);
const an3 = await profileOf(anId);
check("equations set saved (seed moved, history grew)", an3.games.equations.sets === 1 && an3.games.equations.bestStars === 3 && an3.games.equations.seed.step === 1 && an3.history.length === 3 && an3.history[2].game === "equations", JSON.stringify(an3.games.equations));
await click("#back-home");

// a wrong answer: retry card, red box, cleared and editable again
await click(".tile[data-game=equations]");
await eqReady();
const eq2 = await readEq();
const right = [...solveEq(eq2)][0];
await typeNumber(right + 1);
await click("#xong");
check("equations: wrong answer → retry card, box turns red", (await overlayKind()) === "retry" && (await ev(`!!document.querySelector('#eq-answer.wrong')`)));
await closeOverlay();
check("equations: after retry the box is empty and editable", (await ev(`document.querySelector('#eq-answer').dataset.v`)) === "" && (await ev(`!document.querySelector('#eq-answer.wrong')`)));
await typeNumber(right);
await click("#xong");
check("equations: right on the retry is praised", (await overlayKind()) === "correct");
await closeOverlay();
await click(".topbar .btn-round:first-child");
check("equations: leaving early saves nothing", (await profileOf(anId)).history.length === 3);

// dev route at Vòng 3: a chain of clues, 'Giải' shows the answer
await ev(`location.hash = '#/dev/equations/3/1/9'`); await sleep(500);
check("dev route: Vòng 3 shows a chain of at least 3 clues", (await ev(`document.querySelectorAll('.eq-row.clue').length`)) >= 3);
const eq3 = await readEq();
await click("#dev-solve");
await sleep(1500);
check("dev route: 'Giải' fills the one correct answer", (await ev(`document.querySelector('#eq-answer').dataset.v`)) === String([...solveEq(eq3)][0]) && (await ev(`!!document.querySelector('#eq-answer.right')`)));

// ---------- 8. Giỏ trái cây (step 5) ----------
const readBasket = () => ev(`(() => {
  const a = document.querySelector('.bk-ask');
  return { want: JSON.parse(a.dataset.want), tens: a.dataset.tens, tier: document.querySelector('.tier-badge').textContent, prompt: a.querySelector('.bubble span').textContent };
})()`);
const tallyOf = (sideName) => ev(`(() => { const t = {}; document.querySelectorAll('.bk-basket.${sideName} [data-item]').forEach(i => { t[i.dataset.k] = (t[i.dataset.k] || 0) + Number(i.dataset.n); }); return t; })()`);
const bagCount = (sideName) => ev(`document.querySelectorAll('.bk-basket.${sideName} [data-bag]').length`);
/** Tap a fruit (or bag) in the child's basket, then tap Mèo's basket: the tap-then-tap way of moving. */
const give = async (selector) => { await click(`.bk-basket.L ${selector}`); await click(".bk-basket.R"); };
const giveAmount = async (want, { bags = true } = {}) => {
  for (const [kind, n] of Object.entries(want)) {
    let left = n;
    if (kind === "tangerine" && bags) while (left >= 10 && (await bagCount("L")) > 0) { await give(".bk-bag"); left -= 10; }
    for (let i = 0; i < left; i++) await give(`.bk-fruit[data-k="${kind}"]`);
  }
};
const basketReady = () => waitFor(`!document.querySelector('.overlay') && !!document.querySelector('.bk-ask') && !document.querySelector('.bk-basket.right, .bk-basket.wrong')`);

await ev(`location.hash = '#/home'`); await sleep(400);
await click(".tile[data-game=basket]");
await basketReady();
await shot("ui-8-basket-first");
check("basket: Mèo's bubble with the request replaces the prompt bar", await ev(`!!document.querySelector('.bk-ask .bubble') && document.querySelector('.prompt').hidden === true && document.querySelector('.bk-ask .bubble span').textContent.startsWith('Đưa cho Mèo')`));
check("basket: two baskets, the child's holds fruit, Mèo's is empty", (await ev(`document.querySelectorAll('.bk-basket.L .bk-fruit').length`)) > 0 && (await ev(`document.querySelectorAll('.bk-basket.R [data-item]').length`)) === 0);
check("basket: the picture panel is hidden at first", await ev(`!document.querySelector('.bk-panel.show')`));

// Vòng 1 shows live counts that follow the fruit
let b = await readBasket();
const kind1 = Object.keys(b.want)[0];
const stock = (await tallyOf("L"))[kind1];
await give(`.bk-fruit[data-k="${kind1}"]`);
check("Vòng 1: each basket shows a live count that follows the fruit", (await ev(`document.querySelector('.bk-basket.R .bk-counts').textContent.trim()`)) === "1" && (await ev(`document.querySelector('.bk-basket.L .bk-counts').textContent.trim()`)) === String(stock - 1));
// moving it back works too (tap it in Mèo's basket, then tap the child's basket)
await click(".bk-basket.R [data-item]");
await click(".bk-basket.L");
check("a fruit can be moved back", (await ev(`document.querySelectorAll('.bk-basket.R [data-item]').length`)) === 0);
// drag with the mouse also works
const [dx1, dy1] = await center(`.bk-basket.L .bk-fruit[data-k="${kind1}"]`);
const [dx2, dy2] = await center(".bk-basket.R");
await mouse("mousePressed", dx1, dy1);
for (let i = 1; i <= 6; i++) { await mouse("mouseMoved", dx1 + ((dx2 - dx1) * i) / 6, dy1 + ((dy2 - dy1) * i) / 6); await sleep(16); }
await mouse("mouseReleased", dx2, dy2); await sleep(100);
check("a fruit can be dragged to Mèo's basket", (await ev(`document.querySelectorAll('.bk-basket.R [data-item]').length`)) === 1);
await click(".bk-basket.R [data-item]"); await click(".bk-basket.L"); // put it back

// muting the sound shows the request in pictures
await click(".speaker");
check("sound off: the panel shows the number with its picture", (await ev(`!!document.querySelector('.bk-panel.show') && document.querySelectorAll('.bk-panel img').length >= 1`)) && (await ev(`document.querySelector('.bk-panel .num').textContent`)) === String(b.want[kind1]));
await shot("ui-8-basket-panel");
await click(".speaker");
check("sound on again: the panel goes away", await ev(`!document.querySelector('.bk-panel.show')`));

// --- set 1: all correct (bags used for tens) ---
const bTiers = [];
let sawTensReading = false, usedBag = false;
for (let i = 0; i < 5; i++) {
  b = await readBasket();
  bTiers.push(b.tier);
  await giveAmount(b.want);
  if (b.tens) usedBag = usedBag || (await bagCount("R")) > 0;
  await click("#xong");
  const kind = await overlayKind();
  check(`basket set, question ${i + 1}: exact amount is praised`, kind === "correct", kind + " " + JSON.stringify(b.want));
  if (b.tens) sawTensReading = sawTensReading || /chục.* là \d+ quả cam/.test(await ev(`document.querySelector('.overlay p').textContent`));
  if (i === 1) await shot("ui-8-basket-feedback");
  await closeOverlay();
  if (i < 4) await basketReady();
}
check("basket: starts at Vòng 1 and rises", bTiers[0] === "Vòng 1" && bTiers[1] === "Vòng 2", bTiers.join());
check("basket: Vòng 2 praise names the amount both ways (…chục … là N quả cam)", sawTensReading);
check("basket: tens were given as bags", usedBag);
check("basket: star screen, 3 stars; set saved", (await waitFor(`!!document.querySelector('.screen-stars')`)) && (await ev(`document.querySelectorAll('.star-row img:not(.dim)').length`)) === 3 && (await profileOf(anId)).games.basket.sets === 1);
await click("#back-home");

// --- set 2: too many → retry with the picture panel; then reveal ---
await click(".tile[data-game=basket]");
await basketReady();
b = await readBasket();
await giveAmount(b.want);
const extraKind = Object.keys(b.want)[0];
await give(`.bk-fruit[data-k="${extraKind}"]`); // one too many
await click("#xong");
check("one too many: retry card says there are too many", (await overlayKind()) === "retry" && /nhiều quá/.test(await ev(`document.querySelector('.overlay p').textContent`)));
await closeOverlay();
check("after a wrong try the picture panel appears (even with sound on)", await ev(`!!document.querySelector('.bk-panel.show')`));
await shot("ui-8-basket-retry");
await click(".bk-basket.R [data-item]"); await click(".bk-basket.L"); // take one back
await click("#xong");
check("fixed after the retry: praised", (await overlayKind()) === "correct");
await closeOverlay();
await basketReady();
// question 2: wrong twice → reveal moves the right fruit across
b = await readBasket();
await click("#xong"); // empty basket is wrong unless the request is zero
const k2 = await overlayKind();
await closeOverlay();
if (k2 === "retry") {
  await click("#xong");
  check("empty basket twice: the answer is revealed", (await overlayKind()) === "reveal");
  const tr = await tallyOf("R");
  const sum = (o) => Object.entries(o).filter(([, v]) => v > 0).map(([k, v]) => `${k}:${v}`).sort().join();
  check("reveal puts exactly the requested fruit in Mèo's basket", sum(tr) === sum(b.want), `${sum(tr)} vs ${sum(b.want)}`);
  await closeOverlay();
}
await ev(`location.hash = '#/home'`); await sleep(300);

// --- dev route: tens rules and the empty-basket question ---
const devSeedWhere = async (tier, step, pred, max = 80) => {
  for (let sd = 1; sd <= max; sd++) {
    await ev(`location.hash = '#/dev/basket/${tier}/${step}/${sd}'`);
    await waitFor(`!!document.querySelector('#dev-status') && document.querySelector('#dev-status').textContent.includes('seed ${sd}') && !!document.querySelector('.bk-ask')`);
    const r = await readBasket();
    if (pred(r)) return sd;
  }
  return null;
};
const seedTen = await devSeedWhere(2, 0, (r) => r.tens === "wholeTens" && r.want.tangerine === 10);
check("dev: found a 'một chục' question", seedTen !== null);
const looseCount = await ev(`document.querySelectorAll('.bk-basket.L .bk-fruit').length`);
check("dev: the child's basket holds 2 to 9 loose oranges, never ten (a chục must come from a bag)", looseCount >= 2 && looseCount <= 9 && (await bagCount("L")) === 2, String(looseCount));
for (let i = 0; i < looseCount; i++) await give('.bk-fruit[data-k="tangerine"]');
await click("#xong");
check("dev: every loose orange together is still too few for a chục", await waitFor(`document.querySelector('#dev-status').textContent === '✘ tooFew'`));
await ev(`__app.go('dev/basket/2/0/${seedTen}')`); await waitFor(`document.querySelector('#dev-status').textContent.includes('Vòng 2')`); await sleep(300);
await give(".bk-bag");
await click("#xong");
check("dev: one bag is accepted as one chục", await waitFor(`document.querySelector('#dev-status').textContent === '✔ exact'`));
const seedZero = await devSeedWhere(3, 2, (r) => Object.values(r.want).every((v) => v === 0), 120);
check("dev: found a 'không quả …' question", seedZero !== null);
if (seedZero !== null) {
  await click("#xong");
  check("dev: giving nothing is right when Mèo asks for none", await waitFor(`document.querySelector('#dev-status').textContent === '✔ exact'`));
  await ev(`__app.go('dev/basket/3/2/${seedZero}')`); await waitFor(`document.querySelector('#dev-status').textContent.includes('Vòng 3')`); await sleep(300);
  await give('.bk-fruit');
  await click("#xong");
  check("dev: giving one anyway is too many", await waitFor(`document.querySelector('#dev-status').textContent === '✘ tooMany'`));
}
await ev(`__app.go('dev/basket/2/1/5')`); await waitFor(`document.querySelector('#dev-status').textContent.includes('seed 5')`); await sleep(300);
const bd = await readBasket();
await click("#dev-solve");
await sleep(2500);
const trd = await tallyOf("R");
check("dev: 'Giải' moves exactly the requested amount across", Object.entries(bd.want).every(([k, v]) => (trd[k] ?? 0) === v), JSON.stringify(trd) + JSON.stringify(bd.want));

// the panel in Vòng 2 also shows the bags
await ev(`__app.go('dev/basket/2/1/3')`); await waitFor(`document.querySelector('#dev-status').textContent.includes('seed 3')`); await sleep(300);
await click(".speaker");
check("Vòng 2 panel: the number, and the bags with the ones underneath", (await ev(`!!document.querySelector('.bk-panel.show .row.sub .bk-minibag')`)) && /^\d+$/.test(await ev(`document.querySelector('.bk-panel .num').textContent`)));
await shot("ui-8-basket-panel-t2");
await click(".speaker");

// ---------- 9. Cái cân (step 6) ----------
const readScale = () => ev(`(() => {
  const w = (sel) => [...document.querySelectorAll(sel)].map(i => Number(i.dataset.w));
  return { tier: document.querySelector('.tier-badge').textContent, left: w('.sc-pan.L [data-fixed]'), right: w('.sc-pan.R [data-fixed]'),
    tray: [...document.querySelectorAll('.sc-tray .sc-fruit')].map(i => ({ k: i.dataset.k, w: Number(i.dataset.w) })), keyRows: document.querySelectorAll('.sc-key .row').length };
})()`);
const scaleWeights = () => ev(`(() => { const sum = (s) => [...document.querySelectorAll('.sc-pan.' + s + ' [data-item]')].reduce((a, i) => a + Number(i.dataset.w), 0); return { L: sum('L'), R: sum('R') }; })()`);
const beamAngle = async () => parseFloat(((await ev(`document.querySelector('.sc-beam').style.transform`)).match(/-?[\d.]+/) || ["0"])[0]);
/** The way a child does it: find fruit from the tray that makes up the difference and put it on the lighter pan. */
const solveScale = (q) => {
  const L = q.left.reduce((a, b) => a + b, 0), R = q.right.reduce((a, b) => a + b, 0), need = Math.abs(L - R);
  for (let mask = 1; mask < 1 << q.tray.length; mask++) {
    let w = 0; const pick = [];
    q.tray.forEach((t, i) => { if (mask & (1 << i)) { w += t.w; pick.push(t.k); } });
    if (w === need) return { side: L < R ? "L" : "R", heavier: L < R ? "R" : "L", pick };
  }
  return null;
};
const putOn = async (kinds, side) => { for (const k of kinds) { await click(`.sc-tray .sc-fruit[data-k="${k}"]`); await click(`.sc-pan.${side}`); } };
const scaleReady = (idx) => waitFor(`!document.querySelector('.overlay') && !!document.querySelector('.sc-beam') && document.querySelectorAll('.dots .done').length === ${idx}`);

await ev(`location.hash = '#/home'`); await sleep(400);
check("home: the scale tile is playable", await ev(`!document.querySelector('.tile[data-game=scale]').classList.contains('soon')`));
await click(".tile[data-game=scale]");
await scaleReady(0);
await shot("ui-9-scale-first");
let sq = await readScale();
check("scale Vòng 1: apples only, no weight table, scale tipped, sign and counts shown", sq.tier === "Vòng 1" && sq.keyRows === 0 && (await beamAngle()) !== 0 && /^[<>]$/.test(await ev(`document.querySelector('.sc-sign').textContent`)) && (await ev(`document.querySelectorAll('.sc-count').length`)) === 2);
check("scale Vòng 1: the padlock is not shown (it tips live)", await ev(`document.querySelector('.sc-lock').classList.contains('off')`));

// fruit already on the pans is fixed
const before = await scaleWeights();
const [fx1, fy1] = await center(".sc-pan.L [data-fixed]");
const [fx2, fy2] = await center(".sc-pan.R");
await mouse("mousePressed", fx1, fy1);
for (let i = 1; i <= 5; i++) { await mouse("mouseMoved", fx1 + ((fx2 - fx1) * i) / 5, fy1 + ((fy2 - fy1) * i) / 5); await sleep(16); }
await mouse("mouseReleased", fx2, fy2); await sleep(150);
check("fixed fruit cannot be dragged to the other pan", JSON.stringify(await scaleWeights()) === JSON.stringify(before));

// putting fruit on the heavier pan makes it worse, and it can be taken back
let plan = solveScale(sq);
await putOn([sq.tray[0].k], plan.heavier);
const worse = await scaleWeights();
check("fruit on the heavier pan widens the gap (live)", Math.abs(worse.L - worse.R) > Math.abs(before.L - before.R));
await click(`.sc-pan.${plan.heavier} [data-item]:not([data-fixed])`);
await click(".sc-tray");
check("fruit can be taken back to the tray", JSON.stringify(await scaleWeights()) === JSON.stringify(before));
// drag from the tray with the mouse
const [tx, ty] = await center(`.sc-tray .sc-fruit[data-k="${plan.pick[0]}"]`);
const [px, py] = await center(`.sc-pan.${plan.side}`);
await mouse("mousePressed", tx, ty);
for (let i = 1; i <= 6; i++) { await mouse("mouseMoved", tx + ((px - tx) * i) / 6, ty + ((py - ty) * i) / 6); await sleep(16); }
await mouse("mouseReleased", px, py); await sleep(150);
check("fruit can be dragged from the tray onto a pan", (await ev(`document.querySelectorAll('.sc-pan.${plan.side} [data-item]:not([data-fixed])').length`)) === 1);
await click(`.sc-pan.${plan.side} [data-item]:not([data-fixed])`); await click(".sc-tray"); // back to the tray

// --- set 1: all correct ---
const scTiers = [];
for (let i = 0; i < 5; i++) {
  sq = await readScale();
  scTiers.push(sq.tier);
  plan = solveScale(sq);
  if (sq.tier !== "Vòng 1") {
    check(`scale question ${i + 1} (${sq.tier}): weight table shown and the padlock holds the scale level`, sq.keyRows >= 2 && (await beamAngle()) === 0 && (await ev(`!document.querySelector('.sc-lock').classList.contains('off')`)));
  }
  await putOn(plan.pick, plan.side);
  if (sq.tier === "Vòng 1") check(`scale question ${i + 1}: the sign shows = when balanced`, (await ev(`document.querySelector('.sc-sign').textContent`)) === "=" && (await ev(`document.querySelector('.sc-sign').classList.contains('eq')`)));
  else check(`scale question ${i + 1}: still held level before Xong (the child must work it out)`, (await beamAngle()) === 0);
  await click("#xong");
  check(`scale set, question ${i + 1}: balanced is praised`, (await overlayKind()) === "correct");
  if (i === 1) await shot("ui-9-scale-feedback");
  await closeOverlay();
  if (i < 4) await scaleReady(i + 1);
}
check("scale: starts at Vòng 1 and rises", scTiers[0] === "Vòng 1" && scTiers[1] === "Vòng 2", scTiers.join());
check("scale: star screen, 3 stars; saved", (await waitFor(`!!document.querySelector('.screen-stars')`)) && (await ev(`document.querySelectorAll('.star-row img:not(.dim)').length`)) === 3 && (await profileOf(anId)).games.scale.sets === 1);
await click("#back-home");

// --- set 2: nothing added (still unbalanced) → hint says which side is heavier; then reveal ---
await click(".tile[data-game=scale]");
await scaleReady(0);
sq = await readScale();
plan = solveScale(sq);
await click("#xong");
check("unbalanced: retry card says which pan is still heavier", (await overlayKind()) === "retry" && /Đĩa bên (trái|phải) còn nặng hơn/.test(await ev(`document.querySelector('.overlay p').textContent`)));
await closeOverlay();
check("after the retry the scale is ready again (Vòng 1 stays live)", await ev(`!document.querySelector('.overlay')`));
await putOn(plan.pick, plan.side);
await click("#xong");
check("fixed after the retry: praised", (await overlayKind()) === "correct");
await closeOverlay();
await scaleReady(1);
sq = await readScale();
await click("#xong");
await overlayKind(); await closeOverlay();
if (sq.tier !== "Vòng 1") check("scale: after a wrong try the padlock is back (level again)", (await beamAngle()) === 0 && (await ev(`!document.querySelector('.sc-lock').classList.contains('off')`)));
await click("#xong");
check("scale: out of tries, the answer is revealed", (await overlayKind()) === "reveal");
const rw = await scaleWeights();
check("scale: the reveal balances the pans", rw.L === rw.R, JSON.stringify(rw));
await closeOverlay();
await ev(`location.hash = '#/home'`); await sleep(300);

// --- dev route: Vòng 3 has three kinds in the weight table; 'Giải' balances ---
await ev(`__app.go('dev/scale/3/1/6')`); await waitFor(`document.querySelector('#dev-status').textContent.includes('Vòng 3')`); await sleep(300);
check("dev: Vòng 3 weight table lists grapes, apple and watermelon", (await ev(`document.querySelectorAll('.sc-key .row').length`)) === 3);
await click("#dev-solve");
await sleep(2600);
const dw = await scaleWeights();
check("dev: 'Giải' balances the scale and opens the padlock", dw.L === dw.R && (await ev(`document.querySelector('.sc-lock').classList.contains('off')`)), JSON.stringify(dw));

// ---------- 10. Rô-bốt (step 7) ----------
const readRobot = () => ev(`(() => {
  const cells = [...document.querySelectorAll('.rb-cell')];
  return { size: Math.round(Math.sqrt(cells.length)), blocks: cells.filter(c => c.classList.contains('block')).map(c => c.dataset.rc),
    goal: document.querySelector('.rb-cell.goal').dataset.rc, walls: [...document.querySelectorAll('.rb-wall')].map(w => w.dataset.wall),
    start: document.querySelector('#bot').dataset.start, tier: document.querySelector('.tier-badge').textContent, slots: document.querySelectorAll('.rb-slot').length };
})()`);
const DELTA = { U: [-1, 0], D: [1, 0], L: [0, -1], R: [0, 1] };
const canStep = (q, r, c, d) => {
  const [dr, dc] = DELTA[d], nr = r + dr, nc = c + dc;
  if (nr < 0 || nc < 0 || nr >= q.size || nc >= q.size || q.blocks.includes(`${nr},${nc}`)) return false;
  if (d === "R" && q.walls.includes(`${r},${c},R`)) return false;
  if (d === "L" && q.walls.includes(`${r},${c - 1},R`)) return false;
  if (d === "D" && q.walls.includes(`${r},${c},D`)) return false;
  if (d === "U" && q.walls.includes(`${r - 1},${c},D`)) return false;
  return true;
};
/** A child's route: breadth-first search over what is drawn (blocks and walls read from the screen). */
const routeOf = (q) => {
  const [sr, sc] = q.start.split(",").map(Number);
  const seen = new Map([[q.start, null]]);
  const queue = [[sr, sc]];
  while (queue.length) {
    const [r, c] = queue.shift();
    if (`${r},${c}` === q.goal) break;
    for (const d of "UDLR") {
      if (!canStep(q, r, c, d)) continue;
      const k = `${r + DELTA[d][0]},${c + DELTA[d][1]}`;
      if (seen.has(k)) continue;
      seen.set(k, { from: `${r},${c}`, d });
      queue.push([r + DELTA[d][0], c + DELTA[d][1]]);
    }
  }
  const path = [];
  for (let k = q.goal; k !== q.start; k = seen.get(k).from) path.unshift(seen.get(k).d);
  return path;
};
const pressDirs = async (dirs) => { for (const d of dirs) await click(`.rb-pad [data-dir="${d}"]`); };
const filledSlots = () => ev(`document.querySelectorAll('.rb-slot.on').length`);
const botAt = () => ev(`document.querySelector('#bot').dataset.rc`);
const robotReady = (idx) => waitFor(`!document.querySelector('.overlay') && !!document.querySelector('.rb-board') && document.querySelectorAll('.dots .done').length === ${idx} && !document.querySelector('.rb-cell.ok')`);

await ev(`location.hash = '#/home'`); await sleep(400);
check("home: the robot tile is playable", await ev(`!document.querySelector('.tile[data-game=robot]').classList.contains('soon')`));
await click(".tile[data-game=robot]");
await robotReady(0);
await shot("ui-10-robot-first");
let rq = await readRobot();
check("robot Vòng 1: a 4×4 board with a flag, no walls, 12 empty step slots", rq.size === 4 && rq.walls.length === 0 && rq.slots === 12 && (await filledSlots()) === 0 && rq.tier === "Vòng 1");
check("robot: the robot starts on the bottom row", Number(rq.start.split(",")[0]) === rq.size - 1);

// arrow pad, keyboard, undo, limit
await pressDirs(["U", "R"]);
check("arrow pad adds steps to the program", (await filledSlots()) === 2);
await click('.rb-slot[data-i="1"]');
check("tapping the last step takes it back", (await filledSlots()) === 1);
await click("#clear");
await pressDirs(["U", "R", "U"]);
await click('.rb-slot[data-i="0"]');
check("only the LAST step can be taken back by tapping (a step in the middle stays)", (await filledSlots()) === 3);
await click("#clear");
await send("Input.dispatchKeyEvent", { type: "keyDown", key: "ArrowUp", code: "ArrowUp", windowsVirtualKeyCode: 38 });
await send("Input.dispatchKeyEvent", { type: "keyDown", key: "ArrowRight", code: "ArrowRight", windowsVirtualKeyCode: 39 });
check("keyboard arrows add steps", (await filledSlots()) === 2);
await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Backspace", code: "Backspace", windowsVirtualKeyCode: 8 });
check("Backspace removes the last step", (await filledSlots()) === 1);
await click("#clear");
for (let i = 0; i < 13; i++) await click('.rb-pad [data-dir="U"]');
check("a program holds at most 12 steps", (await filledSlots()) === 12);
await click("#clear");
check("Làm lại clears the program", (await filledSlots()) === 0);
await click("#run");
await sleep(500);
check("Chạy! with no steps is a nudge, not an answer", (await ev(`!document.querySelector('.overlay')`)) && (await questionIndex()) === 0);

// a step into the edge: the robot bumps and goes back; it is a wrong try with its own message
await pressDirs(["D"]);
await click("#run");
check("bumping into the edge: retry card says the robot was blocked", (await overlayKind()) === "retry" && /bị chặn/.test(await ev(`document.querySelector('.overlay p').textContent`)));
check("after the bump the robot is back at the start", (await botAt()) === rq.start);
await closeOverlay();
check("the program is kept after a wrong try so it can be fixed", (await filledSlots()) === 1);
await click("#clear");
let route = routeOf(rq);
await pressDirs(route);
await click("#run");
check("the whole route reaches the flag (right on the retry): praised", (await overlayKind()) === "correct");
check("the robot is on the flag and the flag square turns green", (await botAt()) === rq.goal && (await ev(`!!document.querySelector('.rb-cell.goal.ok')`)));
await closeOverlay();
await robotReady(1);

// --- rest of set 1: all correct ---
const rbTiers = [rq.tier];
for (let i = 1; i < 5; i++) {
  rq = await readRobot();
  rbTiers.push(rq.tier);
  route = routeOf(rq);
  if (i === 1) {
    // a program that stops short: only the first step of the route (this is the first wrong try of the question)
    await pressDirs([route[0]]);
    await click("#run");
    check("stopping short: retry card says the robot has not reached the flag", (await overlayKind()) === "retry" && /chưa tới/.test(await ev(`document.querySelector('.overlay p').textContent`)));
    await closeOverlay();
    check("the program (1 step) is kept; add the rest and run again", (await filledSlots()) === 1);
    await pressDirs(route.slice(1));
  } else {
    await pressDirs(route);
  }
  await click("#run");
  check(`robot set, question ${i + 1} (${rq.tier}): the route reaches the flag`, (await overlayKind()) === "correct");
  if (i === 2) await shot("ui-10-robot-walk-done");
  await closeOverlay();
  if (i < 4) await robotReady(i + 1);
}
check("robot: starts at Vòng 1 and rises to Vòng 2 after careful answers", rbTiers[0] === "Vòng 1" && rbTiers.includes("Vòng 2"), rbTiers.join());
check("robot: star screen, saved", (await waitFor(`!!document.querySelector('.screen-stars')`)) && (await profileOf(anId)).games.robot.sets === 1);
await click("#back-home");

// --- set 2: blocked twice → reveal shows the route ---
await click(".tile[data-game=robot]");
await robotReady(0);
rq = await readRobot();
await pressDirs(["D"]);
await click("#run");
await overlayKind(); await closeOverlay();
await click("#run");
check("blocked twice: the answer is revealed", (await overlayKind()) === "reveal");
route = routeOf(rq);
check("reveal shows the shortest route and the robot on the flag", (await filledSlots()) === route.length && (await botAt()) === rq.goal);
await closeOverlay();
await ev(`location.hash = '#/home'`); await sleep(300);

// --- dev route: a Vòng 2 level with walls ---
await ev(`__app.go('dev/robot/2/1/5')`); await waitFor(`document.querySelector('#dev-status').textContent.includes('Vòng 2')`); await sleep(300);
const dq = await readRobot();
check("dev: Vòng 2 level shows walls and bricks drawn from the question", dq.size === 5 && dq.walls.length >= 1 && dq.blocks.length >= 2, JSON.stringify(dq));
await click("#dev-solve");
check("dev: 'Giải' walks the shortest route to the flag", await waitFor(`document.querySelector('#bot').dataset.rc === '${dq.goal}' && document.querySelectorAll('.rb-slot.on').length === ${routeOf(dq).length}`, 20000));

// ---------- 11. So sánh cân (step 8) ----------
const readCompare = () => ev(`(() => ({
  mode: document.querySelector('.cp').dataset.mode, tier: document.querySelector('.tier-badge').textContent,
  items: [...document.querySelectorAll('.cp-choice')].map(c => c.dataset.k),
  scales: [...document.querySelectorAll('.cp-mini')].map(m => ({ l: m.dataset.left, r: m.dataset.right, h: m.dataset.heavier })) }))()`);
/** Lightest → heaviest, worked out from the scales on screen (follow the chain A<B, B<C …). */
const truthOf = (q) => {
  const boxes = [...new Set(q.scales.flatMap((x) => [x.l, x.r]))];
  const beats = new Set();
  for (const x of q.scales) beats.add(x.h === "left" ? `${x.l}>${x.r}` : `${x.r}>${x.l}`);
  for (let round = 0; round < boxes.length; round++) for (const a of boxes) for (const b of boxes) for (const c of boxes) if (beats.has(`${a}>${b}`) && beats.has(`${b}>${c}`)) beats.add(`${a}>${c}`);
  const wins = (b) => boxes.filter((o) => beats.has(`${b}>${o}`)).length;
  return [...boxes].sort((a, b) => wins(a) - wins(b));
};
const pickBox = (k) => click(`.cp-choice[data-k="${k}"]`);
const placeInOrder = async (order) => { for (const k of order) await pickBox(k); };
/** Answer like a child; with wrong = true give an answer that is certainly wrong. */
const answerCompare = async (q, { wrong = false } = {}) => {
  const truth = truthOf(q);
  if (q.mode === "order") {
    await placeInOrder(wrong ? [...truth].reverse() : truth);
    await click("#xong");
  } else {
    const target = q.mode === "heaviest" ? truth[truth.length - 1] : truth[0];
    await pickBox(wrong ? q.items.find((k) => k !== target) : target);
  }
};
const cpReady = (idx) => waitFor(`!document.querySelector('.overlay') && !!document.querySelector('.cp') && document.querySelectorAll('.dots .done').length === ${idx} && !document.querySelector('.cp-choice.right, .cp-choice.wrong, .cp-slot.right, .cp-slot.wrong')`);

await ev(`location.hash = '#/home'`); await sleep(400);
await click(".tile[data-game=compare]");
await cpReady(0);
await shot("ui-11-compare-first");
let cq = await readCompare();
check("compare Vòng 1: 3 boxes, 2 small scales, the heavier box always on the right", cq.tier === "Vòng 1" && cq.items.length === 3 && cq.scales.length === 2 && cq.scales.every((x) => x.h === "right"));
check("compare: the beam of each small scale tips toward the heavier box", await ev(`[...document.querySelectorAll('.cp-mini')].every(m => { const deg = parseFloat(m.querySelector('.cp-mbeam').style.transform.match(/-?[\\d.]+/)[0]); return m.dataset.heavier === 'right' ? deg > 0 : deg < 0; })`));
check("compare: Vòng 1 asks for the heaviest or the lightest", ["heaviest", "lightest"].includes(cq.mode));

// --- set 1: all correct ---
const cpModes = [];
for (let i = 0; i < 5; i++) {
  cq = await readCompare();
  cpModes.push(cq.mode);
  check(`compare question ${i + 1} (${cq.tier}, ${cq.mode}): the chain of scales gives one order`, truthOf(cq).length === cq.items.length);
  await answerCompare(cq);
  if (cq.mode === "order") check("compare: boxes placed in the slots, and the placed boxes are greyed out below", (await ev(`document.querySelectorAll('.cp-slot[data-k]').length`)) === cq.items.length && (await ev(`document.querySelectorAll('.cp-choice.used').length`)) === cq.items.length);
  check(`compare set, question ${i + 1}: right answer is praised`, (await overlayKind()) === "correct");
  if (i === 1) await shot("ui-11-compare-feedback");
  await closeOverlay();
  if (i < 4) await cpReady(i + 1);
}
check("compare: star screen, saved", (await waitFor(`!!document.querySelector('.screen-stars')`)) && (await profileOf(anId)).games.compare.sets === 1);
await click("#back-home");

// --- set 2: wrong then right; wrong twice → reveal ---
await click(".tile[data-game=compare]");
await cpReady(0);
cq = await readCompare();
await answerCompare(cq, { wrong: true });
check("a wrong answer: retry card with the hint", (await overlayKind()) === "retry" && /cân/.test(await ev(`document.querySelector('.overlay p').textContent`)));
await closeOverlay();
check("after a wrong try the answer is editable again", await ev(`!document.querySelector('.cp-choice.wrong, .cp-slot.wrong') && !document.querySelector('.overlay')`));
if (cq.mode === "order") await placeInOrder(truthOf(cq)); // reversed order: every slot was wrong, so all were cleared
await answerCompare(cq).catch(() => {});
await overlayKind();
await closeOverlay();
await cpReady(1);
cq = await readCompare();
await answerCompare(cq, { wrong: true });
await overlayKind(); await closeOverlay();
if (cq.mode === "order") await placeInOrder([...truthOf(cq)].reverse());
await answerCompare(cq, { wrong: true }).catch(() => {});
check("wrong twice: the answer is revealed", (await overlayKind()) === "reveal");
check("reveal marks the right box / fills the slots in the right order", cq.mode === "order"
  ? (await ev(`[...document.querySelectorAll('.cp-slot[data-k]')].map(s => s.dataset.k).join()`)) === truthOf(cq).join()
  : (await ev(`document.querySelector('.cp-choice.right')?.dataset.k`)) === (cq.mode === "heaviest" ? truthOf(cq).slice(-1)[0] : truthOf(cq)[0]));
await closeOverlay();
await ev(`location.hash = '#/home'`); await sleep(300);

// --- dev route: ordering details (Vòng 2, step 0 is always "order") ---
await ev(`__app.go('dev/compare/2/0/4')`); await waitFor(`document.querySelector('#dev-status').textContent.includes('Vòng 2')`); await sleep(300);
let cdq = await readCompare();
check("dev: Vòng 2 has 4 boxes and 3 scales, sides can be flipped", cdq.mode === "order" && cdq.items.length === 4 && cdq.scales.length === 3);
const dTruth = truthOf(cdq);
await click("#xong");
await sleep(400);
check("dev: Xong before all boxes are placed is a nudge, not an answer", (await ev(`document.querySelector('#dev-status').textContent.startsWith('compare')`)));
await pickBox(dTruth[0]); await pickBox(dTruth[1]);
await click('.cp-slot[data-i="0"]');
check("dev: tapping a placed box takes it out (the next ones shift left)", (await ev(`document.querySelectorAll('.cp-slot[data-k]').length`)) === 1 && (await ev(`document.querySelector('.cp-slot[data-i="0"]').dataset.k`)) === dTruth[1]);
await click('.cp-slot[data-i="0"]');
await placeInOrder([dTruth[0], dTruth[1], dTruth[3], dTruth[2]]); // last two swapped
await click("#xong");
check("dev: last two swapped is judged wrong", await waitFor(`document.querySelector('#dev-status').textContent === '✘ wrongOrder'`));
await sleep(1200);
check("dev: after the wrong try the correct start of the row stays (2 of 4), the rest is cleared", (await ev(`document.querySelectorAll('.cp-slot[data-k]').length`)) === 2 && (await ev(`document.querySelector('.cp-slot[data-i="0"]').dataset.k`)) === dTruth[0]);
await placeInOrder([dTruth[2], dTruth[3]]);
await click("#xong");
check("dev: finishing the row correctly is right", await waitFor(`document.querySelector('#dev-status').textContent === '✔ right'`));
await ev(`__app.go('dev/compare/1/0/3')`); await waitFor(`document.querySelector('#dev-status').textContent.includes('Vòng 1')`); await sleep(300);
cdq = await readCompare();
const dt = truthOf(cdq), dTarget = cdq.mode === "heaviest" ? dt[dt.length - 1] : dt[0];
await pickBox(cdq.items.find((k) => k !== dTarget));
check("dev: a wrong box is marked red and judged wrong", await waitFor(`document.querySelector('#dev-status').textContent === '✘ wrongPick'`) && (await ev(`!!document.querySelector('.cp-choice.wrong')`)));
await sleep(1200);
await pickBox(dTarget);
check("dev: the right box is judged right", await waitFor(`document.querySelector('#dev-status').textContent === '✔ right'`));
await ev(`__app.go('dev/compare/3/1/9')`); await waitFor(`document.querySelector('#dev-status').textContent.includes('Vòng 3')`); await sleep(300);
cdq = await readCompare();
check("dev: Vòng 3 shows three scales (shuffled) and can still be solved from them", cdq.scales.length === 3 && truthOf(cdq).length === cdq.items.length);
await click("#dev-solve");
await sleep(2000);
check("dev: 'Giải' shows the answer", (await ev(`document.querySelector('#dev-status').textContent`)) === "revealed");

// ---------- 12. screen time (step 9) ----------
// Tiny limits (seconds, not minutes) let the real clock be tested end to end.
const setLimits = (o) => ev(`__app.store.update(d => ({ ...d, settings: { ...d.settings, limits: { ...d.settings.limits, ...${JSON.stringify(o)} } } }))`);
const resetUsage = (id) => ev(`(async () => { const { newUsage } = await import('/src/core/screentime.ts');
  __app.store.update(d => ({ ...d, profiles: { ...d.profiles, [${JSON.stringify(id)}]: { ...d.profiles[${JSON.stringify(id)}], usage: newUsage(__app.today(), __app.now()) } } }));
  __app.time.reload(); })()`);
const resetStoredUsage = (id) => ev(`(async () => { const { newUsage } = await import('/src/core/screentime.ts');
  __app.store.update(d => ({ ...d, profiles: { ...d.profiles, [${JSON.stringify(id)}]: { ...d.profiles[${JSON.stringify(id)}], usage: newUsage(__app.today(), __app.now()) } } })); })()`);
const snap = () => ev(`(() => { const s = __app.time.snapshot(); return s && { mode: s.mode, breakDue: s.breakDue, lockDue: s.lockDue }; })()`);
const playedMs = () => ev(`__app.time.playedMs()`);
const onHome = () => ev(`!!document.querySelector('.screen-home')`);
const playSplitSet = async (note) => {
  let sawDueMidSet = false, interrupted = false;
  for (let i = 0; i < 5; i++) {
    await nextQuestionReady();
    const q = await readSplit();
    await fillAnswer(q);
    await click("#xong");
    await overlayKind();
    if ((await snap()).breakDue || (await snap()).lockDue) sawDueMidSet = true;
    await closeOverlay();
    if (i < 4 && !(await ev(`!!document.querySelector('.sp')`))) interrupted = true;
  }
  return { sawDueMidSet, interrupted };
};

// --- idle: nudge, then pause; idle time is not counted ---
await setLimits({ sessionMin: 600, dailyMin: 600, breakMin: 0.12, idleNudgeSec: 3, idlePauseSec: 7, warnBeforeMin: 2 });
await ev(`__app.store.setActive(${JSON.stringify(anId)}); __app.go('home')`); await sleep(500);
await resetUsage(anId);
await click(".hero .meo");
check("idle nudge: after a few quiet seconds Mèo offers help (a toast)", await waitFor(`!!document.querySelector('.toast')`, 8000) && /Mèo giúp/.test(await ev(`document.querySelector('.toast').textContent`)));
await shot("ui-12-toast");
await click(".hero h2");
check("idle nudge: a touch dismisses it", await waitFor(`!document.querySelector('.toast')`, 3000));
check("idle pause: still longer and the game pauses with Mèo asleep and a hint", await waitFor(`!!document.querySelector('.overlay[data-kind=pause]')`, 14000) && /Chạm vào màn hình/.test(await ev(`document.querySelector('.overlay[data-kind=pause]').textContent`)));
await shot("ui-12-pause");
const p1 = await playedMs();
await sleep(2500);
check("idle time is not counted while paused", (await playedMs()) - p1 < 1500);
await click(".overlay[data-kind=pause]");
check("a touch resumes play", await waitFor(`!document.querySelector('.overlay[data-kind=pause]')`, 3000) && (await waitFor(`(() => { const s = __app.time.snapshot(); return s && s.mode === 'play'; })()`, 3000)));

// --- break and lock are applied between sets, never during one ---
// a whole set takes only ~6 s here (the clicks are instant), so the limits are scaled to that pace
await setLimits({ sessionMin: 0.05, breakMin: 0.3, dailyMin: 0.4, warnBeforeMin: 0.15, idleNudgeSec: 20, idlePauseSec: 60 });
await resetUsage(anId);
await resetStoredUsage(binhId); // the other child starts the test fresh too
await ev(`window.__toasts = []; new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach((n) => { if (n.classList && n.classList.contains('toast')) window.__toasts.push(n.textContent); }))).observe(document.querySelector('.stage'), { childList: true });`);
await click(".tile[data-game=split]");
const set1 = await playSplitSet();
check("break: it became due during the set, but the set was not interrupted", set1.sawDueMidSet && !set1.interrupted, JSON.stringify({ set1, snap: await snap(), hash: await ev(`location.hash`), played: await playedMs() }));
check("break: the star screen is not interrupted either", await waitFor(`!!document.querySelector('.screen-stars')`) && (await snap()).breakDue === true, JSON.stringify({ snap: await snap(), screen: await ev(`document.querySelector('.screen').className`) }));
await click("#back-home");
check("break: going home after the set shows the break screen", await waitFor(`!!document.querySelector('.screen-break')`, 4000));
check("break: Mèo sleeps, a countdown runs, there are tips", (await ev(`document.querySelector('.screen-break .meo').dataset.mood`)) === "sleep" && /^\d:\d\d$/.test(await ev(`document.querySelector('#break-clock').textContent`)) && (await ev(`document.querySelectorAll('.screen-break .tips div').length`)) === 2);
await shot("ui-12-break");
const pb1 = await playedMs();
await sleep(2200);
check("break: time is not counted during a break", (await playedMs()) - pb1 < 700);
await ev(`__app.go('play/split')`); await sleep(500);
check("break: starting another set is not possible during the break", await ev(`!!document.querySelector('.screen-break') && !document.querySelector('.sp')`));
// another child can take over the tablet
await click("#other-kid");
check("break: 'Bạn khác chơi' opens the picker", await ev(`!!document.querySelector('.screen-who')`));
await click(`.kid[data-profile="${binhId}"]`);
check("break: the other child is not on a break", await ev(`!!document.querySelector('.screen-home') && document.querySelector('#greeting').textContent.includes('Bình')`));
await click("#who-chip");
await click(`.kid[data-profile="${anId}"]`);
check("break: back to the first child, the break is still on", await waitFor(`!!document.querySelector('.screen-break')`, 3000));
check("break: it ends by itself and goes home", await waitFor(`!!document.querySelector('.screen-home')`, 25000));
check("break: after it the session clock starts again (no new break)", (await snap()).breakDue === false);

// --- daily limit: a warning, then a lock between sets ---
await setLimits({ sessionMin: 600 });
await click(".tile[data-game=split]");
const set2 = await playSplitSet();
check("daily limit: the set in progress is not interrupted", !set2.interrupted);
await waitFor(`!!document.querySelector('.screen-stars')`);
await click("#back-home");
// keep "using" the home screen until the limit is reached; the lock then appears by itself
for (let i = 0; i < 40 && !(await ev(`!!document.querySelector('.screen-locked')`)); i++) { try { await click(".hero h2"); } catch { /* the lock screen just replaced home */ } await sleep(1500); }
check("daily limit: the night screen replaces home when time is up", await waitFor(`!!document.querySelector('.screen-locked')`, 8000));
check("daily warning: Mèo warned a little before the limit (toast)", (await ev(`window.__toasts.some(t => /hết giờ chơi/.test(t))`)), JSON.stringify(await ev(`window.__toasts`)));

check("daily limit: Mèo sleeps, 'Hôm nay mình chơi đủ rồi!', stars today, night colours", (await ev(`document.querySelector('.screen-locked h1').textContent`)) === "Hôm nay mình chơi đủ rồi!" && (await ev(`document.querySelector('.stage').classList.contains('night')`)) && (await ev(`document.querySelectorAll('.screen-locked .tips div').length`)) >= 1);
await shot("ui-12-locked");
await ev(`__app.go('play/split')`); await sleep(500);
check("daily limit: no new set can start", await ev(`!!document.querySelector('.screen-locked') && !document.querySelector('.sp')`));
await click("#other-kid");
await click(`.kid[data-profile="${binhId}"]`);
check("daily limit: another child can still play", await ev(`!!document.querySelector('.screen-home') && !document.querySelector('.stage').classList.contains('night')`));
await click("#who-chip");
await click(`.kid[data-profile="${anId}"]`);
check("daily limit: the first child stays locked", await waitFor(`!!document.querySelector('.screen-locked')`, 3000));
check("the usage is saved into the profile", (await profileOf(anId)).usage.playedMs > 15000);

// an adult grants more time (the PIN screen comes in step 10; here the clock method is called directly)
await ev(`__app.time.grantBonus(10)`);
check("extra time from an adult ends the lock", await waitFor(`!!document.querySelector('.screen-home') && !document.querySelector('.stage').classList.contains('night')`, 4000));
check("the home chip shows the extra time", /còn 1[01] phút/.test(await ev(`document.querySelector('.chip.time').textContent`)));
// a new day starts fresh
await ev(`window.__realToday = __app.today; __app.today = () => '2099-01-01'`);
await sleep(2500);
check("a new day resets today's usage", (await ev(`__app.time.playedMs()`)) < 3000 && (await snap()).lockDue === false);
await ev(`__app.today = window.__realToday`);

// ---------- 13. teacher area (step 10) ----------
const holdPadlock = async () => { const [x, y] = await center(".gate-btn"); await mouse("mousePressed", x, y); await sleep(1500); await mouse("mouseReleased", x, y); await sleep(450); };
const typePin = async (digits, scope = ".pin-keys") => { for (const d of digits) await click(`${scope} [data-k="${d}"]`); await sleep(750); };
const inArea = () => ev(`!!document.querySelector('.t-panel')`);
const atGate = () => ev(`!!document.querySelector('.t-gate-card') && !document.querySelector('.t-panel')`);
const openTab = async (t) => { await click(`.t-nav [data-tab=${t}]`); await sleep(250); };
const leaveArea = async () => { await click(".t-head .btn-round"); await sleep(500); };
const setRange = (key, v) => ev(`(() => { const i = document.querySelector('[data-limit=${key}]'); i.value = ${v}; i.dispatchEvent(new Event('input', { bubbles: true })); })()`);
const setUsage = (patch) => ev(`(() => { const id = __app.store.data.activeId; __app.store.update(d => ({ ...d, profiles: { ...d.profiles, [id]: { ...d.profiles[id], usage: { ...d.profiles[id].usage, ...${JSON.stringify(patch)} } } } })); __app.time.reload(); })()`);
const setInputFile = async (selector, path) => {
  const doc = await send("DOM.getDocument", { depth: 0 });
  const q = await send("DOM.querySelector", { nodeId: doc.result.root.nodeId, selector });
  await send("DOM.setFileInputFiles", { files: [path], nodeId: q.result.nodeId });
  await sleep(400);
};
await send("Browser.setDownloadBehavior", { behavior: "deny" });

await ev(`__app.store.update(d => ({ ...d, settings: { ...d.settings, limits: { ...d.settings.limits, sessionMin: 30, breakMin: 5, dailyMin: 60, warnBeforeMin: 2, idleNudgeSec: 20, idlePauseSec: 60 } } }))`);
await setFx({ anim: true, decor: true, celebrate: true, sfx: true });
// earlier sections added many children for the pager: keep just the two this section uses
await ev(`Object.values(__app.store.data.profiles).filter(p => p.id !== ${JSON.stringify(binhId)} && p.id !== ${JSON.stringify(anId)}).forEach(p => __app.store.removeProfile(p.id))`);
await ev(`__app.store.setActive(${JSON.stringify(anId)})`);
await resetUsage(anId);
await goHash("#/home"); await sleep(300);

// --- the gate ---
await click(".gate-btn");
check("padlock: a quick tap does not open the teacher area", (await ev(`location.hash`)) === "#/home");
await holdPadlock();
check("padlock: holding it opens the PIN gate (not the area)", (await ev(`location.hash`)) === "#/teacher" && await atGate());
await shot("ui-13-gate");
await typePin("1111");
check("PIN: a wrong code is refused with a message", await atGate() && /chưa đúng/.test(await ev(`document.querySelector('#pin-error').textContent`)));
check("PIN: the dots are emptied after a wrong code", (await ev(`document.querySelectorAll('.pin-dots .f').length`)) === 0);
await typePin("1234");
check("PIN: the right code opens the area", await inArea());
check("area: four tabs", (await ev(`document.querySelectorAll('.t-nav button').length`)) === 4);
check("area: the default PIN warning is shown", await ev(`!!document.querySelector('#t-default-pin')`));

// --- Hiệu ứng: presets and switches change the page at once ---
const fxClasses = () => ev(`['anim','decor','celebrate','sfx'].map(k => document.documentElement.classList.contains('fx-' + k) ? 1 : 0).join('')`);
check("fx: opens on the Hiệu ứng tab with 'Rực rỡ' highlighted", (await fxClasses()) === "1111" && await ev(`document.querySelector('[data-preset=all]').classList.contains('on')`));
await shot("ui-13-fx");
await click("[data-preset=calm]");
check("fx: 'Yên tĩnh' turns everything off at once", (await fxClasses()) === "0000" && await ev(`document.querySelector('[data-preset=calm]').classList.contains('on') && [...document.querySelectorAll('[data-fx]')].every(i => !i.checked)`));
await click(".sw:has([data-fx=decor])");
check("fx: one switch changes just that effect, and no preset stays highlighted", (await fxClasses()) === "0100" && (await ev(`document.querySelectorAll('.presets .on').length`)) === 0);
await click("[data-preset=mid]");
check("fx: 'Vừa phải' = no decoration", (await fxClasses()) === "1011");
await click("[data-preset=all]");
check("fx: 'Rực rỡ' = everything", (await fxClasses()) === "1111" && (await ev(`JSON.parse(localStorage.getItem('ttth.data')).settings.fx.decor`)) === true);

// --- Thời gian chơi ---
await openTab("time");
await shot("ui-13-time");
check("time: sliders show the saved limits", (await ev(`[...document.querySelectorAll('[data-limit]')].map(i => i.value).join(',')`)) === "30,5,60,20");
await setRange("dailyMin", 10);
check("time: the daily slider is saved at once", (await ev(`__app.store.data.settings.limits.dailyMin`)) === 10 && /10 phút/.test(await ev(`document.querySelectorAll('.rng output')[2].textContent`)));
await setRange("idleNudgeSec", 35);
check("time: the idle slider moves the pause with it", (await ev(`__app.store.data.settings.limits.idleNudgeSec`)) === 35 && (await ev(`__app.store.data.settings.limits.idlePauseSec`)) === 105);
await setRange("idleNudgeSec", 20);
await ev(`document.querySelector('.sw:has(#t-weekend)').scrollIntoView({ block: 'center' })`);
check("time: the weekend switch is on and can be turned off", (await ev(`document.querySelector('#t-weekend').checked`)) === true);
await click(".sw:has(#t-weekend)");
check("time: weekend switch saved", (await ev(`__app.store.data.settings.skipWeekends`)) === false, await ev(`JSON.stringify({ chk: document.querySelector("#t-weekend").checked, st: __app.store.data.settings.skipWeekends, r: document.querySelector(".sw:has(#t-weekend)").getBoundingClientRect(), pt: document.querySelector("#t-panel").scrollTop, scr: document.querySelector(".stage").scrollTop })`));
await click(".sw:has(#t-weekend)");
check("time: the playing child is named with today's time", /An/.test(await ev(`document.querySelector('.t-today h3').textContent`)) && /còn \d+ phút/.test(await ev(`document.querySelector('#t-status').textContent`)));
check("time: the break button is hidden when there is no break", await ev(`getComputedStyle(document.querySelector('#t-end-break')).display === 'none'`));

// --- Học sinh ---
await openTab("kids");
check("kids: one row per child with stars", (await ev(`document.querySelectorAll('#t-kids tr[data-profile]').length`)) === 2 && (await ev(`document.querySelector('tr[data-profile="${anId}"] td:nth-child(2)').textContent`)) === String((await profileOf(anId)).stars));
check("kids: six tier badges per child", (await ev(`document.querySelectorAll('tr[data-profile="${binhId}"] .v').length`)) === 6);
await shot("ui-13-kids");
await click("#t-add");
await typeName("Hà");
await click(".add-card .btn-primary");
const haId = await idOf("Hà");
check("kids: a child added here appears in the table", (await ev(`document.querySelectorAll('#t-kids tr[data-profile]').length`)) === 3 && !!haId);
await click(`[data-edit="${haId}"]`);
check("kids: edit opens with the current name", (await ev(`document.querySelector('.add-card .name-input').value`)) === "Hà");
await ev(`(() => { const i = document.querySelector('.add-card .name-input'); i.value = 'Hạ'; i.dispatchEvent(new Event('input', { bubbles: true })); })()`);
await click('.add-card .av-opt[data-avatar="kite"]');
await click(".add-card .btn-primary");
check("kids: rename + new picture saved, same child", (await profileOf(haId)).name === "Hạ" && (await profileOf(haId)).avatar === "kite" && (await ev(`document.querySelector('tr[data-profile="${haId}"] b').textContent`)) === "Hạ");
const anStars = (await profileOf(anId)).stars;
// remove: ask first, keeping is safe
await click(`[data-remove="${haId}"]`);
check("kids: remove asks first", /Xoá bạn Hạ\?/.test(await ev(`document.querySelector('.t-dialog h2').textContent`)));
await click(".t-dialog .btn-secondary");
check("kids: 'Giữ lại' keeps the child", !!(await profileOf(haId)));
// remove the child who is playing: the clock must let go cleanly
await ev(`__app.store.setActive(${JSON.stringify(haId)})`);
await click(`[data-remove="${haId}"]`);
await click(".t-dialog .btn-danger");
await sleep(300);
check("kids: removing the playing child works (no one is playing then)", (await ev(`__app.store.data.profiles[${JSON.stringify(haId)}]`)) === undefined && (await ev(`__app.store.data.activeId`)) === null && (await ev(`document.querySelectorAll('#t-kids tr[data-profile]').length`)) === 2);
check("kids: the other children keep their progress", (await profileOf(anId)).stars === anStars);
await openTab("time");
check("time: with nobody playing the extra-time buttons are replaced by a note", await ev(`!document.querySelector('[data-bonus]') && /Chưa có bạn nào/.test(document.querySelector('.t-today').textContent)`));
await ev(`__app.store.setActive(${JSON.stringify(anId)})`);

// --- Sao lưu ---
await openTab("backup");
await shot("ui-13-backup");
await click("#t-export");
check("backup: download reports success", /Đã tải/.test(await ev(`document.querySelector('#t-backup-msg').textContent`)));
const backupText = await ev(`import('/src/core/storage.ts').then(m => m.exportJSON(__app.store.data))`);
const backupFile = `${SP}/backup-check.json`;
writeFileSync(backupFile, backupText);
// change things, then restore them from the file
await ev(`__app.store.removeProfile(${JSON.stringify(binhId)})`);
await ev(`__app.store.update(d => ({ ...d, settings: { ...d.settings, fx: { anim: false, decor: false, celebrate: false, sfx: false }, limits: { ...d.settings.limits, dailyMin: 25 } } }))`);
await setInputFile("#t-import", backupFile);
check("backup: importing asks first and says how many children", /2 bạn/.test(await ev(`document.querySelector('.t-dialog p').textContent`)));
await click(".t-dialog .btn-primary");
await sleep(400);
check("backup: after import both children are back", (await names()) === "Bình,An" && (await profileOf(anId)).stars === anStars);
check("backup: after import the settings are back too", (await fxClasses()) === "1111" && (await ev(`__app.store.data.settings.limits.dailyMin`)) === 10);
check("backup: nobody is playing after an import (the picker comes next)", (await ev(`__app.store.data.activeId`)) === null);
check("backup: a confirmation is shown", /Đã nhập/.test(await ev(`document.querySelector('.t-dialog p').textContent`)));
await click(".t-dialog .btn-primary");
await sleep(200);
writeFileSync(`${SP}/backup-bad.json`, "this is not json");
await setInputFile("#t-import", `${SP}/backup-bad.json`);
check("backup: an unreadable file is refused", /không đọc được/.test(await ev(`document.querySelector('.t-dialog p').textContent`)));
await click(".t-dialog .btn-primary");
writeFileSync(`${SP}/backup-other.json`, JSON.stringify({ app: "something-else", data: {} }));
await setInputFile("#t-import", `${SP}/backup-other.json`);
check("backup: a file from another app is refused", /không phải bản sao lưu/.test(await ev(`document.querySelector('.t-dialog p').textContent`)));
await click(".t-dialog .btn-primary");
check("backup: refused files change nothing", (await names()) === "Bình,An");
await ev(`__app.store.setActive(${JSON.stringify(anId)})`);
await resetUsage(anId);

// --- leaving locks the area again ---
await leaveArea();
check("leaving: back goes home", await onHome());
check("leaving: the area is locked again (no unlock left behind)", (await ev(`sessionStorage.getItem('ttth.teacher')`)) === null);
await holdPadlock();
check("leaving: coming back asks for the PIN again", await atGate());

// --- lock screen: an adult grants more time ---
await typePin("1234");
await openTab("time");
await setUsage({ playedMs: 11 * 60000 }); // dailyMin is 10: the child has used the whole day
await leaveArea();
check("lock: the night screen replaces home after the area is left", await waitFor(`!!document.querySelector('.screen-locked')`, 4000));
await holdPadlock();
await typePin("1234");
await openTab("time");
check("lock: the area says the day is over", /hết giờ/.test(await ev(`document.querySelector('#t-status').textContent`)));
await click("[data-bonus='10']");
check("lock: +10 phút is confirmed and the status changes", /Đã thêm 10 phút/.test(await ev(`document.querySelector('#t-msg').textContent`)) && /còn \d+ phút/.test(await ev(`document.querySelector('#t-status').textContent`)));
check("lock: the bonus is saved in the child's usage", (await ev(`__app.time.snapshot().usage.bonusMs`)) === 10 * 60000);
await leaveArea();
check("lock: the child can play again", await waitFor(`!!document.querySelector('.screen-home')`, 3000));

// --- break screen: an adult ends the break ---
await setUsage({ playedMs: 0, bonusMs: 0, sessionMs: 31 * 60000 });
await ev(`__app.go('home')`);
check("break: the break screen shows once the session is long enough", await waitFor(`!!document.querySelector('.screen-break')`, 4000));
await holdPadlock();
await typePin("1234");
await openTab("time");
check("break: the area says a break is running and offers to end it", /nghỉ mắt/.test(await ev(`document.querySelector('#t-status').textContent`)) && await ev(`getComputedStyle(document.querySelector('#t-end-break')).display !== 'none'`));
await click("#t-end-break");
check("break: ending it is confirmed and the button goes away", /kết thúc giờ nghỉ/i.test(await ev(`document.querySelector('#t-msg').textContent`)) && await ev(`getComputedStyle(document.querySelector('#t-end-break')).display === 'none'`));
await leaveArea();
check("break: the child is back on the home screen", await waitFor(`!!document.querySelector('.screen-home')`, 3000));

// --- change PIN ---
await holdPadlock();
await typePin("1234");
await openTab("backup");
await click("#t-change-pin");
await typePin("1111", ".overlay .pin-keys");
await typePin("2222", ".overlay .pin-keys");
check("PIN change: two different codes are refused", /chưa giống/.test(await ev(`document.querySelector('.overlay .t-err').textContent`)) && (await ev(`__app.store.data.settings.pin.hash`)) === (await ev(`import('/src/core/pin.ts').then(m => m.makePin('1234', __app.store.data.settings.pin.salt).hash)`)));
await typePin("4321", ".overlay .pin-keys");
await typePin("4321", ".overlay .pin-keys");
check("PIN change: the same code twice is saved and confirmed", /Đã đổi mã PIN/.test(await ev(`document.querySelector('.t-dialog p').textContent`)) && await ev(`import('/src/core/pin.ts').then(m => m.checkPin(__app.store.data.settings.pin, '4321'))`));
await click(".t-dialog .btn-primary");
check("PIN change: the default-PIN warning is gone", await ev(`!document.querySelector('#t-default-pin')`));
await leaveArea();
await holdPadlock();
await typePin("1234");
check("PIN change: the old code no longer works", await atGate());
await typePin("4321");
check("PIN change: the new code works", await inArea());

// --- the area closes by itself after a quiet half hour ---
await ev(`sessionStorage.setItem('ttth.teacher', String(Date.now() - 31 * 60000))`);
check("expiry: left alone for over 30 minutes, the area asks for the PIN again", await waitFor(`!!document.querySelector('.t-gate-card') && !document.querySelector('.t-panel')`, 9000));

// --- too many wrong codes make the pad wait ---
for (let i = 0; i < 5; i++) await typePin("0000");
check("lockout: five wrong codes in a row make the pad wait", await ev(`document.querySelector('.pin-pad').classList.contains('disabled') && /Chờ \\d+ giây/.test(document.querySelector('#pin-error').textContent)`), await ev(`JSON.stringify({ err: document.querySelector('#pin-error')?.textContent, cls: document.querySelector('.pin-pad')?.className, hash: location.hash })`));
await typePin("4321");
check("lockout: even the right code is ignored while waiting", await atGate());
await shot("ui-13-lockout");
await click(".t-back .btn-round");
await sleep(400);
await holdPadlock();
check("lockout: leaving and coming back does not reset the wait", await ev(`document.querySelector('.pin-pad').classList.contains('disabled')`));
await click(".t-back .btn-round");
await sleep(300);

// ---------- 14. guide (i) (step 11) ----------
const guideOpen = () => ev(`!!document.querySelector('.guide-card')`);
const seenGuides = () => ev(`JSON.stringify(Object.fromEntries(Object.entries(__app.store.data.profiles[__app.store.data.activeId].games).map(([k, g]) => [k, g.seenGuide])))`);
await ev(`(() => { const p = __app.store.addProfile('Mới', 'star'); __app.store.setActive(p.id); })()`);
await goHash("#/home"); await sleep(300);
check("guide: a new child has not seen any guide", Object.values(JSON.parse(await seenGuides())).every((v) => v === false));
await ev(`__app.go('play/split')`);
check("guide: opens by itself the first time a child plays a game", await waitFor(`!!document.querySelector('.guide-card')`, 3000));
check("guide: four steps, a replay button and an OK button", (await ev(`document.querySelectorAll('.guide-card ol li').length`)) === 4 && await ev(`!!document.querySelector('.guide-replay') && !!document.querySelector('.guide-card .btn-primary')`));
check("guide: the question behind it is already there", await ev(`!!document.querySelector('.sp')`));
check("guide: that game is now marked as seen, the others are not", (await seenGuides()) === JSON.stringify({ scale: false, robot: false, basket: false, equations: false, split: true, compare: false }), await seenGuides());
await shot("ui-14-guide");
await click(".guide-card .btn-primary");
check("guide: 'Em hiểu rồi!' closes it", await ev(`!document.querySelector('.overlay')`));
await ev(`__app.go('home')`); await sleep(300);
await ev(`__app.go('play/split')`); await sleep(500);
check("guide: the second time it stays closed", !(await guideOpen()));
await click(".btn-round.info");
check("guide: the (i) button opens it any time", await guideOpen());
await click(".guide-card .btn-primary");
await ev(`__app.go('play/robot')`);
check("guide: each game has its own first time (Rô-bốt)", await waitFor(`!!document.querySelector('.guide-card')`, 3000) && (await ev(`document.querySelector('.guide-card ol li').textContent`)).includes("rô-bốt"));
await click(".guide-card .btn-primary");

// narration: with a fake voice, each step is marked while it is "read", and closing stops the voice
await ev(`window.__spoken = []; window.__stops = 0; const v = __app.voice; v.__play = v.play.bind(v); v.__stop = v.stop.bind(v);
  v.play = (s) => { window.__spoken.push(s.clips[0] || ''); return new Promise((r) => setTimeout(r, 600)); };
  v.stop = () => { window.__stops++; v.__stop(); };`);
await click(".btn-round.info");
await sleep(250);
const lit = () => ev(`[...document.querySelectorAll('.guide-card li')].findIndex(li => li.classList.contains('now'))`);
check("guide: the first step is marked while it is read", (await lit()) === 0);
await sleep(650);
check("guide: then the second", (await lit()) === 1);
await sleep(650);
check("guide: then the third", (await lit()) === 2);
check("guide: the spoken order is the written order", (await ev(`window.__spoken.slice(-3).join(',')`)) === "guide_robot_1,guide_robot_2,guide_robot_3");
const stops0 = await ev(`window.__stops`);
await click(".guide-card .btn-primary");
check("guide: closing it stops the voice", (await ev(`window.__stops`)) > stops0);
await sleep(1500);
check("guide: after closing nothing keeps reading", (await ev(`window.__spoken.length`)) <= 5);
// a muted or voiceless device: no race through the steps, no stuck highlight
await ev(`__app.voice.play = () => Promise.resolve()`);
await click(".btn-round.info");
await sleep(500);
check("guide: with no voice nothing is highlighted", (await lit()) === -1);
await click(".guide-card .btn-primary");
await ev(`__app.voice.play = __app.voice.__play; __app.voice.stop = __app.voice.__stop`);
// a child who has seen the guide is not interrupted
await ev(`__app.store.setActive(${JSON.stringify(anId)})`);
await ev(`__app.go('home')`); await sleep(300);
await ev(`__app.go('play/split')`); await sleep(600);
check("guide: a child who has seen it is not interrupted", !(await guideOpen()) && await ev(`!!document.querySelector('.sp')`));
await ev(`__app.go('home')`); await sleep(200);

// ---------- 15. Mèo's worked examples (ghost hand) ----------
await ev(`__app.store.setActive(${JSON.stringify(anId)})`);
await ev(`__app.store.update(d => ({ ...d, settings: { ...d.settings, limits: { ...d.settings.limits, dailyMin: 60, sessionMin: 30 } } }))`);
await resetUsage(anId);
const openDemo = async (game) => {
  await ev(`__app.go('home')`); await sleep(300);
  await ev(`__app.go('play/${game}')`); await sleep(600);
  await click(".btn-round.info");
  await sleep(300);
  await click("#guide-demo");
  return waitFor(`!!document.querySelector('.demo-layer')`, 3000);
};
check("demo: games without a worked example have no demo button", await (async () => { await ev(`__app.go('play/split')`); await sleep(600); await click(".btn-round.info"); await sleep(300); const none = await ev(`!document.querySelector('#guide-demo')`); await click(".guide-card .btn-primary"); return none; })());
check("demo: Rô-bốt's guide offers 'Xem Mèo làm mẫu' and starts it", await openDemo("robot"));
check("demo: the guide card closed, a ribbon and a ghost hand are shown", await ev(`!document.querySelector('.guide-card') && !!document.querySelector('.demo-ribbon') && !!document.querySelector('.demo-hand')`));
check("demo: it has its own copy of the game; the real question is untouched underneath", (await ev(`document.querySelectorAll('.rb').length`)) === 2 && (await ev(`document.querySelectorAll('.screen-play > .topbar .dots .done').length`)) === 0);
await sleep(8000);
const handMoved = await ev(`getComputedStyle(document.querySelector('.demo-hand')).transform`);
check("demo: the ghost hand moves and steps appear in the program", handMoved !== "none" && (await ev(`document.querySelectorAll('.demo-layer .rb-slot.on').length`)) >= 1);
await shot("ui-15-demo-robot");
check("demo: the child cannot touch the demo's own controls", await ev(`getComputedStyle(document.querySelector('.demo-layer .game-body')).pointerEvents === 'none'`));
check("demo: Rô-bốt's demo reaches the flag and offers 'Đến lượt em!'", await waitFor(`document.querySelector('.demo-layer.finished') && !!document.querySelector('.demo-layer .rb-cell.goal.ok')`, 90000));
check("demo: the same path as the solver's (six steps) was built", (await ev(`document.querySelectorAll('.demo-layer .rb-slot.on').length`)) === 6);
await shot("ui-15-demo-robot-end");
await click("#demo-again");
check("demo: 'Xem lại' starts it again from the beginning", await waitFor(`!!document.querySelector('.demo-layer') && document.querySelectorAll('.demo-layer .rb-slot.on').length === 0 && !document.querySelector('.demo-layer.finished')`, 3000));
await sleep(2500);
await click("#demo-stop");
check("demo: 'Dừng' stops it at once and leaves the real question as it was", await waitFor(`!document.querySelector('.demo-layer')`, 2000) && (await ev(`document.querySelectorAll('.rb').length`)) === 1 && (await ev(`document.querySelectorAll('.rb-slot.on').length`)) === 0);
await sleep(1500);
check("demo: after stopping nothing keeps running (no stray hand or console error)", await ev(`!document.querySelector('.demo-hand')`) && consoleErrors.length === 0, JSON.stringify(consoleErrors));
check("demo: Cái cân's demo starts", await openDemo("scale"));
await shot("ui-15-demo-scale-start");
check("demo: Cái cân's demo ends with both pans equal", await waitFor(`document.querySelector('.demo-layer.finished')`, 90000) && (await ev(`(() => { const w = [...document.querySelectorAll('.demo-layer .sc-pan')].map(p => [...p.querySelectorAll('[data-item]')].reduce((s, i) => s + Number(i.dataset.w), 0)); return w[0] === w[1] && w[0] > 0; })()`)));
await shot("ui-15-demo-scale-end");
await click("#demo-ok");
check("demo: 'Đến lượt em!' closes it and the real scale is untouched", await waitFor(`!document.querySelector('.demo-layer')`, 2000) && (await ev(`document.querySelectorAll('.sc-tray [data-item]').length`)) > 0 && (await ev(`document.querySelectorAll('.screen-play .sc-pan [data-item]:not([data-fixed])').length`)) === 0);
await ev(`__app.go('home')`); await sleep(200);

check("no console errors", consoleErrors.length === 0, JSON.stringify(consoleErrors));

console.log(`browser checks: ${passed} passed, ${failed} failed`);
ws.close(); chrome.kill();
process.exit(failed ? 1 : 0);
