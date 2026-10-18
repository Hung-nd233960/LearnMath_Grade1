// Background music, composed by rules instead of recorded: one bright, bouncy track for the lobby and one
// for each game (7 in all). No audio files, no licences, a few kilobytes.
//
// This file is PURE (no Web Audio): it decides which notes play in which bar. src/audio/bgm.ts makes the
// sound. Everything is deterministic, so a track is the same tune every time and can be tested.
//
// Why it sounds pleasant by construction: every track uses a MAJOR PENTATONIC scale (five notes per octave,
// no half-steps, so nothing can clash), and the chords are built from the same five notes, so any melody
// note fits over any chord. The loop is 16 bars: four-bar phrases in an A A B A shape, so it feels like a
// tune and not like noise. What makes it lively: a bouncy chord strum, a walking bass, a light shaker or
// woodblock, a melody that mostly moves in eighth notes, and little sparkles on top.
import type { GameId } from "../core/types.ts";

export type TrackId = "lobby" | GameId;
export type Timbre = "box" | "bell" | "pluck";
export type Voice = "lead" | "strum" | "pad" | "bass" | "sparkle" | "perc";
export type Comping = "strum" | "swell";
export type Percussion = "shaker" | "block" | "none";

export interface Track {
  id: TrackId;
  /** Beats per minute and beats in a bar. */
  bpm: number;
  beats: number;
  /** MIDI note of the scale's first degree, in the chord register (the lead plays an octave above). */
  root: number;
  /** Semitones above the root, one octave of the scale. */
  scale: readonly number[];
  /** One chord root per bar of the 4-bar phrase, as a scale degree. */
  progression: readonly [number, number, number, number];
  /** Onsets (in beats) a bar of melody can use; one pattern is picked per bar. */
  rhythms: readonly (readonly number[])[];
  /** Chance (0..1) that an onset is left silent, for breathing space. */
  rest: number;
  /** Longest note, in beats. */
  maxLen: number;
  lead: Timbre;
  /** How the chord is played: a short bouncy strum on these beats, or one soft held swell. */
  comp: Comping;
  strumAt: readonly number[];
  /** Bass note beats; the second and later ones walk to another chord tone. */
  bass: readonly number[];
  perc: Percussion;
  /** Beats of the little high notes on top (empty for none). */
  sparkleAt: readonly number[];
  seed: number;
}

export interface Note {
  /** Beats from the start of the bar. */
  at: number;
  /** Length in beats. */
  dur: number;
  /** Not used by "perc". */
  midi: number;
  voice: Voice;
  /** 0..1 */
  vel: number;
}

export const LOOP_BARS = 16;

const MAJOR_PENT = [0, 2, 4, 7, 9] as const;

