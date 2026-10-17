// Background music player: turns the notes planned by music.ts into sound with Web Audio (soft sine and
// triangle voices, a little echo), one track at a time with a short crossfade between tracks.
// The sound comes out of `scheduleBar`, which works on any audio context: the same code plays live
// and renders to a file for `scripts/bgm-preview.mjs`.
import { barSeconds, planBar, TRACKS, type Note, type Track, type TrackId } from "./music.ts";

const midiToHz = (m: number): number => 440 * 2 ** ((m - 69) / 12);

/** Peak level of the music bus before the volume controls: leaves room for the voice and sound effects. */
const BASE_LEVEL = 1.5;
/** While Mèo speaks the music drops to this share of its volume. */
const DUCK_LEVEL = 0.3;
/** How far ahead (seconds) notes are scheduled, and how often the scheduler looks. */
const LOOKAHEAD_S = 1.6;
const TICK_MS = 200;

/** The output chain: a soft low-pass and a little echo. Returns the input to connect notes to. */
export function createBus(ctx: BaseAudioContext, out: AudioNode): GainNode {
  const input = ctx.createGain();
  input.gain.value = 0.6;
  const tone = ctx.createBiquadFilter();
  tone.type = "lowpass";
  tone.frequency.value = 9000;
  const echo = ctx.createDelay(1);
  echo.delayTime.value = 0.24;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.3;
  const echoTone = ctx.createBiquadFilter();
  echoTone.type = "lowpass";
  echoTone.frequency.value = 3600;
  const wet = ctx.createGain();
  wet.gain.value = 0.24;
  input.connect(tone);
  tone.connect(out);
  tone.connect(echo);
  echo.connect(echoTone);
  echoTone.connect(feedback);
  feedback.connect(echo);
  echoTone.connect(wet);
  wet.connect(out);
  return input;
}

/** Start a sine/triangle partial with a quick attack and an exponential fade. */
function partial(ctx: BaseAudioContext, dest: AudioNode, type: OscillatorType, freq: number, at: number, peak: number, attack: number, fadeEnd: number, detune = 0): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, at);
  osc.detune.setValueAtTime(detune, at);
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), at + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + fadeEnd);
  osc.connect(gain);
  gain.connect(dest);
  osc.start(at);
  osc.stop(at + fadeEnd + 0.05);
}

/** A held note that swells in and out (the soft chord under the melody). */
function swell(ctx: BaseAudioContext, dest: AudioNode, freq: number, at: number, dur: number, peak: number): void {
  for (const detune of [-7, 7]) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, at);
    osc.detune.setValueAtTime(detune, at);
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(peak, at + Math.min(0.6, dur * 0.3));
    gain.gain.linearRampToValueAtTime(peak * 0.8, at + Math.max(dur - 0.5, dur * 0.5));
    gain.gain.linearRampToValueAtTime(0, at + dur + 0.35);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(at);
    osc.stop(at + dur + 0.4);
  }
}

const noise = new WeakMap<BaseAudioContext, AudioBuffer>();
/** A short burst of white noise, made once per context: the body of the shaker. */
function noiseBuffer(ctx: BaseAudioContext): AudioBuffer {
  let buf = noise.get(ctx);
  if (!buf) {
    buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 0.12), ctx.sampleRate);
    const d = buf.getChannelData(0);
    // a fixed pseudo-random sequence: the same shaker every time, and the same in a rendered preview
    for (let i = 0, x = 12345; i < d.length; i++) { x = (Math.imul(x, 1664525) + 1013904223) >>> 0; d[i] = x / 2147483648 - 1; }
    noise.set(ctx, buf);
  }
  return buf;
}

function percussion(ctx: BaseAudioContext, dest: AudioNode, track: Track, at: number, vel: number): void {
  if (track.perc === "shaker") {
    const src = ctx.createBufferSource();
    const hp = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    src.buffer = noiseBuffer(ctx);
    hp.type = "highpass";
    hp.frequency.value = 6500;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.07 * vel, at + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.07);
    src.connect(hp);
    hp.connect(gain);
    gain.connect(dest);
    src.start(at);
    src.stop(at + 0.1);
  } else if (track.perc === "block") {
    // a woodblock: two short, high, hollow tones
    partial(ctx, dest, "sine", 1180, at, 0.09 * vel, 0.002, 0.07);
    partial(ctx, dest, "sine", 1790, at, 0.04 * vel, 0.002, 0.05);
  }
}

