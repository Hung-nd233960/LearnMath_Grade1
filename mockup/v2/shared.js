// Thám tử Toán học Tí hon — mockup v2 shared helpers (plain JS, no build step)
const STAGE_W = 1180, STAGE_H = 820;

const E = (name) => `assets/emoji/${name}_3d.png`;
const img = (name, size, extra = "") =>
  `<img class="emo" src="${E(name)}" width="${size}" height="${size}" alt="" ${extra}>`;
const tier = () => Math.min(3, Math.max(1, +new URLSearchParams(location.search).get("v") || 1));
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/* ---------- storage (try/catch: private mode, previews) ---------- */
const store = {
  get(k, d) { try { const v = localStorage.getItem("ttth." + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem("ttth." + k, JSON.stringify(v)); } catch {} },
};

/* ---------- stage scaling + portrait notice ---------- */
function fitStage() {
  const s = Math.min(innerWidth / STAGE_W, innerHeight / STAGE_H);
  document.documentElement.style.setProperty("--s", s);
  document.body.classList.toggle("portrait", innerHeight > innerWidth || Math.min(innerWidth, innerHeight) < 420);
}
addEventListener("resize", fitStage);

/* ---------- icons ---------- */
const ICON = {
  back: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>`,
  sound: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9.5v5h4l5 4v-13l-5 4H3z" fill="currentColor"/><path d="M16 9a4.5 4.5 0 010 6M18.6 6.5a8 8 0 010 11"/></svg>`,
  mute: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9.5v5h4l5 4v-13l-5 4H3z" fill="currentColor"/><path d="M16.5 9.5l5 5M21.5 9.5l-5 5"/></svg>`,
  replay: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9.5v5h4l5 4v-13l-5 4H3z" fill="currentColor"/><path d="M16 9a4.5 4.5 0 010 6"/></svg>`,
  check: `<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5l5 5L20 6.5"/></svg>`,
};

/* ---------- Mèo Smarty (custom SVG) ---------- */
function meoSVG(mood = "normal") {
  const N = "#1E2A4A";
  let eyes;
  if (mood === "happy") {
    eyes = `<path d="M60 112 q12 -15 24 0" stroke="${N}" stroke-width="6" fill="none" stroke-linecap="round"/>
            <path d="M116 112 q12 -15 24 0" stroke="${N}" stroke-width="6" fill="none" stroke-linecap="round"/>`;
  } else if (mood === "sleep") {
    eyes = `<path d="M60 108 q12 10 24 0" stroke="${N}" stroke-width="5" fill="none" stroke-linecap="round"/>
            <path d="M116 108 q12 10 24 0" stroke="${N}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
  } else {
    eyes = `<g class="eyes"><ellipse cx="72" cy="106" rx="11" ry="14" fill="${N}"/><circle cx="76" cy="100" r="4.5" fill="#fff"/><circle cx="68" cy="112" r="2" fill="#fff"/>
            <ellipse cx="128" cy="106" rx="11" ry="14" fill="${N}"/><circle cx="132" cy="100" r="4.5" fill="#fff"/><circle cx="124" cy="112" r="2" fill="#fff"/></g>`;
    if (mood === "think") eyes += `<path d="M58 84 l24 -6M118 78 l24 6" stroke="${N}" stroke-width="4" stroke-linecap="round"/>`;
  }
  const mouth = mood === "happy"
    ? `<path d="M86 138 q14 22 28 0 z" fill="#C2414F" stroke="${N}" stroke-width="3.5" stroke-linejoin="round"/>`
    : mood === "think"
      ? `<path d="M90 142 q10 -5 20 0" stroke="${N}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`
      : `<path d="M86 138 q7 8 14 0 q7 8 14 0" stroke="${N}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
  const lens = mood === "detective" || mood === "normal"
    ? `<g transform="rotate(-20 168 168)"><rect x="160" y="178" width="14" height="34" rx="7" fill="#8A5A30"/>
       <circle cx="167" cy="160" r="24" fill="#CFE8FF" fill-opacity=".85" stroke="${N}" stroke-width="7"/>
       <path d="M155 152 q6 -8 14 -8" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round"/></g>` : "";
  const zzz = mood === "sleep" ? `<text x="150" y="60" font-family="Baloo 2" font-weight="800" font-size="30" fill="${N}">z</text><text x="168" y="38" font-family="Baloo 2" font-weight="800" font-size="22" fill="${N}">z</text>` : "";
  return `<svg viewBox="0 0 210 220" xmlns="http://www.w3.org/2000/svg" overflow="visible">
    <ellipse cx="100" cy="122" rx="76" ry="68" fill="#F7B93A"/>
    <path d="M84 60 q16 14 32 0" stroke="#E39228" stroke-width="6" fill="none" stroke-linecap="round"/>
    <path d="M28 120 q-4 -8 6 -14M172 120 q4 -8 -6 -14" stroke="#E39228" stroke-width="5" fill="none" stroke-linecap="round"/>
    <ellipse cx="100" cy="148" rx="40" ry="28" fill="#FFE7B5"/>
    <ellipse cx="50" cy="136" rx="14" ry="9" fill="#FF8C8C" opacity=".55"/>
    <ellipse cx="150" cy="136" rx="14" ry="9" fill="#FF8C8C" opacity=".55"/>
    ${eyes}
    <path d="M92 126 h16 l-8 9 z" fill="#F0606E" stroke="#F0606E" stroke-width="3" stroke-linejoin="round"/>
    ${mouth}
    <g stroke="${N}" stroke-width="2.6" stroke-linecap="round" opacity=".7">
      <path d="M40 142 l-26 -4M40 150 l-24 6M160 142 l26 -4M160 150 l24 6"/></g>
    <!-- detective hat -->
    <path d="M42 76 Q100 2 158 76 Z" fill="#7B5434"/>
    <path d="M60 52 L72 76M86 34 L92 76M114 34 L108 76M140 52 L128 76" stroke="#654328" stroke-width="4"/>
    <path d="M44 70 Q100 46 156 70 L158 82 Q100 58 42 82 Z" fill="#E8604C"/>
    <ellipse cx="100" cy="80" rx="74" ry="11" fill="#5E3E22"/>
    <circle cx="100" cy="30" r="8" fill="#E8604C"/>
    <!-- ears (poke out from under the hat) -->
    <path d="M40 92 L22 34 L78 62 Z" fill="#F7B93A" stroke="#E39228" stroke-width="3" stroke-linejoin="round"/>
    <path d="M42 80 L32 48 L64 64 Z" fill="#FF9DA7"/>
    <path d="M160 92 L178 34 L122 62 Z" fill="#F7B93A" stroke="#E39228" stroke-width="3" stroke-linejoin="round"/>
    <path d="M158 80 L168 48 L136 64 Z" fill="#FF9DA7"/>
    ${lens}${zzz}
  </svg>`;
}
function mountMeo(root = document) {
  $$("[data-meo]", root).forEach((el) => { el.innerHTML = meoSVG(el.dataset.meo || "normal"); });
}

/* ---------- eye-candy settings ---------- */
const FX_DEFAULT = { anim: true, decor: true, celebrate: true, sfx: true };
const FX_PRESETS = {
  calm: { anim: false, decor: false, celebrate: false, sfx: false },
  mid: { anim: true, decor: false, celebrate: true, sfx: true },
  all: { anim: true, decor: true, celebrate: true, sfx: true },
};
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
let fx = Object.assign({}, FX_DEFAULT, reducedMotion ? { anim: false } : {}, store.get("fx", {}));
function applyFx() { for (const k in FX_DEFAULT) document.documentElement.classList.toggle("fx-" + k, !!fx[k]); }
applyFx();

// Settings form — rendered only inside the PIN-protected teacher area (teacher.html), never on a child's screen.
function fxSettings(root) {
  const rows = [
    ["anim", "Hoạt ảnh", "Mèo chớp mắt, nút và quả nhún nhảy"],
    ["decor", "Trang trí nền", "Hình mờ trôi nhẹ phía sau màn hình"],
    ["celebrate", "Pháo hoa", "Pháo giấy khi đúng, lấp lánh khi thả quả"],
    ["sfx", "Âm thanh hiệu ứng", "Tiếng bấm, tiếng thả quả, tiếng chúc mừng"],
  ];
  root.innerHTML = `<div class="settings"><div class="presets">
      <button data-preset="calm">${img("seedling", 34)}Yên tĩnh</button>
      <button data-preset="mid">${img("sparkles", 34)}Vừa phải</button>
      <button data-preset="all">${img("party_popper", 34)}Rực rỡ</button></div>
    ${rows.map(([k, t, d]) => `<label class="sw"><span><b>${t}</b><small>${d}</small></span><input type="checkbox" data-fx="${k}" ${fx[k] ? "checked" : ""}><i></i></label>`).join("")}</div>`;
  const save = () => { store.set("fx", fx); applyFx(); root.querySelectorAll("[data-fx]").forEach((i) => (i.checked = fx[i.dataset.fx])); };
  root.addEventListener("change", (e) => { const k = e.target.dataset.fx; if (k) { fx[k] = e.target.checked; save(); } });
  root.addEventListener("click", (e) => { const p = e.target.closest("[data-preset]"); if (p) { Object.assign(fx, FX_PRESETS[p.dataset.preset]); save(); SFX.win(); } });
}

/* sound effects: synthesised with Web Audio, no files needed */
let actx;
function tone(freqs, { type = "triangle", dur = 0.12, gap = 0.07, vol = 0.12 } = {}) {
  if (muted || !fx.sfx) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === "suspended") actx.resume();
    freqs.forEach((f, i) => {
      const t = actx.currentTime + i * gap, o = actx.createOscillator(), g = actx.createGain();
      o.type = type; o.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(actx.destination); o.start(t); o.stop(t + dur + 0.02);
    });
  } catch {}
}
const SFX = {
  tap: () => tone([700], { dur: 0.06, vol: 0.05 }),
  pick: () => tone([520, 780], { dur: 0.08, gap: 0.05, vol: 0.09 }),
  drop: () => tone([990, 740], { dur: 0.1, gap: 0.06, vol: 0.09 }),
  win: () => tone([523, 659, 784, 1047], { dur: 0.2, gap: 0.1, vol: 0.12 }),
  oops: () => tone([330, 247], { type: "sine", dur: 0.2, gap: 0.13, vol: 0.1 }),
};
document.addEventListener("click", (e) => {
  if (e.target.closest("button:not([data-close]), a.tile, a.kid, .flower")) SFX.tap();
});

