// Inline SVG icons (static markup; use with html() or innerHTML). They inherit the text colour.
const svg = (strokeWidth: number, body: string, extra = "") =>
  `<svg viewBox="0 0 24 24" ${extra} fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

const SPEAKER_BODY = '<path d="M3 9.5v5h4l5 4v-13l-5 4H3z" fill="currentColor"/>';

export const ICON = {
  back: svg(3, '<path d="M15 5l-7 7 7 7"/>'),
  sound: svg(2.4, `${SPEAKER_BODY}<path d="M16 9a4.5 4.5 0 010 6M18.6 6.5a8 8 0 010 11"/>`),
  mute: svg(2.4, `${SPEAKER_BODY}<path d="M16.5 9.5l5 5M21.5 9.5l-5 5"/>`),
  replay: svg(2.6, `${SPEAKER_BODY}<path d="M16 9a4.5 4.5 0 010 6"/>`),
  check: svg(3.4, '<path d="M4 12.5l5 5L20 6.5"/>', 'width="30" height="30"'),
} as const;

/** Arrow icons for the robot's program, keyed by direction (matches Dir in games/robot/logic.ts). */
export const ARROW = {
  U: svg(3, '<path d="M12 19V5M5.5 11.5L12 5l6.5 6.5"/>'),
  D: svg(3, '<path d="M12 5v14M5.5 12.5L12 19l6.5-6.5"/>'),
  L: svg(3, '<path d="M19 12H5M11.5 5.5L5 12l6.5 6.5"/>'),
  R: svg(3, '<path d="M5 12h14M12.5 5.5L19 12l-6.5 6.5"/>'),
} as const;
