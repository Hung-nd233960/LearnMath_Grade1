// Builds the user guide pages from scripts/guide-content.mjs and the pictures in docs/guide/img/:
//   docs/guide/HUONG_DAN.md + huong-dan.html   (Vietnamese)
//   docs/guide/USER_GUIDE.md + user-guide.html (English)
// Run `node scripts/guide-shots.mjs` first to (re)take the pictures and videos, then `node scripts/make-guide.mjs`.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { SECTIONS, SUBTITLE, TITLE } from "./guide-content.mjs";

const toPath = (u) => decodeURIComponent(u.pathname).replace(/^\/(\w:)/, "$1");
const DIR = toPath(new URL("../docs/guide/", import.meta.url));
const version = JSON.parse(readFileSync(toPath(new URL("../package.json", import.meta.url)), "utf8")).version;

const LANGS = {
  vi: {
    md: "HUONG_DAN.md", html: "huong-dan.html", other: "user-guide.html", otherName: "English", htmlLang: "vi",
    contents: "Mục lục", version: "Phiên bản ứng dụng", video: "Xem video",
    foot: "Hướng dẫn này được tạo tự động từ ứng dụng thật (ảnh chụp màn hình và video). Nếu màn hình khác ảnh, hãy báo cho người cài đặt để cập nhật.",
  },
  en: {
    md: "USER_GUIDE.md", html: "user-guide.html", other: "huong-dan.html", otherName: "Tiếng Việt", htmlLang: "en",
    contents: "Contents", version: "App version", video: "Watch the video",
    foot: "This guide is generated from the real app (screenshots and videos). If a screen looks different from its picture, tell whoever installs the app so it can be updated.",
  },
};

const missing = [];
const have = (kind, file) => {
  const ext = kind === "img" ? "png" : "webm";
  const ok = existsSync(`${DIR}${kind}/${file}.${ext}`);
  if (!ok) missing.push(`${kind}/${file}.${ext}`);
  return ok;
};