/* sparkles burst from an element */
function sparkle(el, n = 6, dist = 70) {
  if (!fx.celebrate || !el) return;
  const stage = $(".stage"), s = stage.getBoundingClientRect(), r = el.getBoundingClientRect(), k = s.width / STAGE_W;
  for (let i = 0; i < n; i++) {
    const p = document.createElement("img");
    p.src = E("sparkles"); p.className = "spark";
    p.style.left = (r.left + r.width / 2 - s.left) / k + "px";
    p.style.top = (r.top + r.height / 2 - s.top) / k + "px";
    p.style.setProperty("--dx", Math.cos((i / n) * 6.283) * dist + "px");
    p.style.setProperty("--dy", Math.sin((i / n) * 6.283) * dist + "px");
    stage.appendChild(p);
    setTimeout(() => p.remove(), 800);
  }
}

/* faint drifting pictures behind each screen */
const DECOR = {
  "index.html": ["glowing_star", "rainbow", "sparkles", "red_apple", "kite", "star"],
  "profiles.html": ["rainbow", "star", "kite", "sparkles", "sun_with_face", "glowing_star"],
  "scale.html": ["grapes", "red_apple", "watermelon", "star", "grapes", "sparkles"],
  "robot.html": ["star", "rocket", "sparkles", "glowing_star", "triangular_flag", "star"],
  "basket.html": ["tangerine", "banana", "red_apple", "sparkles", "strawberry", "tangerine"],
  "equations.html": ["red_apple", "pear", "watermelon", "sparkles", "input_numbers", "star"],
  "split.html": ["tulip", "sunflower", "cherry_blossom", "hibiscus", "tulip", "sparkles"],
  "compare.html": ["wrapped_gift", "star", "wrapped_gift", "sparkles", "balance_scale", "glowing_star"],
  "break.html": ["star", "sparkles", "glowing_star", "star", "sparkles", "seedling"],
  "teacher.html": [],
};
function decor() {
  const page = location.pathname.split("/").pop() || "index.html";
  const set = DECOR[page] || DECOR["index.html"];
  if (!set.length) return;
  const spots = [[18, 118, 74], [1092, 128, 66], [10, 452, 64], [1110, 430, 72], [96, 740, 60], [1040, 744, 70]];
  const d = document.createElement("div");
  d.className = "decor";
  d.innerHTML = spots.map(([x, y, sz], i) => `<img src="${E(set[i % set.length])}" width="${sz}" height="${sz}" style="left:${x}px;top:${y}px" alt="">`).join("");
  $(".stage").prepend(d);
}

