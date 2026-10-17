// Takes the pictures and short videos used by the user guide (docs/guide/): headless Chrome drives the
// DEV server through the same screens a teacher sees. Run it again whenever the screens change, then
// `node scripts/make-guide.mjs` to rebuild the guide pages.
//   1) npm run dev            (in another terminal)
//   2) node scripts/guide-shots.mjs          (env: APP_URL, CHROME; add --no-video to skip the two demo videos)
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";

const CHROME = process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const URL_BASE = process.env.APP_URL ?? "http://localhost:5173/";
const NO_VIDEO = process.argv.includes("--no-video");
const toPath = (u) => decodeURIComponent(u.pathname).replace(/^\/(\w:)/, "$1");
const IMG = toPath(new URL("../docs/guide/img/", import.meta.url));
const VIDEO = toPath(new URL("../docs/guide/video/", import.meta.url));
mkdirSync(IMG, { recursive: true });
mkdirSync(VIDEO, { recursive: true });
const PROFILE = mkdtempSync(`${tmpdir()}/ttth-guide-`);
const PORT = 9777;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`, "--window-size=1180,820", "about:blank"], { stdio: "ignore" });
let targets;
for (let i = 0; i < 50; i++) {
  try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (targets.find((t) => t.type === "page")) break; } catch {}
  await sleep(200);
}
const ws = new WebSocket(targets.find((t) => t.type === "page").webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0;
const pending = new Map();
let loaded = null;
const frameListeners = new Set();
ws.onmessage = (m) => {
  const msg = JSON.parse(m.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
  else if (msg.method === "Page.loadEventFired" && loaded) loaded();
  else if (msg.method === "Page.screencastFrame") {
    ws.send(JSON.stringify({ id: ++id, method: "Page.screencastFrameAck", params: { sessionId: msg.params.sessionId } }));
    frameListeners.forEach((fn) => fn(msg.params));
  }
};
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr) => {
  const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.result.exceptionDetails) throw new Error("eval failed: " + expr.slice(0, 200) + "\n" + JSON.stringify(r.result.exceptionDetails.exception?.description));
  return r.result.result.value;
};
const nav = async (url) => { const p = new Promise((r) => (loaded = r)); await send("Page.navigate", { url }); await p; await sleep(500); };
const goHash = async (h, ms = 500) => { await ev(`location.hash = ${JSON.stringify(h)}`); await sleep(ms); };
const shot = async (name, wait = 1100) => {
  await sleep(wait); // let pop-in animations finish
  const r = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(`${IMG}${name}.png`, Buffer.from(r.result.data, "base64"));
  console.log("  shot", name);
};
const center = (sel) => ev(`(() => { const r = document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })()`);
const mouse = (type, x, y) => send("Input.dispatchMouseEvent", { type, x, y, button: "left", buttons: type === "mouseReleased" ? 0 : 1, clickCount: 1 });
const click = async (sel) => { const [x, y] = await center(sel); await mouse("mousePressed", x, y); await mouse("mouseReleased", x, y); await sleep(120); };
const waitFor = async (expr, ms = 8000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await ev(expr)) return true; await sleep(100); } return false; };
const css = (text) => ev(`(() => { let s = document.getElementById('guide-css'); if (!s) { s = document.createElement('style'); s.id = 'guide-css'; document.head.append(s); } s.textContent = ${JSON.stringify(text)}; })()`);

setTimeout(() => { console.log("WATCHDOG"); chrome.kill(); process.exit(2); }, 1_200_000);
await send("Page.enable"); await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 1180, height: 820, deviceScaleFactor: 1, mobile: false });
await nav(URL_BASE);
await css(".dev-bar { display: none !important; }");

// ---------------------------------------------------------------- children with believable progress
console.log("seeding children");
const ids = await ev(`(async () => {
  const { recordSet } = await import('/src/core/profiles.ts');
  const { addDays } = await import('/src/core/dates.ts');
  const s = __app.store;
  const today = __app.today();
  const kids = [["An", "rocket"], ["Bình", "strawberry"], ["Chi", "sun_with_face"], ["Mới", "kite"]].map(([n, a]) => s.addProfile(n, a).id);
  const sum = (score, seed, nextSeed) => ({ seed, score, total: 5, stars: score >= 5 ? 3 : score >= 3 ? 2 : 1, nextSeed, peakTier: nextSeed.tier, firstTries: [] });
  const play = (id, daysAgo, game, score, seed, next) => {
    const d = s.data, day = addDays(today, -daysAgo);
    s.update((x) => ({ ...x, profiles: { ...x.profiles, [id]: recordSet(x.profiles[id], game, sum(score, seed, next), d.settings, Date.now() - daysAgo * 86400000, day) } }));
  };
  const [an, binh, chi] = kids;
  play(an, 4, 'split', 5, {tier:1,step:0}, {tier:1,step:1}); play(an, 3, 'equations', 4, {tier:1,step:0}, {tier:1,step:1});
  play(an, 3, 'scale', 4, {tier:1,step:0}, {tier:1,step:1}); play(an, 2, 'basket', 3, {tier:1,step:0}, {tier:1,step:0});
  play(an, 2, 'split', 4, {tier:1,step:1}, {tier:1,step:2}); play(an, 1, 'scale', 5, {tier:1,step:1}, {tier:1,step:2});
  play(an, 1, 'robot', 4, {tier:1,step:0}, {tier:1,step:1}); play(an, 0, 'split', 5, {tier:1,step:2}, {tier:2,step:0});
  play(an, 0, 'compare', 3, {tier:1,step:0}, {tier:1,step:0});
  play(binh, 1, 'split', 3, {tier:1,step:0}, {tier:1,step:0}); play(binh, 0, 'robot', 5, {tier:1,step:0}, {tier:1,step:1});
  play(chi, 0, 'basket', 4, {tier:1,step:0}, {tier:1,step:1});
  // every guide has been seen, except the new child's
  s.update((x) => { const profiles = { ...x.profiles }; for (const id of [an, binh, chi]) profiles[id] = { ...profiles[id], games: Object.fromEntries(Object.entries(profiles[id].games).map(([k, g]) => [k, { ...g, seenGuide: true }])) }; return { ...x, profiles }; });
  return kids;
})()`);
const [an, binh, chi, moi] = ids;
await ev(`__app.store.setActive(null)`);

// ---------------------------------------------------------------- 1. who + add
await goHash("#/who");
await shot("01-who");
await click("#add-friend");
await sleep(400);
await send("Input.insertText", { text: "Linh" });
await shot("02-add-child", 600);
await click(".add-card .btn-secondary");

// ---------------------------------------------------------------- 2. home
await ev(`__app.store.setActive(${JSON.stringify(an)})`);
await goHash("#/home");
await shot("03-home");
await css(".dev-bar { display: none !important; } .gate-btn { outline: 6px solid #e8453c; outline-offset: 7px; opacity: 1 !important; } .gate-tip { opacity: 1 !important; }");
await shot("04-padlock", 300);
await css(".dev-bar { display: none !important; }");

// ---------------------------------------------------------------- 3. every game, Vòng 1 and Vòng 3
const GAME_SHOTS = [
  ["split", 1, 1, 3], ["split", 3, 1, 2],
  ["equations", 1, 1, 2], ["equations", 3, 1, 3],
  ["basket", 1, 1, 3], ["basket", 2, 1, 2],
  ["scale", 1, 1, 1], ["scale", 2, 1, 2],
  ["robot", 1, 1, 3], ["robot", 3, 1, 2],
  ["compare", 1, 1, 1], ["compare", 3, 1, 2],
];
for (const [game, tier, step, seed] of GAME_SHOTS) {
  await goHash(`#/dev/${game}/${tier}/${step}/${seed}`, 700);
  await shot(`game-${game}-v${tier}`, 1200);
}

