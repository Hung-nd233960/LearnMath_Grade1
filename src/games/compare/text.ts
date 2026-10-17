import type { CheckResult } from "../../core/types.ts";
import { say, type Speech } from "../../i18n/speech.ts";
import type { CompareQuestion } from "./logic.ts";

export function prompt(q: CompareQuestion): Speech {
  return say(q.mode === "order" ? "cmp_order" : q.mode === "heaviest" ? "cmp_heaviest" : "cmp_lightest");
}

export function hint(r: CheckResult): Speech {
  return r.correct ? say("cmp_ok") : say("cmp_hint");
}

export const GUIDE_STEPS: Speech[] = [
  say("guide_cmp_1"),
  say("guide_cmp_2"),
  say("guide_cmp_3"),
  say("guide_cmp_4"),
];