/* ---------- sound (placeholder: browser vi-VN voice if present) ---------- */
let muted = store.get("muted", false);
function speak(text) {
  if (muted || !("speechSynthesis" in window)) return;
  const vi = speechSynthesis.getVoices().find((v) => v.lang && v.lang.toLowerCase().startsWith("vi"));
  if (!vi) return; // real app: recorded teacher clips instead
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.voice = vi; u.lang = vi.lang; u.rate = 0.9;
  speechSynthesis.speak(u);
}
function paintSpeakers() {
  $$("[data-speaker]").forEach((b) => { b.innerHTML = muted ? ICON.mute : ICON.sound; b.title = muted ? "Bật tiếng" : "Tắt tiếng"; });
  document.body.classList.toggle("muted", muted);
}
document.addEventListener("click", (e) => {
  if (e.target.closest("[data-speaker]")) {
    muted = !muted; store.set("muted", muted); paintSpeakers();
    if (muted && "speechSynthesis" in window) speechSynthesis.cancel();
    document.dispatchEvent(new CustomEvent("mutechange"));
  }
});

/* ---------- top bar ---------- */
function topbar({ title = "", done = 0, now = true, info = true } = {}) {
  const dots = Array.from({ length: 5 }, (_, i) =>
    `<span class="${i < done ? "done" : i === done && now ? "now" : ""}"></span>`).join("");
  return `<div class="topbar">
    <a class="btn-round" href="index.html" title="Về trang chủ">${ICON.back}</a>
    <div class="mid">${title ? `<span>${title}</span>` : ""}<span class="tier-badge">Vòng ${tier()}</span><div class="dots">${dots}</div></div>
    <div class="right">${info ? `<button class="btn-round info" data-guide title="Hướng dẫn">i</button>` : ""}<button class="btn-round dark" data-speaker></button></div>
  </div>`;
}

