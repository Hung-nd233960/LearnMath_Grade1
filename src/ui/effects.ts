// Celebration pieces. Both do nothing unless the teacher has "Pháo hoa" (fx-celebrate) on.
import { emojiSrc, h } from "./dom.ts";
import { fxOn } from "./fx.ts";
import { STAGE_W } from "./stage.ts";

const COLORS = ["#ffc53d", "#e8604c", "#2f8a4c", "#4d8df6", "#b06cf2", "#ff8fb1"];

/** Paper confetti falling across the whole stage. */
export function confetti(stage: HTMLElement): void {
  if (!fxOn("celebrate")) return;
  for (let i = 0; i < 46; i++) {
    const piece = h("div", { class: "confetti" });
    piece.style.left = Math.random() * STAGE_W + "px";
    piece.style.background = COLORS[i % COLORS.length]!;
    piece.style.setProperty("--dx", Math.random() * 200 - 100 + "px");
    piece.style.setProperty("--r", Math.random() * 720 - 360 + "deg");
    piece.style.animationDelay = Math.random() * 0.4 + "s";
    stage.append(piece);
    setTimeout(() => piece.remove(), 2400);
  }
}

/** A small burst of sparkles around an element (e.g. a fruit that just landed). */
export function sparkle(stage: HTMLElement, around: Element, count = 6, distance = 70): void {
  if (!fxOn("celebrate")) return;
  const s = stage.getBoundingClientRect();
  const r = around.getBoundingClientRect();
  const k = s.width / STAGE_W; // the stage is scaled; convert screen px to stage px
  for (let i = 0; i < count; i++) {
    const spark = h("img", { class: "spark", src: emojiSrc("sparkles"), alt: "" });
    spark.style.left = (r.left + r.width / 2 - s.left) / k + "px";
    spark.style.top = (r.top + r.height / 2 - s.top) / k + "px";
    spark.style.setProperty("--dx", Math.cos((i / count) * Math.PI * 2) * distance + "px");
    spark.style.setProperty("--dy", Math.sin((i / count) * Math.PI * 2) * distance + "px");
    stage.append(spark);
    setTimeout(() => spark.remove(), 800);
  }
}
