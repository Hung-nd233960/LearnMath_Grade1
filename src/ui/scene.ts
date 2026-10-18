// Little scenes for the home tiles, drawn in code (inline SVG + CSS), so the titles, badges and stars on top stay live
// and crisp, and nothing needs a picture file. Each tile gets sky, drifting clouds, hills, a fence or bushes, leaf
// sprigs that sway, sparkles that twinkle, and sometimes a sun or falling petals. The motion lives in scene.css and
// runs only under `fx-anim` (and never under prefers-reduced-motion), so with the effects off the scenes are still.
//
// The scene is 360×192 (the tile's size). The subject of the tile (the scale, the robot…) is a separate element in
// front of it (see tileArt.ts), and the wooden title sign is drawn by the home screen.
import type { GameId } from "../core/types.ts";
import { h } from "./dom.ts";

/** What a tile's scene is made of. Positions are in the 360×192 box. */
interface Look {
  /** Clouds: [x, y, scale]. */
  clouds: [number, number, number][];
  sun?: [number, number];
  /** A little fence behind the front hill: [from x, to x]. */
  fence?: [number, number];
  /** Round bushes: [x, scale]. */
  bushes: [number, number][];
  /** Leaf sprigs: [x, y, rotation in degrees]. */
  sprigs: [number, number, number][];
  /** Small daisies on the grass (x). */
  daisies: number[];
  /** Twinkling sparkles: [x, y, size]. */
  sparkles: [number, number, number][];
  /** Floating question marks: [x, y]. */
  marks?: [number, number][];
  /** Falling petals: x positions. */
  petals?: number[];
}

const LOOKS: Record<GameId, Look> = {
  scale: {
    clouds: [[40, 36, 1], [250, 24, 0.8]], fence: [20, 340], bushes: [[28, 1], [336, 1.1]],
    sprigs: [[14, 120, -20], [346, 118, 22], [180, 54, 0]], daisies: [60, 308, 330], sparkles: [[88, 40, 9], [292, 56, 7], [210, 30, 6]],
  },
  robot: {
    clouds: [[70, 30, 0.9], [270, 44, 0.7]], bushes: [[22, 1.2], [340, 1]],
    sprigs: [[16, 118, -18], [344, 120, 20]], daisies: [90, 300], sparkles: [[60, 62, 8], [300, 38, 10], [120, 28, 6], [330, 76, 6]],
  },
  basket: {
    clouds: [[30, 40, 0.8]], sun: [318, 36], fence: [14, 120], bushes: [[330, 1.2], [20, 1]],
    sprigs: [[12, 124, -22], [348, 124, 22], [150, 46, -8]], daisies: [50, 290, 316], sparkles: [[104, 34, 8], [250, 28, 7]],
  },
  equations: {
    clouds: [[250, 28, 0.9]], bushes: [[336, 1], [350, 0.8]],
    sprigs: [[344, 124, 22], [180, 40, 0], [14, 130, -20]], daisies: [300, 330], sparkles: [[132, 30, 9], [226, 52, 7], [320, 74, 8]],
    marks: [[40, 52], [318, 56], [214, 26]],
  },
  split: {
    clouds: [[60, 34, 0.9], [264, 50, 0.7]], fence: [8, 110], bushes: [[330, 1.2], [26, 1]],
    sprigs: [[14, 118, -20], [346, 122, 20], [196, 40, 6]], daisies: [60, 120, 310], sparkles: [[220, 32, 7], [310, 70, 6]],
    petals: [44, 118, 196, 262, 318],
  },
  pattern: {
    clouds: [[40, 30, 0.8], [268, 34, 0.9]], bushes: [[340, 1.1], [22, 0.9]],
    sprigs: [[344, 122, 20], [16, 126, -20], [186, 38, 0]], daisies: [90, 310], sparkles: [[330, 56, 9], [120, 28, 7], [250, 24, 6]],
  },
};

/** A cloud placed at (x, y); in motion it drifts from past the left edge to past the right edge (--from / --to are in its own scaled units). */
const cloud = (x: number, y: number, s: number, i: number) => `<g transform="translate(${x} ${y}) scale(${s})"><g class="drift" style="--from:${Math.round((-110 - x) / s)};--to:${Math.round((470 - x) / s)};--i:${i}">
  <ellipse cx="0" cy="8" rx="34" ry="11" fill="#fff" opacity=".8"/><ellipse cx="-14" cy="0" rx="18" ry="12" fill="#fff" opacity=".8"/><ellipse cx="10" cy="-4" rx="22" ry="14" fill="#fff" opacity=".8"/></g></g>`;