/* ---------- feedback & guide overlays ---------- */
function overlay(html) {
  const stage = $(".stage");
  const o = document.createElement("div");
  o.className = "overlay";
  o.innerHTML = `<div class="card">${html}</div>`;
  stage.appendChild(o);
  mountMeo(o);
  o.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) o.remove(); });
  return o;
}
function confetti() {
  if (!fx.celebrate) return;
  const stage = $(".stage");
  const colors = ["#ffc53d", "#e8604c", "#2f8a4c", "#4d8df6", "#b06cf2", "#ff8fb1"];
  for (let i = 0; i < 46; i++) {
    const c = document.createElement("div");
    c.className = "confetti";
    c.style.left = Math.random() * 1180 + "px";
    c.style.background = colors[i % colors.length];
    c.style.setProperty("--dx", (Math.random() * 200 - 100) + "px");
    c.style.setProperty("--r", (Math.random() * 720 - 360) + "deg");
    c.style.animationDelay = Math.random() * 0.4 + "s";
    stage.appendChild(c);
    setTimeout(() => c.remove(), 2400);
  }
}
function feedback(ok, msg, { title, stars = 0, next } = {}) {
  if (ok) { confetti(); SFX.win(); } else SFX.oops();
  const starRow = stars ? `<div class="stars">${img("glowing_star", 54).repeat(stars)}</div>` : "";
  const o = overlay(`<div class="meo" data-meo="${ok ? "happy" : "think"}"></div>
    <div><h2>${title || (ok ? "Giỏi quá!" : "Gần đúng rồi!")}</h2>${starRow}<p>${msg}</p>
    <button class="btn ${ok ? "btn-primary" : "btn-secondary"}" data-close>${ok ? "Câu tiếp theo" : "Thử lại nhé"}</button></div>`);
  speak((title || (ok ? "Giỏi quá!" : "Gần đúng rồi!")) + " " + msg.replace(/<[^>]+>/g, ""));
  if (next) o.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) next(); });
  return o;
}
function guide(steps) {
  document.addEventListener("click", (e) => {
    if (!e.target.closest("[data-guide]")) return;
    overlay(`<div class="meo" data-meo="detective"></div>
      <div><h2>Mèo chỉ em cách chơi</h2><ol>${steps.map((s) => `<li>${s}</li>`).join("")}</ol>
      <p style="font-size:15px;color:var(--ink-muted);margin:-8px 0 16px">(Bản thật: Mèo làm mẫu một câu bằng bàn tay chuyển động và giọng nói.)</p>
      <button class="btn btn-primary" data-close>Em hiểu rồi!</button></div>`);
    speak(steps.join(". "));
  });
}

