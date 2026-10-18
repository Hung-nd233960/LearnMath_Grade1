// Drawings shared by several game screens (SVG fragments; gradients such as url(#wood) come from svgDefs.ts).
/** A wooden table top across the bottom of a 460×608 panel. */
export const TABLE_ART = `<rect x="0" y="566" width="460" height="42" fill="url(#wood)"/><rect x="0" y="566" width="460" height="7" fill="#e3b583"/>
  <ellipse cx="230" cy="568" rx="190" ry="9" fill="rgba(30,42,74,.22)"/>`;

/**
 * A garden in a 460×608 panel: sky, a pale sun and clouds, hills, a tree and bushes at each edge, a lawn.
 * Everything is faded so the animals stand out; there are no small separate flowers or fruit.
 */
export const GARDEN_ART = `<defs>
  <linearGradient id="gardenSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cdeeff"/><stop offset="1" stop-color="#eef9ff"/></linearGradient>
  <linearGradient id="gardenLawn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c8ebb0"/><stop offset="1" stop-color="#a6d98a"/></linearGradient></defs>
  <rect width="460" height="608" fill="url(#gardenSky)"/>
  <circle cx="378" cy="96" r="38" fill="#fff3b8" opacity=".8"/><circle cx="378" cy="96" r="52" fill="#fff3b8" opacity=".25"/>
  <g fill="#fff" opacity=".85"><ellipse cx="96" cy="108" rx="46" ry="15"/><ellipse cx="124" cy="96" rx="30" ry="14"/><ellipse cx="270" cy="170" rx="40" ry="13"/><ellipse cx="294" cy="160" rx="26" ry="12"/></g>
  <path d="M0 292 Q90 236 190 276 T380 262 T460 280 V330 H0 Z" fill="#cfe7bd" opacity=".9"/>
  <path d="M0 326 Q120 280 250 318 T460 304 V360 H0 Z" fill="#bfe3a8"/>
  <g opacity=".6">
    <rect x="22" y="196" width="16" height="100" rx="6" fill="#c9a77c"/><circle cx="30" cy="190" r="46" fill="#b5dfa0"/><circle cx="6" cy="214" r="30" fill="#a9d794"/><circle cx="56" cy="212" r="30" fill="#a9d794"/>
    <rect x="426" y="206" width="14" height="92" rx="6" fill="#c9a77c"/><circle cx="434" cy="200" r="42" fill="#b5dfa0"/><circle cx="460" cy="220" r="28" fill="#a9d794"/><circle cx="408" cy="222" r="28" fill="#a9d794"/>
    <ellipse cx="108" cy="318" rx="44" ry="26" fill="#a9d794"/><ellipse cx="352" cy="314" rx="40" ry="24" fill="#a9d794"/>
  </g>
  <rect y="340" width="460" height="268" fill="url(#gardenLawn)"/>
  <g stroke="#8fc873" stroke-width="3" stroke-linecap="round" opacity=".35"><path d="M60 380 l-4 -9 M66 380 l4 -9 M380 400 l-4 -9 M386 400 l4 -9 M210 372 l-4 -8 M216 372 l4 -8 M120 560 l-4 -9 M126 560 l4 -9 M340 566 l-4 -9 M346 566 l4 -9 M240 596 l-4 -8 M246 596 l4 -8"/></g>`;

/** The teal woven basket, drawn in a 480×190 box. */
export const BASKET_ART = `<path d="M10 30 H470 L432 168 Q240 196 48 168 Z" fill="#3FA7B5"/>
  <g stroke="#2E8996" stroke-width="6"><path d="M22 70 H458M32 110 H448M42 148 H438"/></g>
  <g stroke="#5FC0CC" stroke-width="5"><path d="M80 32 L92 172M150 32 L156 178M220 32 L222 180M290 32 L286 180M360 32 L352 176M420 32 L404 172"/></g>
  <rect x="0" y="12" width="480" height="34" rx="17" fill="#23707C"/><rect x="10" y="18" width="460" height="10" rx="5" fill="#7FD3DC" opacity=".6"/>`;
