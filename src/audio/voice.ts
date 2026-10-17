// Plays a Speech: the teacher's recorded clips in order (public/audio/<clip>.mp3).
// If any clip of a sentence has no recording yet, the whole sentence is read by the
// browser's Vietnamese voice instead (if the device has one), so nothing is half-spoken.
// Browsers block audio until the first tap: call voice.unlock() from a tap handler.
import type { Speech } from "../i18n/speech.ts";

export class Voice {
  muted = false;
  private readonly base: string;
  private missing = new Set<string>();
  private current: HTMLAudioElement | null = null;
  private token = 0;

  constructor(base = "audio/") {
    this.base = base;
  }

  /** Call once inside the first user gesture (e.g. the profile tap). */
  unlock(): void {
    try {
      const a = new Audio();
      a.muted = true;
      void a.play().catch(() => {});
    } catch { /* no audio support */ }
    if ("speechSynthesis" in globalThis) speechSynthesis.getVoices();
  }

  stop(): void {
    this.token++;
    if (this.current) { this.current.pause(); this.current = null; }
    if ("speechSynthesis" in globalThis) speechSynthesis.cancel();
  }

  /** Resolves when finished (or immediately when muted / impossible). Never rejects. */
  async play(s: Speech): Promise<void> {
    this.stop();
    if (this.muted || !s.clips.length) return;
    const my = this.token;
    if (s.clips.some((c) => this.missing.has(c))) return this.tts(s.text);
    for (const clip of s.clips) {
      if (my !== this.token) return;
      const r = await this.playClip(clip);
      if (r === "blocked") return; // autoplay not unlocked yet: stay silent, text is on screen
      if (r === "missing") { this.missing.add(clip); if (my === this.token) await this.tts(s.text); return; }
    }
  }

  private playClip(clip: string): Promise<"ok" | "missing" | "blocked"> {
    return new Promise((resolve) => {
      const a = new Audio(this.base + clip + ".mp3");
      this.current = a;
      a.onended = () => resolve("ok");
      a.onerror = () => resolve("missing"); // file not found / not decodable
      a.play().catch((e: unknown) => {
        // NotAllowedError = autoplay policy; anything else is treated as a missing file.
        resolve(e instanceof DOMException && e.name === "NotAllowedError" ? "blocked" : "missing");
      });
    });
  }

  private tts(text: string): Promise<void> {
    return new Promise((resolve) => {
      if (!("speechSynthesis" in globalThis)) return resolve();
      const vi = speechSynthesis.getVoices().find((v) => v.lang?.toLowerCase().startsWith("vi"));
      if (!vi) return resolve(); // no Vietnamese voice on this device: stay silent, text is on screen
      const u = new SpeechSynthesisUtterance(text);
      u.voice = vi;
      u.lang = vi.lang;
      u.rate = 0.9;
      u.onend = () => resolve();
      u.onerror = () => resolve();
      speechSynthesis.speak(u);
    });
  }
}