export const TRACKS: Record<TrackId, Track> = {
  // the lobby: a sunny music box with a bouncing strum
  lobby: { id: "lobby", bpm: 100, beats: 4, root: 60, scale: MAJOR_PENT, progression: [0, 3, 4, 2], rhythms: [[0, 0.5, 1, 2, 2.5, 3], [0, 1, 1.5, 2, 3, 3.5], [0, 0.5, 1.5, 2, 2.5, 3.5], [0, 1, 2, 2.5, 3, 3.5]], rest: 0.1, maxLen: 1.5, lead: "box", comp: "strum", strumAt: [0.5, 1.5, 2.5, 3.5], bass: [0, 2], perc: "shaker", sparkleAt: [1.5, 3.5], seed: 11 },
  // Thăng bằng: relaxed and balanced, ringing bells over a soft swell
  scale: { id: "scale", bpm: 92, beats: 4, root: 62, scale: MAJOR_PENT, progression: [0, 4, 3, 4], rhythms: [[0, 1, 2, 3], [0, 1.5, 2, 3], [0, 1, 2, 2.5, 3.5], [0, 0.5, 1, 2, 3]], rest: 0.12, maxLen: 2, lead: "bell", comp: "swell", strumAt: [], bass: [0, 2], perc: "block", sparkleAt: [2.5], seed: 23 },
  // Rô-bốt: quick plucked notes and a steady blip, like a toy
  robot: { id: "robot", bpm: 116, beats: 4, root: 64, scale: MAJOR_PENT, progression: [0, 2, 3, 1], rhythms: [[0, 0.5, 1, 1.5, 2, 3], [0, 1, 1.5, 2, 2.5, 3], [0, 0.5, 2, 2.5, 3, 3.5], [0, 0.5, 1, 2, 2.5, 3.5]], rest: 0.12, maxLen: 0.75, lead: "pluck", comp: "strum", strumAt: [0.5, 1.5, 2.5, 3.5], bass: [0, 1, 2, 3], perc: "block", sparkleAt: [3.5], seed: 37 },
  // Chia quả: bouncy and a little off the beat, like a ukulele
  basket: { id: "basket", bpm: 108, beats: 4, root: 65, scale: MAJOR_PENT, progression: [0, 2, 3, 4], rhythms: [[0, 1.5, 2, 3.5], [0, 0.5, 1.5, 2.5, 3], [0, 1, 1.5, 3, 3.5], [0.5, 1.5, 2, 3, 3.5]], rest: 0.1, maxLen: 1, lead: "pluck", comp: "strum", strumAt: [0.5, 1, 2.5, 3], bass: [0, 2], perc: "shaker", sparkleAt: [1.5, 3.5], seed: 41 },
  // Giải mã hình: a curious, skipping tune, sparkly and light
  equations: { id: "equations", bpm: 96, beats: 4, root: 55, scale: MAJOR_PENT, progression: [0, 3, 1, 4], rhythms: [[0, 1, 1.5, 2.5, 3], [0, 0.5, 1.5, 2, 3.5], [0.5, 1, 2, 2.5, 3.5], [0, 1.5, 2, 3, 3.5]], rest: 0.15, maxLen: 1.25, lead: "box", comp: "strum", strumAt: [1, 2, 3], bass: [0, 2], perc: "block", sparkleAt: [0.5, 2.5], seed: 53 },
  // Mấy và mấy: a cheerful waltz in three
  split: { id: "split", bpm: 112, beats: 3, root: 57, scale: MAJOR_PENT, progression: [0, 3, 2, 4], rhythms: [[0, 1, 1.5, 2], [0, 0.5, 1, 2], [0, 1, 2, 2.5], [0, 1.5, 2, 2.5]], rest: 0.1, maxLen: 1.5, lead: "box", comp: "strum", strumAt: [1, 2], bass: [0], perc: "shaker", sparkleAt: [1.5, 2.5], seed: 67 },
  // Quy luật: easy-going, bells and a gentle bounce
  pattern: { id: "pattern", bpm: 88, beats: 4, root: 58, scale: MAJOR_PENT, progression: [0, 2, 4, 3], rhythms: [[0, 1, 2, 3], [0, 1.5, 2.5, 3], [0, 0.5, 1, 2, 3], [0.5, 1.5, 2, 3.5]], rest: 0.12, maxLen: 2, lead: "bell", comp: "strum", strumAt: [1, 3], bass: [0, 2], perc: "shaker", sparkleAt: [2.5, 3.5], seed: 79 },
};

export const TRACK_IDS = Object.keys(TRACKS) as TrackId[];

/** Small deterministic random numbers (mulberry32), so a track is the same tune every time. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** MIDI note of a scale degree (degree 0 is the root; 5 is the root an octave up in a 5-note scale). */
export function degreeToMidi(track: Pick<Track, "root" | "scale">, degree: number): number {
  const n = track.scale.length;
  const octave = Math.floor(degree / n);
  return track.root + 12 * octave + track.scale[((degree % n) + n) % n]!;
}

