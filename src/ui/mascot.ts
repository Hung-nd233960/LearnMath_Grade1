// Mèo Smarty, drawn in SVG (ported from mockup/v2). The mood picks the face.
import { h } from "./dom.ts";

export type Mood = "normal" | "happy" | "think" | "sleep" | "detective";

const N = "#1E2A4A";

function eyesFor(mood: Mood): string {
  if (mood === "happy") {
    return `<path d="M60 112 q12 -15 24 0" stroke="${N}" stroke-width="6" fill="none" stroke-linecap="round"/>
            <path d="M116 112 q12 -15 24 0" stroke="${N}" stroke-width="6" fill="none" stroke-linecap="round"/>`;
  }
  if (mood === "sleep") {
    return `<path d="M60 108 q12 10 24 0" stroke="${N}" stroke-width="5" fill="none" stroke-linecap="round"/>
            <path d="M116 108 q12 10 24 0" stroke="${N}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
  }
  // open eyes sit in <g class="eyes"> so the "fx-anim" blink animation can target them
  const open = `<g class="eyes"><ellipse cx="72" cy="106" rx="11" ry="14" fill="${N}"/><circle cx="76" cy="100" r="4.5" fill="#fff"/><circle cx="68" cy="112" r="2" fill="#fff"/>
            <ellipse cx="128" cy="106" rx="11" ry="14" fill="${N}"/><circle cx="132" cy="100" r="4.5" fill="#fff"/><circle cx="124" cy="112" r="2" fill="#fff"/></g>`;
  return mood === "think" ? open + `<path d="M58 84 l24 -6M118 78 l24 6" stroke="${N}" stroke-width="4" stroke-linecap="round"/>` : open;
}

function mouthFor(mood: Mood): string {
  if (mood === "happy") return `<path d="M86 138 q14 22 28 0 z" fill="#C2414F" stroke="${N}" stroke-width="3.5" stroke-linejoin="round"/>`;
  if (mood === "think") return `<path d="M90 142 q10 -5 20 0" stroke="${N}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
  return `<path d="M86 138 q7 8 14 0 q7 8 14 0" stroke="${N}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
}

export function mascotSVG(mood: Mood = "normal"): string {
  const lens = mood === "detective" || mood === "normal"
    ? `<g transform="rotate(-20 168 168)"><rect x="160" y="178" width="14" height="34" rx="7" fill="#8A5A30"/>
       <circle cx="167" cy="160" r="24" fill="#CFE8FF" fill-opacity=".85" stroke="${N}" stroke-width="7"/>
       <path d="M155 152 q6 -8 14 -8" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round"/></g>`
    : "";
  const zzz = mood === "sleep"
    ? `<text x="150" y="60" font-family="Baloo 2" font-weight="800" font-size="30" fill="${N}">z</text><text x="168" y="38" font-family="Baloo 2" font-weight="800" font-size="22" fill="${N}">z</text>`
    : "";
  return `<svg viewBox="0 0 210 220" xmlns="http://www.w3.org/2000/svg" overflow="visible">
    <ellipse cx="100" cy="122" rx="76" ry="68" fill="#F7B93A"/>
    <path d="M84 60 q16 14 32 0" stroke="#E39228" stroke-width="6" fill="none" stroke-linecap="round"/>
    <path d="M28 120 q-4 -8 6 -14M172 120 q4 -8 -6 -14" stroke="#E39228" stroke-width="5" fill="none" stroke-linecap="round"/>
    <ellipse cx="100" cy="148" rx="40" ry="28" fill="#FFE7B5"/>
    <ellipse cx="50" cy="136" rx="14" ry="9" fill="#FF8C8C" opacity=".55"/>
    <ellipse cx="150" cy="136" rx="14" ry="9" fill="#FF8C8C" opacity=".55"/>
    ${eyesFor(mood)}
    <path d="M92 126 h16 l-8 9 z" fill="#F0606E" stroke="#F0606E" stroke-width="3" stroke-linejoin="round"/>
    ${mouthFor(mood)}
    <g stroke="${N}" stroke-width="2.6" stroke-linecap="round" opacity=".7">
      <path d="M40 142 l-26 -4M40 150 l-24 6M160 142 l26 -4M160 150 l24 6"/></g>
    <path d="M42 76 Q100 2 158 76 Z" fill="#7B5434"/>
    <path d="M60 52 L72 76M86 34 L92 76M114 34 L108 76M140 52 L128 76" stroke="#654328" stroke-width="4"/>
    <path d="M44 70 Q100 46 156 70 L158 82 Q100 58 42 82 Z" fill="#E8604C"/>
    <ellipse cx="100" cy="80" rx="74" ry="11" fill="#5E3E22"/>
    <circle cx="100" cy="30" r="8" fill="#E8604C"/>
    <path d="M40 92 L22 34 L78 62 Z" fill="#F7B93A" stroke="#E39228" stroke-width="3" stroke-linejoin="round"/>
    <path d="M42 80 L32 48 L64 64 Z" fill="#FF9DA7"/>
    <path d="M160 92 L178 34 L122 62 Z" fill="#F7B93A" stroke="#E39228" stroke-width="3" stroke-linejoin="round"/>
    <path d="M158 80 L168 48 L136 64 Z" fill="#FF9DA7"/>
    ${lens}${zzz}
  </svg>`;
}

/** A <div class="meo"> holding Mèo. Size it with CSS (width/height on .meo). */
export function mascot(mood: Mood = "normal"): HTMLElement {
  const el = h("div", { class: "meo", "data-mood": mood });
  el.innerHTML = mascotSVG(mood);
  return el;
}

/** Change an existing Mèo's mood (e.g. thinking → happy). */
export function setMood(el: HTMLElement, mood: Mood): void {
  el.dataset.mood = mood;
  el.innerHTML = mascotSVG(mood);
}