const sun = (x: number, y: number) => `<g transform="translate(${x} ${y})"><g class="rays" opacity=".9"><circle r="30" fill="#fff0a8" opacity=".5"/><circle r="22" fill="#ffe066"/></g><circle r="14" fill="#fff6c2"/></g>`;

const bush = (x: number, s: number) => `<g transform="translate(${x} 156) scale(${s})"><ellipse cx="0" cy="0" rx="24" ry="16" fill="#8cc974"/><ellipse cx="-16" cy="4" rx="16" ry="12" fill="#7bbd67"/><ellipse cx="17" cy="4" rx="17" ry="12" fill="#7bbd67"/></g>`;

/** A sprig of three leaves on a stem; the leaves sway around the stem's foot. */
const sprig = (x: number, y: number, rot: number, i: number) => `<g transform="translate(${x} ${y}) rotate(${rot})"><g class="sway" style="--i:${i}">
  <path d="M0 0 Q-2 -16 0 -30" stroke="#4f9f55" stroke-width="3" fill="none" stroke-linecap="round"/>
  <ellipse cx="-9" cy="-14" rx="10" ry="5" transform="rotate(-32 -9 -14)" fill="#6fcf73"/><ellipse cx="9" cy="-20" rx="10" ry="5" transform="rotate(30 9 -20)" fill="#5cbf6a"/><ellipse cx="0" cy="-34" rx="5.5" ry="9" fill="#7ad67e"/></g></g>`;

const daisy = (x: number) => `<g transform="translate(${x} 176)"><g fill="#fff"><circle cx="0" cy="-5" r="3.4"/><circle cx="5" cy="-1.5" r="3.4"/><circle cx="3" cy="4" r="3.4"/><circle cx="-3" cy="4" r="3.4"/><circle cx="-5" cy="-1.5" r="3.4"/></g><circle r="3" fill="#ffc53d"/></g>`;

const sparkle = (x: number, y: number, s: number, i: number) => `<g transform="translate(${x} ${y})"><path class="twinkle" style="--i:${i}" d="M0 ${-s} Q1 -1 ${s} 0 Q1 1 0 ${s} Q-1 1 ${-s} 0 Q-1 -1 0 ${-s} Z" fill="#fff" opacity=".95"/></g>`;

const fence = (a: number, b: number) => {
  const posts: string[] = [];
  for (let x = a; x <= b; x += 22) posts.push(`<rect x="${x}" y="118" width="9" height="30" rx="3" fill="#e0b078"/><path d="M${x} 118 l4.5 -5 l4.5 5 Z" fill="#e0b078"/>`);
  return `<g>${posts.join("")}<rect x="${a - 4}" y="126" width="${b - a + 16}" height="5" rx="2.5" fill="#cf9a62"/><rect x="${a - 4}" y="137" width="${b - a + 16}" height="5" rx="2.5" fill="#cf9a62"/></g>`;
};

const mark = (x: number, y: number, i: number) => `<text class="qm" style="--i:${i}" x="${x}" y="${y}" font-family="Baloo 2" font-weight="800" font-size="30" fill="#8c6fe0" opacity=".75">?</text>`;

const petal = (x: number, i: number) => `<g transform="translate(${x} 0)"><ellipse class="petal" style="--i:${i}" cx="0" cy="-10" rx="5" ry="3" fill="#f7a8c0"/></g>`;

/** The scene of one tile, ready to be put behind the tile's subject. `index` staggers the motion between tiles. */
export function tileScene(id: GameId, index: number): HTMLElement {
  const look = LOOKS[id];
  const n = index * 3;
  const svg = `<svg viewBox="0 0 360 192" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    ${look.sun ? sun(look.sun[0], look.sun[1]) : ""}
    ${look.clouds.map(([x, y, s], k) => cloud(x, y, s, n + k)).join("")}
    ${look.sparkles.map(([x, y, s], k) => sparkle(x, y, s, n + k)).join("")}
    ${look.marks ? look.marks.map(([x, y], k) => mark(x, y, n + k)).join("") : ""}
    <path d="M0 132 Q70 100 150 124 T300 112 T360 126 V192 H0 Z" fill="#c4e8ad" opacity=".95"/>
    ${look.fence ? fence(look.fence[0], look.fence[1]) : ""}
    <path d="M0 154 Q90 128 190 150 T360 142 V192 H0 Z" fill="#a4d98a"/>
    ${look.bushes.map(([x, s]) => bush(x, s)).join("")}
    ${look.daisies.map(daisy).join("")}
    ${look.sprigs.map(([x, y, r], k) => sprig(x, y, r, n + k)).join("")}
    ${look.petals ? look.petals.map((x, k) => petal(x, n + k)).join("") : ""}
  </svg>`;
  const el = h("div", { class: `tile-scene scene-${id}` });
  el.innerHTML = svg;
  return el;
}
