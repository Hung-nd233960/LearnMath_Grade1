import type { CheckResult, Position } from "../../core/types.ts";
import { say, type Speech } from "../../i18n/speech.ts";
import type { ScaleQuestion } from "./logic.ts";

export const FRUIT_NAME = { grapes: "nho", red_apple: "táo", watermelon: "dưa hấu", mango: "xoài", tangerine: "cam" } as const;

export function prompt(q: ScaleQuestion, pos: Position): Speech {
  switch (q.kind) {
    case "balance": return say(pos.step === 0 ? "scale_t1" : pos.step === 1 ? "scale_t2" : "scale_t3");
    case "compare": return say(q.mode === "order" ? "cmp_order" : q.mode === "heaviest" ? "cmp_heaviest" : "cmp_lightest");
    case "infer": return say("infer_one");
  }
}

export function hint(r: CheckResult, q: ScaleQuestion): Speech {
  switch (q.kind) {
    case "balance":
      if (r.correct) return say("scale_ok");
      if (r.reason === "leftHeavier") return say("scale_left_heavier", "scale_fix");
      if (r.reason === "rightHeavier") return say("scale_right_heavier", "scale_fix");
      return say("scale_fix");
    case "compare":
      return r.correct ? say("cmp_ok") : say("cmp_hint");
    case "infer":
      if (r.correct) return say("infer_ok");
      return say(r.reason === "tooMany" ? "infer_hint_many" : "infer_hint_few");
  }
}

export const GUIDE_STEPS: Speech[] = [
  say("guide_scale_1"),
  say("guide_scale_2"),
  say("guide_scale_3"),
  say("guide_scale_4"),
];