function playNote(ctx: BaseAudioContext, dest: AudioNode, track: Track, note: Note, at: number, spb: number): void {
  const f = midiToHz(note.midi);
  const len = note.dur * spb;
  const v = note.vel;
  switch (note.voice) {
    case "perc":
      return percussion(ctx, dest, track, at, v);
    case "pad": // a soft held chord, for the calmer tracks
      return swell(ctx, dest, f, at, len, 0.05 * v);
    case "strum": // a short, bright chord stab (the bounce)
      partial(ctx, dest, "triangle", f, at, 0.075 * v, 0.004, Math.max(0.2, Math.min(len, 0.45)));
      return partial(ctx, dest, "sine", f * 2, at, 0.03 * v, 0.003, 0.18);
    case "sparkle": // a quiet glass chime on top
      partial(ctx, dest, "sine", f, at, 0.07 * v, 0.004, 0.7);
      return partial(ctx, dest, "sine", f * 3, at, 0.014 * v, 0.003, 0.25);
    case "bass":
      // a sine plus its octave: small speakers (tablets, laptops) cannot play a bare low sine
      partial(ctx, dest, "sine", f, at, 0.2 * v, 0.01, Math.min(len + 0.25, 1.1));
      return partial(ctx, dest, "sine", f * 2, at, 0.075 * v, 0.01, Math.min(len, 0.6));
    case "lead":
      break;
  }
  switch (track.lead) {
    case "box": // a bright music box: a clear sine with sparkling upper partials
      partial(ctx, dest, "sine", f, at, 0.19 * v, 0.004, Math.max(0.7, len * 1.3));
      partial(ctx, dest, "sine", f * 2, at, 0.075 * v, 0.003, 0.55);
      partial(ctx, dest, "sine", f * 3, at, 0.04 * v, 0.003, 0.3);
      return partial(ctx, dest, "sine", f * 4, at, 0.022 * v, 0.003, 0.2);
    case "bell": // a glockenspiel: a long ring and an inharmonic shimmer
      partial(ctx, dest, "sine", f, at, 0.17 * v, 0.004, Math.max(1.2, len * 1.2));
      partial(ctx, dest, "sine", f * 2, at, 0.06 * v, 0.003, 0.8);
      partial(ctx, dest, "sine", f * 2.76, at, 0.045 * v, 0.003, 0.5);
      return partial(ctx, dest, "sine", f * 5.4, at, 0.02 * v, 0.002, 0.25);
    case "pluck": // a marimba / toy pluck: a bright triangle with a touch of buzz at the start
      partial(ctx, dest, "triangle", f, at, 0.19 * v, 0.004, Math.max(0.26, Math.min(len * 1.1, 0.5)));
      partial(ctx, dest, "sawtooth", f, at, 0.028 * v, 0.003, 0.1);
      return partial(ctx, dest, "sine", f * 2, at, 0.06 * v, 0.003, 0.2);
  }
}

/** Schedule every note of one bar on any audio context. `at` is the context time of the bar's first beat. */
export function scheduleBar(ctx: BaseAudioContext, dest: AudioNode, track: Track, bar: number, at: number): void {
  const spb = 60 / track.bpm;
  for (const note of planBar(track, bar)) playNote(ctx, dest, track, note, at + note.at * spb, spb);
}

/** Render `seconds` of a track into a buffer (no sound card needed): for tests and the preview script. */
export async function renderTrack(id: TrackId, seconds: number, sampleRate = 44100): Promise<AudioBuffer> {
  const ctx = new OfflineAudioContext(1, Math.ceil(seconds * sampleRate), sampleRate);
  const out = ctx.createGain();
  out.gain.value = BASE_LEVEL;
  out.connect(ctx.destination);
  const bus = createBus(ctx, out);
  const track = TRACKS[id];
  for (let bar = 0, t = 0.05; t < seconds; bar++, t += barSeconds(track)) scheduleBar(ctx, bus, track, bar, t);
  return ctx.startRendering();
}

interface Playing {
  id: TrackId;
  /** Per-track fade; notes connect here. */
  fade: GainNode;
  bar: number;
  nextAt: number;
}