/* ---------- drag OR tap-then-tap ---------- */
function dragTap(onMove) {
  let sel = null, item = null, start = null, ghost = null, off = null;
  const clearSel = () => { if (sel) sel.classList.remove("selected"); sel = null; };
  const zoneOf = (el) => el && el.closest("[data-zone]");
  const moved = (it, z) => { onMove(it, z); SFX.drop(); requestAnimationFrame(() => sparkle(it, 5, 46)); };

  document.addEventListener("pointerdown", (e) => {
    const it = e.target.closest("[data-item]");
    if (it && !it.hasAttribute("data-fixed")) {
      item = it; start = { x: e.clientX, y: e.clientY }; e.preventDefault(); return;
    }
    const z = zoneOf(e.target);
    if (z && sel) { const s = sel; clearSel(); moved(s, z); }
  });
  document.addEventListener("pointermove", (e) => {
    if (!item) return;
    if (!ghost && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 8) {
      clearSel();
      const r = item.getBoundingClientRect();
      const s = r.width / item.offsetWidth || 1;
      ghost = item.cloneNode(true);
      ghost.classList.add("ghost");
      ghost.style.width = item.offsetWidth + "px"; ghost.style.height = item.offsetHeight + "px";
      ghost.style.transform = `scale(${s * 1.12})`;
      off = { x: start.x - r.left, y: start.y - r.top };
      document.body.appendChild(ghost);
      item.classList.add("dragging");
      SFX.pick();
    }
    if (ghost) { ghost.style.left = e.clientX - off.x + "px"; ghost.style.top = e.clientY - off.y + "px"; }
  });
  document.addEventListener("pointerup", (e) => {
    if (!item) return;
    const it = item; item = null;
    if (ghost) {
      ghost.remove(); ghost = null; it.classList.remove("dragging");
      const z = zoneOf(document.elementFromPoint(e.clientX, e.clientY));
      if (z) moved(it, z);
      return;
    }
    // tap
    if (sel && sel !== it && zoneOf(it) !== zoneOf(sel)) { const s = sel; clearSel(); moved(s, zoneOf(it)); return; }
    if (sel === it) { clearSel(); return; }
    clearSel(); sel = it; it.classList.add("selected"); SFX.pick();
  });
}

/* ---------- number pad bound to answer boxes ---------- */
function numpad(container, onChange) {
  container.innerHTML = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((n) => `<button data-n="${n}">${n}</button>`).join("") +
    `<button class="del" data-del>xoá</button>`;
  let active = $(".answer-box");
  const activate = (b) => { $$(".answer-box").forEach((x) => x.classList.remove("active")); active = b; if (b) b.classList.add("active"); };
  activate($(".answer-box"));
  document.addEventListener("click", (e) => {
    const box = e.target.closest(".answer-box"); if (box) activate(box);
  });
  container.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b || !active) return;
    let v = active.dataset.v || "";
    if (b.hasAttribute("data-del")) v = v.slice(0, -1);
    else if (v.length < 2) v = v === "0" ? b.dataset.n : v + b.dataset.n;
    active.dataset.v = v; active.textContent = v;
    active.classList.toggle("filled", v !== "");
    onChange && onChange();
  });
  return { activate };
}