/** The notes of one bar of a track. `bar` counts from 0 and wraps every LOOP_BARS. */
export function planBar(track: Track, barIndex: number): Note[] {
  const n = track.scale.length;
  const bar = ((barIndex % LOOP_BARS) + LOOP_BARS) % LOOP_BARS;
  const phrase = Math.floor(bar / 4);
  const inPhrase = bar % 4;
  // A A B A: phrases 0, 2 and 3 share their melody, phrase 1 is different
  const variant = phrase === 1 ? 1 : 0;
  const random = rng(track.seed * 7919 + variant * 131 + inPhrase * 977);
  const chord = track.progression[inPhrase]!;
  const lastBarOfPhrase = inPhrase === 3;
  const notes: Note[] = [];
  const tones = [chord, chord + 2, chord + 4];

  // the chord: one soft held swell, or a short bouncy strum
  if (track.comp === "swell") {
    for (const d of tones) notes.push({ at: 0, dur: track.beats, midi: degreeToMidi(track, d), voice: "pad", vel: 0.5 });
  } else {
    for (const at of track.strumAt) {
      if (at >= track.beats) continue;
      for (const d of tones) notes.push({ at, dur: 0.4, midi: degreeToMidi(track, d), voice: "strum", vel: Number.isInteger(at) ? 0.65 : 0.8 });
    }
  }

  // the bass walks: the chord root first, then other chord tones
  track.bass.forEach((at, i) => {
    if (at >= track.beats) return;
    let d = (i === 0 ? chord : tones[i % 2 === 1 ? 2 : 1]!) - n;
    if (d >= 0) d -= n; // always below the chord register
    notes.push({ at, dur: Math.min(1.25, track.beats - at), midi: degreeToMidi(track, d), voice: "bass", vel: i === 0 ? 0.9 : 0.6 });
  });

  // light percussion
  if (track.perc === "shaker") {
    for (let at = 0.5; at < track.beats; at += 1) notes.push({ at, dur: 0.1, midi: 0, voice: "perc", vel: 0.6 });
  } else if (track.perc === "block") {
    for (const at of track.beats === 3 ? [1, 2] : [1, 3]) notes.push({ at, dur: 0.1, midi: 0, voice: "perc", vel: 0.5 });
  }

  // the melody: starts on a chord tone, then wanders by steps, always inside one octave
  const low = n, high = 2 * n - 1; // lead register in degrees: exactly one octave above the chord register
  const onsets = track.rhythms[Math.floor(random() * track.rhythms.length)]!.filter((t) => t < track.beats);
  let degree = chord + n + [0, 2, 4][Math.floor(random() * 3)]!;
  while (degree > high) degree -= n; // a chord tone moved an octave to fit the register is still the same chord tone
  while (degree < low) degree += n;
  onsets.forEach((at, i) => {
    const step = [-2, -1, -1, 1, 1, 2][Math.floor(random() * 6)]!;
    if (i > 0) degree += step;
    // the last bar of a phrase climbs to the top, like the end of a sentence
    const climbing = lastBarOfPhrase && i >= onsets.length - 2;
    if (climbing) degree = Math.max(degree, high - (onsets.length - 1 - i) * 2);
    degree = Math.min(high, Math.max(low, degree));
    if (i > 0 && !climbing && random() < track.rest) return; // a rest: the melody breathes
    const next = onsets[i + 1] ?? track.beats;
    notes.push({ at, dur: Math.min(track.maxLen, (next - at) * 0.95), midi: degreeToMidi(track, degree), voice: "lead", vel: i === 0 ? 0.95 : 0.75 });
  });

  // sparkles: a quiet chord tone two octaves up, like a triangle or a glass chime
  track.sparkleAt.forEach((at, i) => {
    if (at < track.beats) notes.push({ at, dur: 0.5, midi: degreeToMidi(track, tones[(i + inPhrase) % 3]! + 2 * n), voice: "sparkle", vel: 0.6 });
  });
  return notes.sort((a, b) => a.at - b.at);
}

/** Seconds in one bar. */
export const barSeconds = (t: Track): number => (60 / t.bpm) * t.beats;

/** Which track plays on a screen: the lobby screens share one, each game has its own, the rest are silent. */
export function trackForRoute(name: string, params: readonly string[]): TrackId | null {
  if (name === "home" || name === "who" || name === "stars") return "lobby";
  if (name === "play") {
    const id = params[0] as TrackId | undefined;
    return id && id in TRACKS && id !== "lobby" ? id : "lobby";
  }
  return null; // teacher area, break and "done for today" screens, dev tools
}