/**
 * The live player. Tell it what the screen wants (`play`), how loud the music should be (`setVolume`, 0..1,
 * already including the master volume, the mute and the on/off switches) and when Mèo speaks (`duck`).
 * Browsers only allow sound after a touch, so nothing starts before `unlock()` has been called from one.
 */
export class Bgm {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private current: Playing | null = null;
  private timer = 0;
  private want: TrackId | null = null;
  private volume = 0;
  private ducked = false;
  private held = false;
  private hidden = false;

  constructor() {
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", () => {
        this.hidden = document.hidden;
        if (!this.ctx) return;
        if (this.hidden) void this.ctx.suspend();
        else void this.ctx.resume();
      });
    }
  }

  get playing(): TrackId | null {
    return this.current?.id ?? null;
  }

  /** What the player is doing, for tests and the dev console. */
  get state(): { volume: number; ducked: boolean; held: boolean; context: AudioContextState | "none" } {
    return { volume: this.volume, ducked: this.ducked, held: this.held, context: this.ctx?.state ?? "none" };
  }

  /** The track this screen wants, or null for silence. */
  play(id: TrackId | null): void {
    this.want = id;
    this.sync();
  }

  /** 0..1: the music's share of the master level; 0 stops the scheduler altogether. */
  setVolume(v: number): void {
    this.volume = Math.min(1, Math.max(0, v));
    this.sync();
    this.applyGain();
  }

  /** Lower the music while Mèo speaks. */
  duck(on: boolean): void {
    this.ducked = on;
    this.applyGain();
  }

  /** Fade the music right out (the child went quiet and the game paused) and bring it back. */
  hold(on: boolean): void {
    if (on === this.held) return;
    this.held = on;
    this.applyGain();
  }

  /** Call from a touch handler: browsers start Web Audio only after one. */
  unlock(): void {
    if (this.ctx?.state === "running") return;
    try {
      if (!this.ctx) {
        const Ctx = globalThis.AudioContext ?? (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctx) return;
        this.ctx = new Ctx();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0;
        this.master.connect(this.ctx.destination);
      }
      if (this.ctx.state === "suspended" && !this.hidden) void this.ctx.resume();
      this.sync();
      this.applyGain();
    } catch { /* no Web Audio on this device: the app is simply silent */ }
  }

  private applyGain(): void {
    if (!this.ctx || !this.master) return;
    const level = BASE_LEVEL * this.volume * (this.ducked ? DUCK_LEVEL : 1) * (this.held ? 0 : 1);
    this.master.gain.setTargetAtTime(level, this.ctx.currentTime, 0.18);
  }

  /** Make what is playing match what is wanted. */
  private sync(): void {
    if (!this.ctx) return; // before the first touch: remembered in `want`, started by unlock()
    const wanted = this.volume > 0 ? this.want : null;
    if (wanted === (this.current?.id ?? null)) return;
    this.fadeOutCurrent();
    if (!wanted) {
      clearInterval(this.timer);
      this.timer = 0;
      return;
    }
    const ctx = this.ctx;
    const fade = ctx.createGain();
    fade.gain.setValueAtTime(0, ctx.currentTime);
    fade.gain.setTargetAtTime(1, ctx.currentTime + 0.05, 0.4);
    fade.connect(createBus(ctx, this.master!));
    this.current = { id: wanted, fade, bar: 0, nextAt: ctx.currentTime + 0.15 };
    if (!this.timer) this.timer = window.setInterval(() => this.schedule(), TICK_MS);
    this.schedule();
  }

  private fadeOutCurrent(): void {
    const old = this.current;
    if (!old || !this.ctx) return;
    old.fade.gain.cancelScheduledValues(this.ctx.currentTime);
    old.fade.gain.setTargetAtTime(0, this.ctx.currentTime, 0.25);
    // notes already scheduled keep sounding quietly under the fade; the chain is dropped once they are done
    setTimeout(() => old.fade.disconnect(), 4000);
    this.current = null;
  }

  private schedule(): void {
    const ctx = this.ctx;
    const cur = this.current;
    if (!ctx || !cur) return;
    const track = TRACKS[cur.id];
    while (cur.nextAt < ctx.currentTime + LOOKAHEAD_S) {
      scheduleBar(ctx, cur.fade, track, cur.bar, cur.nextAt);
      cur.nextAt += barSeconds(track);
      cur.bar++;
    }
  }
}