// ---------------------------------------------------------------- 4. feedback cards
await goHash("#/dev/split/1/1/3", 700);
await ev(`(async () => {
  const { gameById } = await import('/src/games/index.ts');
  const { createRng } = await import('/src/core/rng.ts');
  const g = gameById('split'); const q = g.logic.generate({ tier: 1, step: 1 }, createRng(3));
  window.__okHint = g.text.hint(g.logic.check(q, g.logic.solve(q)), q).text;
  window.__badHint = g.text.hint({ correct: false, reason: 'wrong' }, q).text;
  const { showFeedback } = await import('/src/ui/overlay.ts');
  showFeedback(__app.stage.el, { kind: 'correct', title: 'Giỏi quá!', message: window.__okHint });
})()`);
await shot("20-feedback-correct", 1200);
await ev(`document.querySelector('.overlay [data-close]').click()`);
await ev(`(async () => { const { showFeedback } = await import('/src/ui/overlay.ts'); showFeedback(__app.stage.el, { kind: 'retry', title: 'Gần đúng rồi!', message: window.__badHint }); })()`);
await shot("21-feedback-retry", 900);
await ev(`document.querySelector('.overlay [data-close]').click()`);

// the guide card (first time): the new child
await ev(`__app.store.setActive(${JSON.stringify(moi)})`);
await goHash("#/play/robot", 1200);
await waitFor(`!!document.querySelector('.guide-card')`);
await shot("22-guide-card", 700);
await ev(`document.querySelector('.guide-card .btn-primary').click()`);