// ---- inline text: **bold**, *italic*, `code` ----
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const inline = (s) => esc(s).replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/\*([^*]+)\*/g, "<em>$1</em>");
const plain = (s) => s.replace(/[*`]/g, "");

/** GitHub's anchor for a heading: lower case, punctuation dropped, spaces to dashes. */
const ghSlug = (text) => text.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, "").trim().replace(/\s+/g, "-");

function renderMd(lang) {
  const L = LANGS[lang];
  const other = lang === "vi" ? ["English", "USER_GUIDE.md"] : ["Tiếng Việt", "HUONG_DAN.md"];
  const out = [`# ${TITLE[lang]}`, "", `*${SUBTITLE[lang]}*`, "", `[${other[0]}](${other[1]})`, "", `## ${L.contents}`, ""];
  let n = 0;
  const headings = SECTIONS.map((s) => (s.level === 3 ? s[lang] : `${++n}. ${s[lang]}`));
  SECTIONS.forEach((s, i) => out.push(s.level === 3 ? `   - [${s[lang]}](#${ghSlug(headings[i])})` : `- [${headings[i]}](#${ghSlug(headings[i])})`));
  out.push("");
  SECTIONS.forEach((s, i) => {
    out.push(`${s.level === 3 ? "###" : "##"} ${headings[i]}`, "");
    for (const item of s.body) out.push(...mdItem(item, lang), "");
  });
  out.push("---", "", `*${L.foot}* ${L.version}: ${version}.`, "");
  return out.join("\n");
}

function mdItem(item, lang) {
  const k = item[0];
  const L = LANGS[lang];
  const pick = lang === "vi" ? 0 : 1;
  if (k === "p") return [item[1 + pick]];
  if (k === "h3") return [`#### ${item[1 + pick]}`];
  if (k === "ul") return item[1 + pick].map((t) => `- ${t}`);
  if (k === "ol") return item[1 + pick].map((t, i) => `${i + 1}. ${t}`);
  if (k === "note") return [`> 💡 ${item[1 + pick]}`];
  if (k === "warn") return [`> ⚠️ ${item[1 + pick]}`];
  if (k === "img") return have("img", item[1]) ? [`![${plain(item[2 + pick])}](img/${item[1]}.png)`, `*${item[2 + pick]}*`] : [];
  if (k === "imgs") {
    const files = item[1].filter((f) => have("img", f));
    return [files.map((f) => `<img src="img/${f}.png" alt="" width="${Math.floor(98 / files.length)}%">`).join(" "), "", `*${item[2 + pick]}*`];
  }
  if (k === "video") return have("video", item[1]) ? [`▶ [${L.video}: ${item[2 + pick].replace(/^[^:]+: /, "")}](video/${item[1]}.webm)`] : [];
  if (k === "table") {
    const head = item[1 + pick];
    const rows = item[3 + pick];
    return [`| ${head.join(" | ")} |`, `| ${head.map(() => "---").join(" | ")} |`, ...rows.map((r) => `| ${r.join(" | ")} |`)];
  }
  throw new Error(`unknown block ${k}`);
}

function htmlItem(item, lang) {
  const k = item[0];
  const L = LANGS[lang];
  const pick = lang === "vi" ? 0 : 1;
  if (k === "p") return `<p>${inline(item[1 + pick])}</p>`;
  if (k === "h3") return `<h4>${inline(item[1 + pick])}</h4>`;
  if (k === "ul") return `<ul>${item[1 + pick].map((t) => `<li>${inline(t)}</li>`).join("")}</ul>`;
  if (k === "ol") return `<ol>${item[1 + pick].map((t) => `<li>${inline(t)}</li>`).join("")}</ol>`;
  if (k === "note") return `<div class="note">💡 ${inline(item[1 + pick])}</div>`;
  if (k === "warn") return `<div class="warn">⚠️ ${inline(item[1 + pick])}</div>`;
  if (k === "img") return have("img", item[1]) ? `<figure><img src="img/${item[1]}.png" alt="${esc(plain(item[2 + pick]))}" loading="lazy"><figcaption>${inline(item[2 + pick])}</figcaption></figure>` : "";
  if (k === "imgs") {
    const files = item[1].filter((f) => have("img", f));
    return `<figure><div class="row">${files.map((f) => `<img src="img/${f}.png" alt="" loading="lazy">`).join("")}</div><figcaption>${inline(item[2 + pick])}</figcaption></figure>`;
  }
  if (k === "video") {
    return have("video", item[1])
      ? `<figure><video controls muted loop playsinline preload="metadata" src="video/${item[1]}.webm"></video><figcaption>${inline(item[2 + pick])} <a href="video/${item[1]}.webm">${L.video}</a></figcaption></figure>`
      : "";
  }
  if (k === "table") {
    const head = item[1 + pick];
    const rows = item[3 + pick];
    return `<table><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  }
  throw new Error(`unknown block ${k}`);
}

const CSS = `
:root { --navy: #1e2a4a; --green: #2f8a4c; --muted: #5b6785; --bg: #f4f7fc; --card: #fff; --line: #e1e7f2; --yellow: #fff1c2; --red: #fde4df; }
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--navy); font: 17px/1.6 "Be Vietnam Pro", "Segoe UI", system-ui, sans-serif; }
header.top { background: linear-gradient(135deg, #2f8a4c, #1e2a4a); color: #fff; padding: 36px 20px 30px; text-align: center; }
header.top h1 { margin: 0 0 6px; font-size: clamp(26px, 5vw, 40px); line-height: 1.15; }
header.top p { margin: 0 auto; max-width: none; opacity: .9; }
header.top a { color: #fff; display: inline-block; margin-top: 14px; border: 2px solid rgba(255,255,255,.7); padding: 4px 16px; border-radius: 999px; text-decoration: none; font-weight: 600; }
.wrap { max-width: 1080px; margin: 0 auto; padding: 0 18px 60px; display: grid; grid-template-columns: 250px 1fr; gap: 28px; }
nav.toc { position: sticky; top: 14px; align-self: start; background: var(--card); border-radius: 18px; padding: 16px 18px; margin-top: 24px; box-shadow: 0 2px 10px rgba(30,42,74,.08); font-size: 15px; max-height: calc(100vh - 28px); overflow: auto; }
nav.toc strong { display: block; margin-bottom: 6px; }
nav.toc a { display: block; color: var(--navy); text-decoration: none; padding: 3px 0; }
nav.toc a:hover { color: var(--green); }
nav.toc a.sub { padding-left: 16px; color: var(--muted); }
main section { background: var(--card); border-radius: 22px; padding: 6px 28px 22px; margin-top: 24px; box-shadow: 0 2px 10px rgba(30,42,74,.08); }
main section.sub { margin-left: 22px; background: #fbfdff; border: 1px solid var(--line); box-shadow: none; }
h2 { font-size: 28px; margin: 22px 0 8px; color: var(--green); }
h3 { font-size: 23px; margin: 20px 0 6px; }
h4 { font-size: 18px; margin: 18px 0 4px; color: var(--navy); }
p, li { max-width: 78ch; }
code { background: #eef2fa; padding: 1px 6px; border-radius: 6px; font-size: .92em; }
figure { margin: 16px 0; }
figure img, figure video { width: 100%; height: auto; display: block; border-radius: 14px; border: 1px solid var(--line); box-shadow: 0 4px 14px rgba(30,42,74,.12); }
figure .row { display: flex; gap: 12px; }
figure .row img { flex: 1 1 0; min-width: 0; }
figcaption { font-size: 15px; color: var(--muted); margin-top: 6px; text-align: center; }
figcaption a { color: var(--green); }
table { width: 100%; border-collapse: collapse; margin: 14px 0; font-size: 16px; }
th { text-align: left; background: #eaf5ee; }
th, td { padding: 8px 12px; border-bottom: 1px solid var(--line); vertical-align: top; }
.note, .warn { border-radius: 14px; padding: 10px 16px; margin: 14px 0; }
.note { background: var(--yellow); }
.warn { background: var(--red); }
footer { text-align: center; color: var(--muted); font-size: 14px; padding: 10px 20px 40px; }
@media (max-width: 860px) { .wrap { grid-template-columns: 1fr; } nav.toc { position: static; max-height: none; } main section.sub { margin-left: 0; } figure .row { flex-direction: column; } }
@media print { nav.toc, header.top a { display: none; } .wrap { display: block; } body { background: #fff; font-size: 14px; } main section { box-shadow: none; page-break-inside: auto; } figure { break-inside: avoid; } header.top { color: #1e2a4a; background: none; } }
`;

function renderHtml(lang) {
  const L = LANGS[lang];
  let n = 0;
  const toc = SECTIONS.map((s) => {
    if (s.level !== 3) n++;
    return `<a href="#${s.id}"${s.level === 3 ? ' class="sub"' : ""}>${s.level === 3 ? "" : `${n}. `}${esc(s[lang])}</a>`;
  }).join("");
  n = 0;
  const body = SECTIONS.map((s) => {
    if (s.level !== 3) n++;
    const heading = s.level === 3 ? `<h3>${esc(s[lang])}</h3>` : `<h2>${n}. ${esc(s[lang])}</h2>`;
    return `<section id="${s.id}"${s.level === 3 ? ' class="sub"' : ""}>${heading}${s.body.map((b) => htmlItem(b, lang)).join("\n")}</section>`;
  }).join("\n");
  return `<!doctype html>
<html lang="${L.htmlLang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(TITLE[lang])}</title>
<style>${CSS}</style>
</head>
<body>
<header class="top"><h1>${esc(TITLE[lang])}</h1><p>${esc(SUBTITLE[lang])}</p><a href="${L.other}">${L.otherName}</a></header>
<div class="wrap">
<nav class="toc"><strong>${L.contents}</strong>${toc}</nav>
<main>
${body}
</main>
</div>
<footer>${esc(L.foot)} ${L.version}: ${version}.</footer>
</body>
</html>
`;
}

for (const lang of ["vi", "en"]) {
  writeFileSync(`${DIR}${LANGS[lang].md}`, renderMd(lang));
  writeFileSync(`${DIR}${LANGS[lang].html}`, renderHtml(lang));
  console.log("wrote", LANGS[lang].md, "and", LANGS[lang].html);
}
writeFileSync(`${DIR}index.html`, `<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(TITLE.vi)}</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:linear-gradient(135deg,#2f8a4c,#1e2a4a);font:18px/1.5 "Be Vietnam Pro","Segoe UI",system-ui,sans-serif;color:#fff;text-align:center}
main{padding:24px}h1{margin:0 0 6px;font-size:clamp(26px,5vw,40px)}p{margin:0 0 26px;opacity:.9}
a{display:inline-block;margin:6px;padding:12px 30px;border-radius:999px;background:#fff;color:#1e2a4a;font-weight:700;text-decoration:none}a:hover{background:#fff1c2}</style></head>
<body><main><h1>${esc(TITLE.vi)}</h1><p>${esc(SUBTITLE.vi)}<br>${esc(SUBTITLE.en)}</p><a href="huong-dan.html">Tiếng Việt</a><a href="user-guide.html">English</a></main></body></html>
`);
writeFileSync(`${DIR}README.md`, `# User guide / Hướng dẫn sử dụng

| | Markdown | HTML (open in a browser, prints well) |
| --- | --- | --- |
| Tiếng Việt | [HUONG_DAN.md](HUONG_DAN.md) | [huong-dan.html](huong-dan.html) |
| English | [USER_GUIDE.md](USER_GUIDE.md) | [user-guide.html](user-guide.html) |

The pictures are in \`img/\` and the short videos in \`video/\`. To share the guide, send the whole folder (the HTML pages need \`img/\` and \`video/\` next to them).

Everything here is generated: \`node scripts/guide-shots.mjs\` retakes the pictures and videos from the running app (\`npm run dev\` first), \`node scripts/make-guide.mjs\` rebuilds the pages from \`scripts/guide-content.mjs\`.
`);
if (missing.length) console.log(`MISSING (run scripts/guide-shots.mjs): ${[...new Set(missing)].join(", ")}`);
