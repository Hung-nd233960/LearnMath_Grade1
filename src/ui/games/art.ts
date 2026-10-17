// Drawings shared by several game screens (SVG fragments; gradients such as url(#wood) come from svgDefs.ts).
/** A wooden table top across the bottom of a 460×608 panel. */
export const TABLE_ART = `<rect x="0" y="566" width="460" height="42" fill="url(#wood)"/><rect x="0" y="566" width="460" height="7" fill="#e3b583"/>
  <ellipse cx="230" cy="568" rx="190" ry="9" fill="rgba(30,42,74,.22)"/>`;

/** The teal woven basket, drawn in a 480×190 box. */
export const BASKET_ART = `<path d="M10 30 H470 L432 168 Q240 196 48 168 Z" fill="#3FA7B5"/>
  <g stroke="#2E8996" stroke-width="6"><path d="M22 70 H458M32 110 H448M42 148 H438"/></g>
  <g stroke="#5FC0CC" stroke-width="5"><path d="M80 32 L92 172M150 32 L156 178M220 32 L222 180M290 32 L286 180M360 32 L352 176M420 32 L404 172"/></g>
  <rect x="0" y="12" width="480" height="34" rx="17" fill="#23707C"/><rect x="10" y="18" width="460" height="10" rx="5" fill="#7FD3DC" opacity=".6"/>`;
