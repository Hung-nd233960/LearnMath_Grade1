import type { CheckResult } from "../../core/types.ts";
import { say, type Speech } from "../../i18n/speech.ts";
import type { PatternQuestion } from "./logic.ts";

export function prompt(q: PatternQuestion): Speech {
  return say(q.kind === "number" ? "pattern_number" : "pattern_prompt");
}

export function hint(r: CheckResult, q: PatternQuestion): Speech {
  if (r.correct) return say("pattern_ok");
  return say(`pattern_hint_${q.kind}` as const);
}

export const GUIDE_STEPS: Speech[] = [
  say("guide_pattern_1"),
  say("guide_pattern_2"),
  say("guide_pattern_3"),
  say("guide_pattern_4"),
];
