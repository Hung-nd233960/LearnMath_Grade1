import type { CheckResult } from "../../core/types.ts";
import { say, type Speech } from "../../i18n/speech.ts";
import type { EquationsQuestion } from "./logic.ts";

export const FRUIT_NAME = { red_apple: "táo", pear: "lê", watermelon: "dưa hấu", tangerine: "cam" } as const;

export function prompt(q: EquationsQuestion): Speech {
  return q.clues.length ? say("eq_find") : say("eq_t1");
}

export function hint(r: CheckResult): Speech {
  if (r.correct) return say("eq_ok");
  return r.reason === "wrongChain" ? say("eq_hint_first") : say("eq_hint_add");
}

export const GUIDE_STEPS: Speech[] = [
  say("guide_eq_1"),
  say("guide_eq_2"),
  say("guide_eq_3"),
  say("guide_eq_4"),
];