// ---------------------------------------------------------------- 5. stars screen
await ev(`__app.store.setActive(${JSON.stringify(an)})`);
await ev(`__app.lastSet = { game: 'split', summary: { seed: {tier:1,step:2}, score: 4, total: 5, stars: 2, nextSeed: {tier:2,step:0}, peakTier: 2, firstTries: [] }, streak: 3, firstStarToday: false }; __app.go('stars')`);
await shot("23-stars", 2200);

// ---------------------------------------------------------------- 6. break and "done for today"
await ev(`(() => { const id = __app.store.data.activeId; __app.store.update(d => ({ ...d, profiles: { ...d.profiles, [id]: { ...d.profiles[id], usage: { ...d.profiles[id].usage, sessionMs: 40 * 60000 } } } })); __app.time.reload(); __app.go('home'); })()`);
await waitFor(`!!document.querySelector('.screen-break')`);
await shot("24-break", 1200);
await ev(`(() => { __app.time.endBreak(); const id = __app.store.data.activeId; __app.store.update(d => ({ ...d, profiles: { ...d.profiles, [id]: { ...d.profiles[id], usage: { ...d.profiles[id].usage, playedMs: 31 * 60000 } } } })); __app.time.reload(); __app.go('home'); })()`);
await waitFor(`!!document.querySelector('.screen-locked')`);
await shot("25-locked", 1200);

// ---------------------------------------------------------------- 7. teacher area
const holdPadlock = async () => { const [x, y] = await center(".gate-btn"); await mouse("mousePressed", x, y); await sleep(1500); await mouse("mouseReleased", x, y); await sleep(500); };
const pin = async (digits) => { for (const d of digits) await click(`.pin-keys [data-k="${d}"]`); await sleep(800); };
await holdPadlock();
await shot("30-teacher-gate", 500);
await pin("1234");
await shot("31-teacher-fx", 800);
await click(`.t-nav [data-tab=time]`); await sleep(400);
await shot("32-teacher-time", 500);
await click(`.t-nav [data-tab=kids]`); await sleep(400);
await shot("33-teacher-kids", 500);
await click(`.t-nav [data-tab=backup]`); await sleep(400);
await shot("34-teacher-backup", 500);
await ev(`__app.go('home')`);
await sleep(500);
await ev(`(() => { const id = __app.store.data.activeId; __app.store.update(d => ({ ...d, profiles: { ...d.profiles, [id]: { ...d.profiles[id], usage: { ...d.profiles[id].usage, playedMs: 0, sessionMs: 0 } } } })); __app.time.reload(); })()`);