/* ---------- mockup review bar (not part of the real app) ---------- */
const PAGES = [
  ["index.html", "Trang chủ"], ["profiles.html", "Chọn bạn"],
  ["scale.html", "1 Cái cân"], ["robot.html", "2 Rô-bốt"], ["basket.html", "3 Giỏ"],
  ["equations.html", "4 Tính theo hình"], ["split.html", "5 Mấy và mấy"], ["compare.html", "6 So sánh cân"],
  ["break.html", "Nghỉ / Hết giờ"], ["teacher.html", "Khu vực GV"],
];
function mockbar({ tiers = false, label = "Xem vòng:", names = ["1", "2", "3"] } = {}) {
  if (location.hash.startsWith("#clean")) return; // for screenshots
  const here = location.pathname.split("/").pop() || "index.html";
  const bar = document.createElement("div");
  bar.className = "mockbar" + (store.get("mockbarMin", false) ? " min" : "");
  bar.innerHTML = `<button class="toggle" title="Thu gọn">☰ Mockup</button>` +
    PAGES.map(([h, t]) => `<a href="${h}" class="${h === here ? "on" : ""}">${t}</a>`).join("") +
    (tiers ? `<span class="sep">|</span><b>${label}</b>` + names.map((t, i) => `<a href="?v=${i + 1}" class="${tier() === i + 1 ? "on" : ""}">${t}</a>`).join("") : "");
  bar.querySelector(".toggle").onclick = () => { bar.classList.toggle("min"); store.set("mockbarMin", bar.classList.contains("min")); };
  document.body.appendChild(bar);
}

/* ---------- shared SVG gradients (brass scale, wood, ceramic vase) ---------- */
function svgDefs() {
  if (document.getElementById("ttth-defs")) return;
  document.body.insertAdjacentHTML("afterbegin", `<svg id="ttth-defs" width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
    <linearGradient id="brass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe08a"/><stop offset=".55" stop-color="#f2b544"/><stop offset="1" stop-color="#c98a1e"/></linearGradient>
    <linearGradient id="brassV" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#c98a1e"/><stop offset=".38" stop-color="#ffe08a"/><stop offset="1" stop-color="#c98a1e"/></linearGradient>
    <linearGradient id="bowlG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe59a"/><stop offset="1" stop-color="#e3a234"/></linearGradient>
    <linearGradient id="wood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c98a4f"/><stop offset="1" stop-color="#9a5f2c"/></linearGradient>
    <radialGradient id="ceramic" cx=".36" cy=".42" r=".75"><stop offset="0" stop-color="#9be6f2"/><stop offset=".5" stop-color="#46acd0"/><stop offset="1" stop-color="#25729a"/></radialGradient>
  </defs></svg>`);
}

/* ---------- adult gate: hold the padlock ~1 s to reach the teacher area ---------- */
const GATE_HOLD_MS = 1100;
function adultGate() {
  $$("[data-adult-gate]").forEach((b) => {
    const tip = document.createElement("div");
    tip.className = "gate-tip"; tip.textContent = "Giữ để mở · dành cho người lớn";
    b.after(tip);
    let t0 = null, raf = 0, timer = 0, done = false;
    // The timer decides when the gate opens; animation frames only draw the ring (they can be throttled).
    const step = () => {
      b.style.setProperty("--p", Math.min(1, (performance.now() - t0) / GATE_HOLD_MS));
      if (!done) raf = requestAnimationFrame(step);
    };
    b.addEventListener("pointerdown", (e) => {
      e.preventDefault(); t0 = performance.now(); done = false; raf = requestAnimationFrame(step);
      timer = setTimeout(() => { done = true; b.style.setProperty("--p", 1); location.href = b.dataset.adultGate; }, GATE_HOLD_MS);
    });
    const stop = () => {
      if (t0 === null) return;
      cancelAnimationFrame(raf); clearTimeout(timer);
      if (!done) {
        b.style.setProperty("--p", 0);
        tip.classList.add("show"); clearTimeout(tip._t); tip._t = setTimeout(() => tip.classList.remove("show"), 1800);
      }
      t0 = null;
    };
    ["pointerup", "pointerleave", "pointercancel"].forEach((ev) => b.addEventListener(ev, stop));
  });
}

/* ---------- boot ---------- */
function boot() {
  const r = document.createElement("div");
  r.id = "rotate";
  r.innerHTML = `<div class="meo" data-meo="normal"></div><p>Em hãy xoay ngang máy, hoặc dùng máy tính bảng nhé!</p>`;
  document.body.appendChild(r);
  svgDefs(); decor(); mountMeo(); paintSpeakers(); adultGate(); fitStage();
  if ("speechSynthesis" in window) speechSynthesis.getVoices();
}
