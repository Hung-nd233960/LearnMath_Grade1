// Short sound effects, synthesised with Web Audio (no files). Respects the master mute
// and the teacher's "Âm thanh hiệu ứng" switch: set `sfx.enabled` from settings.

type Tone = { freqs: number[]; type?: OscillatorType; dur?: number; gap?: number; vol?: number };

const SOUNDS = {
  tap: { freqs: [700], dur: 0.06, vol: 0.05 },
  pick: { freqs: [520, 780], dur: 0.08, gap: 0.05, vol: 0.09 },
  drop: { freqs: [990, 740], dur: 0.1, gap: 0.06, vol: 0.09 },
  win: { freqs: [523, 659, 784, 1047], dur: 0.2, gap: 0.1, vol: 0.12 },
  oops: { freqs: [330, 247], type: "sine", dur: 0.2, gap: 0.13, vol: 0.1 },
  star: { freqs: [784, 1175, 1568], dur: 0.16, gap: 0.08, vol: 0.1 },
} satisfies Record<string, Tone>;

export type SfxName = keyof typeof SOUNDS;

class Sfx {
  enabled = true;
  muted = false;
  /** 0..1, from the sound mixer (master × sound effects). */
  volume = 1;
  private ctx: AudioContext | null = null;

  play(name: SfxName): void {
    if (!this.enabled || this.muted || this.volume <= 0) return;
    const t: Tone = SOUNDS[name];
    try {
      const Ctx = globalThis.AudioContext ?? (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      this.ctx ??= new Ctx();
      const ctx = this.ctx;
      if (ctx.state === "suspended") void ctx.resume();
      const { type = "triangle", dur = 0.12, gap = 0.07, vol = 0.12 } = t;
      t.freqs.forEach((f, i) => {
        const at = ctx.currentTime + i * gap;
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = type;
        o.frequency.setValueAtTime(f, at);
        g.gain.setValueAtTime(0.0001, at);
        g.gain.exponentialRampToValueAtTime(Math.max(vol * this.volume, 0.0002), at + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
        o.connect(g).connect(ctx.destination);
        o.start(at);
        o.stop(at + dur + 0.02);
      });
    } catch { /* audio unavailable */ }
  }
}

export const sfx = new Sfx();