// ---------------------------------------------------------------- 8. Mèo's worked examples: pictures and videos
async function recordVideo(name, start) {
  const frames = [];
  const onFrame = (p) => frames.push({ t: p.metadata.timestamp, data: p.data });
  frameListeners.add(onFrame);
  await send("Page.startScreencast", { format: "jpeg", quality: 60, everyNthFrame: 2 });
  await start();
  await send("Page.stopScreencast");
  frameListeners.delete(onFrame);
  if (NO_VIDEO || frames.length < 5) return;
  // about 9 pictures a second are plenty for a worked example (and keep the file small)
  const thin = [];
  for (const f of frames) if (!thin.length || f.t - thin[thin.length - 1].t >= 0.11) thin.push(f);
  if (thin[thin.length - 1] !== frames[frames.length - 1]) thin.push(frames[frames.length - 1]);
  console.log(`  encoding ${name}: ${thin.length} of ${frames.length} frames`);
  await ev(`window.__f = []`);
  for (let i = 0; i < thin.length; i += 12) await ev(`window.__f.push(...${JSON.stringify(thin.slice(i, i + 12))})`);
  const b64 = await ev(`(async () => {
    const frames = window.__f;
    const bitmaps = await Promise.all(frames.map(async (f) => createImageBitmap(await (await fetch('data:image/jpeg;base64,' + f.data)).blob())));
    const canvas = document.createElement('canvas');
    canvas.width = 1180; canvas.height = 820;
    const c = canvas.getContext('2d');
    c.drawImage(bitmaps[0], 0, 0, 1180, 820);
    const rec = new MediaRecorder(canvas.captureStream(30), { mimeType: 'video/webm;codecs=vp9', videoBitsPerSecond: 1400000 });
    const chunks = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    const stopped = new Promise((r) => (rec.onstop = r));
    rec.start(250);
    const t0 = frames[0].t, begun = performance.now();
    for (let i = 0; i < frames.length; i++) {
      const wait = (frames[i].t - t0) * 1000 - (performance.now() - begun);
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      c.drawImage(bitmaps[i], 0, 0, 1180, 820);
    }
    await new Promise((r) => setTimeout(r, 600));
    rec.stop();
    await stopped;
    window.__f = null;
    const blob = new Blob(chunks, { type: 'video/webm' });
    return await new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(String(fr.result).split(',')[1]); fr.readAsDataURL(blob); });
  })()`);
  writeFileSync(`${VIDEO}${name}.webm`, Buffer.from(b64, "base64"));
  console.log(`  video ${name}: ${(b64.length * 0.75 / 1e6).toFixed(1)} MB`);
}

for (const game of ["robot", "scale"]) {
  console.log("demo", game);
  await ev(`__app.go('home')`); await sleep(400);
  await ev(`__app.go('play/${game}')`); await sleep(700);
  await click(".btn-round.info");
  await sleep(500);
  if (game === "robot") await shot("22b-guide-with-demo", 300);
  await recordVideo(`demo-${game}`, async () => {
    await click("#guide-demo");
    await waitFor(`!!document.querySelector('.demo-layer')`, 3000);
    await sleep(6500);
    await shot(`demo-${game}-1`, 0);
    await sleep(7000);
    await shot(`demo-${game}-2`, 0);
    await waitFor(`!!document.querySelector('.demo-layer.finished')`, 90000);
    await sleep(900);
    await shot(`demo-${game}-3`, 0);
  });
  await ev(`document.querySelector('#demo-ok').click()`);
  await sleep(300);
}

console.log("done");
chrome.kill();
process.exit(0);
