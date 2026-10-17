// UI regression check: drives the dev server in headless Chrome through the DevTools protocol
// (real mouse events, real layout). Needs Node 24 and Chrome/Edge.
//   1) npm run dev            (in another terminal)
//   2) npm run ui:check       (env: APP_URL, CHROME, OUT for screenshots; defaults below)
// It checks the shared UI through the dev-only gallery at #/kit, then profiles + home (step 2),
// then plays whole sets of Mấy và mấy (step 3) and Tính theo hình (step 4).
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
setTimeout(() => { console.log("WATCHDOG: stuck after:", last); chrome.kill(); process.exit(2); }, 100000);

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
check("navigation: kit gone, listeners cleaned; no child chosen so the picker shows", await ev(`!document.querySelector('#kit-status') && document.querySelectorAll('.gate-btn, .ghost').length === 0 && !!document.querySelector('.screen-who')`));

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
await click(`.kid[data-profile="${binhId}"]`);
check("tapping a child opens home as that child", (await ev(`location.hash`)) === "#/home" && (await ev(`document.querySelector('#greeting').textContent`)) === "Chào thám tử nhí Bình!" && (await ev(`__app.store.data.activeId`)) === binhId);
const chips = () => ev(`[...document.querySelectorAll('.chip')].map(c => c.textContent.trim()).join('|')`);
check("home shows that child's stars, streak and time", (await chips()) === "4 sao|1 ngày liền|còn 30 phút", await chips());
check("home: six tiles; only the finished games are playable (2 so far)", await ev(`document.querySelectorAll('.tile').length === 6 && document.querySelectorAll('.tile.soon').length === 4 && !document.querySelector('.tile[data-game=split]').classList.contains('soon') && [...document.querySelectorAll('.tile h3')].map(h => h.textContent).join(',') === 'Cái cân,Rô-bốt,Giỏ trái cây,Tính theo hình,Mấy và mấy,So sánh cân'`));
check("home: week strip has today marked and one starred day", await ev(`document.querySelectorAll('.week span').length === 7 && document.querySelectorAll('.week .is-today').length === 1 && document.querySelectorAll('.week .ok').length === 1`));
check("home: padlock present, speaker works", await ev(`!!document.querySelector('.gate-btn') && !!document.querySelector('.speaker')`));
await shot("ui-5-home");

await click("#who-chip");
check("tapping the child chip goes back to the picker", (await ev(`location.hash`)) === "#/who");
await click(`.kid[data-profile="${anId}"]`);
check("second child sees their own stars and streak", (await chips()) === "0 sao|Chuỗi mới nào!|còn 30 phút" && (await ev(`document.querySelector('#greeting').textContent`)) === "Chào thám tử nhí An!", await chips());

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
const overlayKind = async () => { await waitFor(`!!document.querySelector('.overlay[data-kind]')`); return ev(`document.querySelector('.overlay').dataset.kind`); };
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
check("back to home: the tile shows the best stars and the new total", (await ev(`!!document.querySelector('.screen-home')`)) && (await chips()) === "3 sao|1 ngày liền|còn 30 phút" && (await ev(`document.querySelectorAll('.tile[data-game=split] .got img:not(.dim)').length`)) === 3, await chips());

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
await ev(`location.hash = '#/play/robot'`); await sleep(400);
check("a game without a screen yet goes home", await ev(`!!document.querySelector('.screen-home')`));
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

check("no console errors", consoleErrors.length === 0, JSON.stringify(consoleErrors));

console.log(`browser checks: ${passed} passed, ${failed} failed`);
ws.close(); chrome.kill();
process.exit(failed ? 1 : 0);
