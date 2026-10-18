// Mèo Smarty, drawn in SVG: an orange tabby detective in a brown plaid deerstalker hat and plaid cape, with a
// magnifying glass. The mood picks the face. (Redrawn in round 2 to match the teachers' new design; the moods,
// sizes and the `.eyes` group the blink animation targets are unchanged.)
import { h } from "./dom.ts";

export type Mood = "normal" | "happy" | "think" | "sleep" | "detective";

const N = "#1E2A4A";
const ORANGE = "#F5A83A";
const ORANGE_DARK = "#D98420";

let plaidCount = 0;

function eyesFor(mood: Mood): string {
  if (mood === "happy") {
    return `<path d="M58 112 q13 -17 26 0" stroke="${N}" stroke-width="6" fill="none" stroke-linecap="round"/>
            <path d="M116 112 q13 -17 26 0" stroke="${N}" stroke-width="6" fill="none" stroke-linecap="round"/>`;
  }
  if (mood === "sleep") {
    return `<path d="M58 108 q13 11 26 0" stroke="${N}" stroke-width="5" fill="none" stroke-linecap="round"/>
            <path d="M116 108 q13 11 26 0" stroke="${N}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
  }
  // open eyes sit in <g class="eyes"> so the "fx-anim" blink animation can target them
  const open = `<g class="eyes"><ellipse cx="72" cy="108" rx="13" ry="16" fill="${N}"/><ellipse cx="72" cy="110" rx="8" ry="10" fill="#7a4a24" opacity=".55"/><circle cx="77" cy="101" r="5.5" fill="#fff"/><circle cx="67" cy="115" r="2.4" fill="#fff"/>
            <ellipse cx="128" cy="108" rx="13" ry="16" fill="${N}"/><ellipse cx="128" cy="110" rx="8" ry="10" fill="#7a4a24" opacity=".55"/><circle cx="133" cy="101" r="5.5" fill="#fff"/><circle cx="123" cy="115" r="2.4" fill="#fff"/></g>`;
  return mood === "think" ? open + `<path d="M56 86 l26 -7M118 79 l26 7" stroke="${N}" stroke-width="4" stroke-linecap="round"/>` : open;
}

function mouthFor(mood: Mood): string {
  if (mood === "happy") return `<path d="M84 140 q16 26 32 0 z" fill="#C2414F" stroke="${N}" stroke-width="3.5" stroke-linejoin="round"/><path d="M92 152 q8 7 16 0" fill="#F08A96"/>`;
  if (mood === "think") return `<path d="M90 144 q10 -5 20 0" stroke="${N}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
  if (mood === "sleep") return `<path d="M92 142 q8 5 16 0" stroke="${N}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
  // a cheerful open smile
  return `<path d="M86 138 q14 22 28 0 z" fill="#C2414F" stroke="${N}" stroke-width="3.5" stroke-linejoin="round"/><path d="M93 150 q7 6 14 0" fill="#F08A96"/>`;
}

export function mascotSVG(mood: Mood = "normal"): string {
  const id = `plaid${plaidCount++}`;
  // the magnifying glass is held in front of the right eye (which it enlarges)
  const lens = mood === "detective" || mood === "normal"
    ? `<g>
         <path d="M156 128 L184 170" stroke="#8A5A30" stroke-width="12" stroke-linecap="round"/>
         <path d="M156 128 L184 170" stroke="#B07A46" stroke-width="4" stroke-linecap="round" opacity=".8"/>
         <circle cx="186" cy="172" r="12" fill="${ORANGE}" stroke="${ORANGE_DARK}" stroke-width="3"/>
         <clipPath id="${id}l"><circle cx="134" cy="106" r="29"/></clipPath>
         <circle cx="134" cy="106" r="29" fill="#E3F2FF" fill-opacity=".8"/>
         <g clip-path="url(#${id}l)"><ellipse cx="134" cy="108" rx="17" ry="21" fill="${N}"/><circle cx="141" cy="99" r="7" fill="#fff"/><circle cx="127" cy="117" r="3" fill="#fff"/></g>
         <circle cx="134" cy="106" r="29" fill="none" stroke="${N}" stroke-width="7"/>
         <path d="M116 92 q8 -12 22 -12" stroke="#fff" stroke-width="4.5" fill="none" stroke-linecap="round" opacity=".9"/>
       </g>`
    : "";
  const zzz = mood === "sleep"
    ? `<text x="150" y="60" font-family="Baloo 2" font-weight="800" font-size="30" fill="${N}">z</text><text x="168" y="38" font-family="Baloo 2" font-weight="800" font-size="22" fill="${N}">z</text>`
    : "";
  return `<svg viewBox="0 0 210 220" xmlns="http://www.w3.org/2000/svg" overflow="visible">
    <defs>
      <pattern id="${id}" width="16" height="16" patternUnits="userSpaceOnUse">
        <rect width="16" height="16" fill="#8A5A33"/>
        <rect y="3" width="16" height="4" fill="#5E3A1E" opacity=".6"/><rect x="3" width="4" height="16" fill="#5E3A1E" opacity=".6"/>
        <rect y="10" width="16" height="1.6" fill="#E3B27A" opacity=".85"/><rect x="10" width="1.6" height="16" fill="#E3B27A" opacity=".85"/>
      </pattern>
    </defs>
    <path d="M14 218 Q16 168 62 160 L138 160 Q184 168 186 218 Z" fill="url(#${id})" stroke="#4A2E16" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M62 160 Q100 192 138 160" fill="#6B4425" stroke="#4A2E16" stroke-width="3.5" stroke-linejoin="round"/>
    <circle cx="100" cy="190" r="8" fill="#F2B544" stroke="#B9801C" stroke-width="3"/><path d="M96 187 q4 -3 8 0" stroke="#FFF3C4" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <ellipse cx="100" cy="120" rx="76" ry="68" fill="${ORANGE}"/>
    <path d="M100 60 v22 M82 62 l5 20 M118 62 l-5 20" stroke="${ORANGE_DARK}" stroke-width="5" stroke-linecap="round" opacity=".85"/>
    <path d="M26 112 q13 2 20 0 M24 126 q13 2 22 0 M174 112 q-13 2 -20 0 M176 126 q-13 2 -22 0" stroke="${ORANGE_DARK}" stroke-width="4.5" fill="none" stroke-linecap="round" opacity=".8"/>
    <ellipse cx="100" cy="146" rx="42" ry="30" fill="#FFEACB"/>
    <ellipse cx="48" cy="136" rx="15" ry="10" fill="#FF8C8C" opacity=".6"/>
    <ellipse cx="152" cy="136" rx="15" ry="10" fill="#FF8C8C" opacity=".6"/>
    ${eyesFor(mood)}
    <path d="M91 126 h18 l-9 10 z" fill="#F0606E" stroke="#F0606E" stroke-width="3" stroke-linejoin="round"/>
    ${mouthFor(mood)}
    <g stroke="${N}" stroke-width="2.6" stroke-linecap="round" opacity=".7">
      <path d="M40 144 l-28 -5M40 152 l-26 7M160 144 l28 -5M160 152 l26 7"/></g>
    <path d="M38 94 L18 30 L80 62 Z" fill="${ORANGE}" stroke="${ORANGE_DARK}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M42 82 L30 46 L66 64 Z" fill="#FF9DA7"/>
    <path d="M162 94 L182 30 L120 62 Z" fill="${ORANGE}" stroke="${ORANGE_DARK}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M158 82 L170 46 L134 64 Z" fill="#FF9DA7"/>
    <path d="M40 76 Q100 -2 160 76 Z" fill="url(#${id})" stroke="#4A2E16" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M60 50 L72 76M88 30 L92 76M112 30 L108 76M140 50 L128 76" stroke="#4A2E16" stroke-width="3" opacity=".7"/>
    <path d="M26 80 Q100 92 174 80 Q100 62 26 80 Z" fill="#6B4425" stroke="#4A2E16" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M44 74 Q100 58 156 74" stroke="#E8604C" stroke-width="6" fill="none" stroke-linecap="round" opacity=".9"/>
    <circle cx="100" cy="26" r="9" fill="#E8604C" stroke="#B8402F" stroke-width="3"/>
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
