// A Speech is what Mèo says: the text shown on screen AND the voice clips to play.
// Build it with say(...) so both always match.
import { CLIPS, type ClipId } from "../audio/manifest.ts";
import { capitalize, numberWords } from "./numbers.ts";

export interface Speech {
  text: string;
  clips: ClipId[];
}

/** Clips that read a number 0–100. */
export function numberClips(n: number): ClipId[] {
  if (n <= 20) return [`n${n}` as ClipId];
  if (n === 100) return ["n100"];
  const tens = Math.floor(n / 10), unit = n % 10;
  const head: ClipId = tens === 2 ? "n20" : (`t${tens}` as ClipId);
  if (unit === 0) return [head];
  const tail: ClipId = unit === 1 ? "u_mot" : unit === 4 ? "u_tu" : unit === 5 ? "u_lam" : (`n${unit}` as ClipId);
  return [head, tail];
}

export type SpeechPart = Speech | ClipId | number | { raw: string };

/**
 * Join parts into one Speech. Numbers become words + number clips; ClipIds use their
 * recorded text; { raw } is shown but not spoken (e.g. a symbol). The first letter is capitalised.
 */
export function say(...parts: SpeechPart[]): Speech {
  const text: string[] = [];
  const clips: ClipId[] = [];
  for (const p of parts) {
    if (typeof p === "number") { text.push(numberWords(p)); clips.push(...numberClips(p)); }
    else if (typeof p === "string") { text.push(CLIPS[p]); clips.push(p); }
    else if ("raw" in p) text.push(p.raw);
    else { text.push(p.text); clips.push(...p.clips); }
  }
  const joined = text.join(" ").replace(/\s+([!?.,])/g, "$1");
  return { text: capitalize(joined), clips };
}

const PRAISE: ClipId[] = ["praise_1", "praise_2", "praise_3", "praise_4", "praise_5"];
/** A praise line; pass a counter so it varies instead of repeating. */
export function praise(i: number): Speech {
  return say(PRAISE[Math.abs(i) % PRAISE.length]!);
}
