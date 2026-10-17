// The sound mixer a child reaches by HOLDING the speaker button (a tap still just mutes everything):
// master, background music, sound effects and Mèo's voice, each with an on/off switch and a volume.
// What the teacher switched off in the teacher area stays off here and is shown greyed out.
import { say } from "../i18n/speech.ts";
import { STR } from "../i18n/ui.ts";
import type { Channel, Settings } from "../core/settings.ts";
import type { AppContext } from "./context.ts";
import { emoji, h } from "./dom.ts";
import { openOverlay, type Overlay } from "./overlay.ts";
import "./soundPanel.css";

type Row = { key: "master" | Channel; icon: string; label: string };
const ROWS: Row[] = [
  { key: "master", icon: "speaker_high_volume", label: STR.soundMaster },
  { key: "music", icon: "musical_note", label: STR.soundMusic },
  { key: "sfx", icon: "bell", label: STR.soundSfx },
  { key: "voice", icon: "speaking_head", label: STR.soundVoice },
];

export function openSoundPanel(ctx: AppContext): Overlay {
  const change = (fn: (s: Settings) => Settings) => ctx.store.update((d) => ({ ...d, settings: fn(d.settings) }));
  const rows = ROWS.map((row) => {
    const check = h("input", { type: "checkbox", "data-on": row.key, "aria-label": row.label });
    const slider = h("input", { type: "range", min: 0, max: 100, step: 5, "data-vol": row.key, "aria-label": `${row.label}: ${STR.soundVolume}` });
    const note = h("small", null);
    const el = h("div", { class: "snd-row", "data-row": row.key },
      emoji(row.icon, 52),
      h("div", { class: "snd-main" }, h("b", null, row.label), slider, note),
      h("label", { class: "sw snd-sw" }, check, h("i")));
    check.addEventListener("change", () => change((s) => (row.key === "master"
      ? { ...s, muted: !check.checked }
      : { ...s, mix: { ...s.mix, [`${row.key}On`]: check.checked } })));
    slider.addEventListener("input", () => change((s) => ({ ...s, mix: { ...s.mix, [row.key]: Number(slider.value) / 100 } })));
    // a little feedback once the slider is let go: a click for the effects, a word for the voice
    slider.addEventListener("change", () => {
      if (row.key === "sfx") ctx.sfx.play("star");
      if (row.key === "voice") void ctx.voice.play(say("hello"));
    });
    return { row, el, check, slider, note };
  });

  const sync = () => {
    const s = ctx.store.data.settings;
    for (const { row, el, check, slider, note } of rows) {
      const teacherOff = (row.key === "music" && !s.fx.music) || (row.key === "sfx" && !s.fx.sfx);
      const on = row.key === "master" ? !s.muted : s.mix[`${row.key}On`];
      check.checked = on && !teacherOff;
      check.disabled = teacherOff;
      slider.value = String(Math.round(s.mix[row.key] * 100));
      slider.disabled = teacherOff || !on;
      note.textContent = teacherOff ? STR.soundOffByTeacher : "";
      el.classList.toggle("off", teacherOff || !on || (row.key !== "master" && s.muted));
    }
  };
  sync();
  const unsubscribe = ctx.store.subscribe(sync);

  const card = h("div", { class: "card snd-card" },
    h("h2", null, STR.soundTitle),
    ...rows.map((r) => r.el),
    h("button", { class: "btn btn-primary", id: "snd-done", "data-close": true }, STR.done));
  const overlay = openOverlay(ctx.stage.el, card, unsubscribe);
  overlay.el.classList.add("snd-overlay");
  overlay.el.addEventListener("pointerdown", (e) => { if (e.target === overlay.el) overlay.close(); });
  return overlay;
}
