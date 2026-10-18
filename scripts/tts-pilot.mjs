// Pilot test of text-to-speech for Mèo's voice: reads every clip of src/audio/manifest.ts, makes one audio
// file per clip with a TTS engine, and writes a listening page (index.html) to judge them by ear.
// Placeholders only: the teacher's recordings replace them (same file names). See docs/TTS_PILOT.md.
//
//   node scripts/tts-pilot.mjs                          Edge neural voice vi-VN-HoaiMyNeural (needs `pip install edge-tts` and internet)
//   node scripts/tts-pilot.mjs --voice vi-VN-NamMinhNeural --rate=-10%
//   node scripts/tts-pilot.mjs --engine piper --model path/to/vi_VN-vais1000-medium.onnx   (offline; `pip install piper-tts`)
//   node scripts/tts-pilot.mjs --only n7,n13,give_meo   a few clips;   --force   redo existing files;   --install   make the result a voice pack in public/audio/<pack>/
//
// Options: --out <dir> (default audio-pilot/<engine>-<voice>)  --edge-bin / --piper-bin <path to the program>
//          --python <python with miniaudio + lameenc>  (trims the silence TTS engines add around each word; see scripts/tts_trim.py)
// Files: <out>/raw/<id>.mp3|wav as the engine made them, <out>/<id>.mp3 trimmed (the ones to listen to and to install).
import { spawn } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { CLIP_GROUPS } from "../src/audio/manifest.ts";
import { say } from "../src/i18n/speech.ts";

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.findIndex((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (i < 0) return fallback;
  if (args[i].includes("=")) return args[i].split("=").slice(1).join("=");
  return args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : true;
};
const toPath = (u) => decodeURIComponent(u.pathname).replace(/^\/(\w:)/, "$1");

const engine = flag("engine", "edge");
const voice = flag("voice", engine === "edge" ? "vi-VN-HoaiMyNeural" : "piper");
const rate = flag("rate", "-8%"); // a little slower than normal speech suits 6-year-olds
const only = flag("only", "") ? String(flag("only")).split(",") : null;
const force = !!flag("force", false);
const out = String(flag("out", toPath(new URL(`../audio-pilot/${engine}-${voice}/`, import.meta.url)))).replace(/[\\/]*$/, "/");
const rawExt = engine === "edge" ? "mp3" : "wav";
const ext = "mp3"; // what the app plays
const raw = `${out}raw/`;
mkdirSync(raw, { recursive: true });

const all = Object.entries(CLIP_GROUPS).flatMap(([group, clips]) => Object.entries(clips).map(([id, text]) => ({ group, id, text })));
const todo = all.filter((c) => (!only || only.includes(c.id)) && (force || !existsSync(`${raw}${c.id}.${rawExt}`)));

const run = (cmd, argv, input) => new Promise((resolve) => {
  const p = spawn(cmd, argv, { stdio: ["pipe", "ignore", "pipe"], shell: false, env: { ...process.env, PYTHONUTF8: "1", PYTHONIOENCODING: "utf-8" } });  // the engines are Python: read Vietnamese as UTF-8 on Windows too
  let err = "";
  p.stderr.on("data", (d) => (err += d));
  p.on("error", (e) => resolve({ ok: false, err: String(e) }));
  p.on("close", (code) => resolve({ ok: code === 0, err }));
  p.stdin.end(input ?? "");
});

async function makeClip(c) {
  const file = `${raw}${c.id}.${rawExt}`;
  if (engine === "edge") {
    return run(String(flag("edge-bin", "edge-tts")), ["--voice", voice, `--rate=${rate}`, "--text", c.text, "--write-media", file]);
  }
  if (engine === "piper") {
    return run(String(flag("piper-bin", "piper")), ["-m", String(flag("model")), "-f", file], c.text);
  }
  throw new Error(`unknown engine ${engine}`);
}

console.log(`${engine} / ${voice}: ${todo.length} of ${all.length} clips to make into ${out}`);
const failed = [];
let done = 0;
const queue = [...todo];
await Promise.all(Array.from({ length: engine === "edge" ? 3 : 2 }, async () => {
  for (let c = queue.shift(); c; c = queue.shift()) {
    // the free online service sometimes answers with nothing when asked too fast: wait and try again
    let r = await makeClip(c);
    for (let attempt = 1; !r.ok && attempt <= 4; attempt++) {
      try { unlinkSync(`${raw}${c.id}.${rawExt}`); } catch { /* nothing was written */ }
      await new Promise((ok) => setTimeout(ok, 1500 * attempt));
      r = await makeClip(c);
    }
    if (!r.ok) { try { unlinkSync(`${raw}${c.id}.${rawExt}`); } catch { /* nothing was written */ } }
    done++;
    if (!r.ok) { failed.push({ id: c.id, err: r.err.trim().split("\n").pop() }); console.log(`  FAIL ${c.id}: ${failed.at(-1).err}`); }
    else if (done % 20 === 0) console.log(`  ${done}/${todo.length}`);
  }
}));

// ---- trim the silence the engines add, and write the finished mp3 files
const trimmed = await run(String(flag("python", "python")), [toPath(new URL("./tts_trim.py", import.meta.url)), raw, out]);
if (!trimmed.ok) { console.log(`Trimming failed (pip install miniaudio lameenc, then pass --python): ${trimmed.err.trim().split("\n").pop()}`); process.exit(1); }

// ---- the listening page: every clip, and a few sentences stitched from clips exactly like the app does ----
const sentences = [
  ["Đưa cho Mèo mười ba quả cam", say("give_meo", 13, "fruit_cam")],
  ["Đưa cho Mèo hai mươi lăm quả táo", say("give_meo", 25, "fruit_tao")],
  ["Ba cộng bốn bằng bảy", say(3, "cong", 4, "bang", 7)],
  ["Hai chục là hai mươi quả cam", say(2, "chuc", "la", 20, "fruit_cam")],
  ["Giỏi quá! Em đếm rất cẩn thận!", say("praise_1", "split_ok")],
  ["Nghỉ mắt một chút nhé!", say("break_start")],
];
const exists = (id) => existsSync(`${out}${id}.${ext}`);
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const html = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>TTS pilot: ${esc(engine)} ${esc(voice)}</title>
<style>body{font:17px/1.5 system-ui,sans-serif;max-width:900px;margin:20px auto;padding:0 16px;color:#1e2a4a}h1{font-size:26px}h2{margin-top:30px;border-bottom:2px solid #e1e7f2}
.c{display:flex;align-items:center;gap:10px;padding:4px 0;border-bottom:1px solid #eef1f7}.c code{width:170px;color:#5b6785;font-size:14px}.c span{flex:1}button{border:0;background:#2f8a4c;color:#fff;border-radius:999px;padding:4px 16px;font-size:15px;cursor:pointer}
.miss{opacity:.4}.seq{background:#fff1c2;border-radius:12px;padding:8px 14px;margin:8px 0;display:flex;gap:12px;align-items:center}</style></head><body>
<h1>TTS pilot: ${esc(engine)} · ${esc(voice)} · rate ${esc(String(rate))}</h1>
<p>${all.filter((c) => exists(c.id)).length} of ${all.length} clips made. Listen for: the six Vietnamese tones, numbers that sound natural joined together, no clipped starts or ends.</p>
<h2>Sentences stitched from clips (as the app plays them)</h2>
${sentences.map(([label, s]) => `<div class="seq"><button onclick='playSeq(${JSON.stringify(s.clips)})'>▶</button><span>${esc(label)}</span><code>${s.clips.join(" + ")}</code></div>`).join("\n")}
${Object.entries(CLIP_GROUPS).map(([group, clips]) => `<h2>${esc(group)}</h2>\n${Object.entries(clips).map(([id, text]) => `<div class="c${exists(id) ? "" : " miss"}"><button onclick="play('${id}')">▶</button><code>${id}</code><span>${esc(text)}</span></div>`).join("\n")}`).join("\n")}
<script>
const EXT = ${JSON.stringify(ext)};
let current = null, token = 0;
function clip(id) { return new Promise((res) => { const a = new Audio(id + "." + EXT); current = a; a.onended = res; a.onerror = res; a.play().catch(res); }); }
async function play(id) { token++; current && current.pause(); await clip(id); }
async function playSeq(ids) { const mine = ++token; current && current.pause(); for (const id of ids) { if (mine !== token) return; await clip(id); } }
</script></body></html>`;
writeFileSync(`${out}index.html`, html);
writeFileSync(`${out}report.json`, JSON.stringify({ engine, voice, rate, made: all.filter((c) => exists(c.id)).length, total: all.length, failed }, null, 2));

console.log(`${all.filter((c) => exists(c.id)).length} of ${all.length} clips present, ${failed.length} failed. Listen: ${out}index.html`);
if (flag("install", false)) {
  // become a voice pack the teacher can choose: public/audio/<pack>/<id>.mp3 + pack.json (see src/audio/packs.ts)
  const NAMES = {
    "edge-vi-VN-HoaiMyNeural": { id: "hoai-my", name: "Hoài My (nữ, giọng máy)", note: "Giọng nữ tổng hợp (thử nghiệm), nghe như giọng miền Nam.", order: 11 },
    // the Northern voice the teachers asked for: the default until the teacher's own recordings are complete (order 0)
    "edge-vi-VN-NamMinhNeural": { id: "nam-minh", name: "Nam Minh (giọng miền Bắc)", note: "Giọng nam tổng hợp (thử nghiệm), giọng miền Bắc. Đây là giọng mặc định cho đến khi có bản thu của giáo viên.", order: 1 },
    "piper-vais1000": { id: "piper", name: "Piper (giọng máy, chạy ngoại tuyến)", note: "Giọng tổng hợp mã nguồn mở (thử nghiệm), không cần mạng khi tạo.", order: 12 },
  };
  const meta = NAMES[`${engine}-${voice}`] ?? { id: `${engine}-${voice}`.toLowerCase(), name: `${engine} ${voice}`, note: "Giọng tổng hợp (thử nghiệm).", order: 20 };
  const dest = toPath(new URL(`../public/audio/${meta.id}/`, import.meta.url));
  mkdirSync(dest, { recursive: true });
  for (const f of readdirSync(out).filter((f) => f.endsWith(".mp3"))) if (statSync(`${out}${f}`).size > 0) copyFileSync(`${out}${f}`, `${dest}${f}`);
  writeFileSync(`${dest}pack.json`, JSON.stringify({ name: meta.name, note: meta.note, order: meta.order }, null, 2) + "\n");
  console.log(`installed as voice pack "${meta.id}" in ${dest} (commit it to ship it; these are placeholders, the teacher's recordings go in public/audio/teacher/)`);
}
process.exit(failed.length ? 1 : 0);
