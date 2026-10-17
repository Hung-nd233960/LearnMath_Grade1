// Renders every background-music track to a WAV file (one full 16-bar loop each) so you can LISTEN to them
// without running the app, and prints a few sanity numbers (loudness, clipping, silence).
//   1) npm run dev            (in another terminal)
//   2) node scripts/bgm-preview.mjs          -> audio-pilot/bgm/<track>.wav
// The tunes are composed by rules in src/audio/music.ts and played by src/audio/bgm.ts: edit the track table
// there (tempo, key, rhythm, timbre) and run this again to hear the change.
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";

const CHROME = process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const URL_BASE = process.env.APP_URL ?? "http://localhost:5173/";
const OUT = decodeURIComponent(new URL("../audio-pilot/bgm/", import.meta.url).pathname).replace(/^\/(\w:)/, "$1");
mkdirSync(OUT, { recursive: true });
const PORT = 9888;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", `--remote-debugging-port=${PORT}`, `--user-data-dir=${mkdtempSync(`${tmpdir()}/ttth-bgm-`)}`, "about:blank"], { stdio: "ignore" });
let targets;
for (let i = 0; i < 50; i++) { try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (targets.find((t) => t.type === "page")) break; } catch {} await sleep(200); }
const ws = new WebSocket(targets.find((t) => t.type === "page").webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const pending = new Map(); let loaded = null;
ws.onmessage = (m) => { const msg = JSON.parse(m.data); if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); } else if (msg.method === "Page.loadEventFired" && loaded) loaded(); };
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr) => { const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true }); if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails.exception?.description ?? r.result.exceptionDetails.text)); return r.result.result.value; };
await send("Page.enable"); await send("Runtime.enable");
{ const p = new Promise((r) => (loaded = r)); await send("Page.navigate", { url: URL_BASE }); await p; await sleep(500); }

const ids = await ev(`import('/src/audio/music.ts').then(m => m.TRACK_IDS)`);
console.log("track      secs   peak    rms   clipped  first-5s-rms");
for (const track of ids) {
  const r = await ev(`(async () => {
    const { renderTrack } = await import('/src/audio/bgm.ts');
    const { TRACKS, LOOP_BARS, barSeconds } = await import('/src/audio/music.ts');
    const secs = Math.ceil(LOOP_BARS * barSeconds(TRACKS[${JSON.stringify(track)}]) + 2);
    const buf = await renderTrack(${JSON.stringify(track)}, secs);
    const d = buf.getChannelData(0);
    let peak = 0, sum = 0, clipped = 0, head = 0, headN = Math.min(d.length, 5 * buf.sampleRate);
    for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (a > peak) peak = a; if (a >= 0.999) clipped++; sum += d[i] * d[i]; if (i < headN) head += d[i] * d[i]; }
    const pcm = new Int16Array(d.length);
    for (let i = 0; i < d.length; i++) pcm[i] = Math.max(-1, Math.min(1, d[i])) * 32767;
    const header = new DataView(new ArrayBuffer(44));
    const w = (o, s) => [...s].forEach((c, i) => header.setUint8(o + i, c.charCodeAt(0)));
    w(0, 'RIFF'); header.setUint32(4, 36 + pcm.byteLength, true); w(8, 'WAVEfmt '); header.setUint32(16, 16, true); header.setUint16(20, 1, true); header.setUint16(22, 1, true);
    header.setUint32(24, buf.sampleRate, true); header.setUint32(28, buf.sampleRate * 2, true); header.setUint16(32, 2, true); header.setUint16(34, 16, true); w(36, 'data'); header.setUint32(40, pcm.byteLength, true);
    const bytes = new Uint8Array(44 + pcm.byteLength); bytes.set(new Uint8Array(header.buffer), 0); bytes.set(new Uint8Array(pcm.buffer), 44);
    let bin = ''; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return { secs, peak, rms: Math.sqrt(sum / d.length), clipped, head: Math.sqrt(head / headN), wav: btoa(bin) };
  })()`);
  writeFileSync(`${OUT}${track}.wav`, Buffer.from(r.wav, "base64"));
  console.log(`${track.padEnd(10)} ${String(r.secs).padStart(4)}  ${r.peak.toFixed(3)}  ${r.rms.toFixed(3)}  ${String(r.clipped).padStart(6)}   ${r.head.toFixed(3)}`);
}
console.log(`WAV files in ${OUT}`);
chrome.kill();
process.exit(0);
