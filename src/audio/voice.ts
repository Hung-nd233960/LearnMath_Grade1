// Plays a Speech: the clips of the chosen voice pack in order (public/audio/<pack>/<clip>.mp3).
// If any clip of a sentence is missing from the pack (or the pack is "device"), the whole sentence is
// read by the browser's Vietnamese voice instead (if the device has one), so nothing is half-spoken.
// Browsers block audio until the first tap: call voice.unlock() from a tap handler.
import type { Speech } from "../i18n/speech.ts";
import { DEVICE_PACK } from "./packs.ts";

export class Voice {
  muted = false;
  /** 0..1, from the sound mixer (master × voice). */
  volume = 1;
  /** Called with true when speech starts and false when it ends or is cut off: the music ducks meanwhile. */
  onSpeaking: ((speaking: boolean) => void) | null = null;
  private speaking = false;
  private readonly root: string;
  /** Folder of the chosen pack, or null for the device voice. */
  private pack: string = DEVICE_PACK;
  private missing = new Set<string>();
  private current: HTMLAudioElement | null = null;
  private token = 0;

  /** `root` is the folder holding the pack folders, e.g. "audio/". */
  constructor(root = "audio/") {
    this.root = root;
  }

  /** Choose which pack plays ("device" = the device's own voice). */
  setPack(id: string): void {
    if (id !== this.pack) this.stop();
    this.pack = id;
  }

  get currentPack(): string {
    return this.pack;
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

  private setSpeaking(on: boolean): void {
    if (on === this.speaking) return;
    this.speaking = on;
    this.onSpeaking?.(on);
  }

  stop(): void {
    this.token++;
    this.setSpeaking(false);
    if (this.current) { this.current.pause(); this.current = null; }
    if ("speechSynthesis" in globalThis) speechSynthesis.cancel();
  }

  /**
   * Resolves when finished (or immediately when muted / impossible). Never rejects.
   * `pack` plays this once from another pack (the teacher's "listen" button) without changing the choice;
   * `force` plays even while the children's sound is switched off.
   */
  async play(s: Speech, pack: string = this.pack, force = false): Promise<void> {
    this.stop();
    if (((this.muted || this.volume <= 0) && !force) || !s.clips.length) return;
    const my = this.token;
    const vol = force ? 1 : this.volume;
    this.setSpeaking(true);
    try {
      if (pack === DEVICE_PACK) return await this.tts(s.text, vol);
      const url = (clip: string) => `${this.root}${pack}/${clip}.mp3`;
      if (s.clips.some((c) => this.missing.has(url(c)))) return await this.tts(s.text, vol);
      for (const clip of s.clips) {
        if (my !== this.token) return;
        const r = await this.playClip(url(clip), vol);
        if (r === "blocked") return; // autoplay not unlocked yet: stay silent, text is on screen
        if (r === "missing") { this.missing.add(url(clip)); if (my === this.token) await this.tts(s.text, vol); return; }
      }
    } finally {
      if (my === this.token) this.setSpeaking(false);
    }
  }

  private playClip(src: string, volume: number): Promise<"ok" | "missing" | "blocked"> {
    return new Promise((resolve) => {
      const a = new Audio(src);
      a.volume = volume;
      this.current = a;
      a.onended = () => resolve("ok");
      a.onerror = () => resolve("missing"); // file not found / not decodable
      a.play().catch((e: unknown) => {
        // NotAllowedError = autoplay policy; anything else is treated as a missing file.
        resolve(e instanceof DOMException && e.name === "NotAllowedError" ? "blocked" : "missing");
      });
    });
  }

  private tts(text: string, volume: number): Promise<void> {
    return new Promise((resolve) => {
      if (!("speechSynthesis" in globalThis)) return resolve();
      const vi = speechSynthesis.getVoices().find((v) => v.lang?.toLowerCase().startsWith("vi"));
      if (!vi) return resolve(); // no Vietnamese voice on this device: stay silent, text is on screen
      const u = new SpeechSynthesisUtterance(text);
      u.voice = vi;
      u.lang = vi.lang;
      u.rate = 0.9;
      u.volume = volume;
      u.onend = () => resolve();
      u.onerror = () => resolve();
      speechSynthesis.speak(u);
    });
  }
}
