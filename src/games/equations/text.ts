import type { CheckResult } from "../../core/types.ts";
import { say, type Speech } from "../../i18n/speech.ts";
import type { EquationsQuestion } from "./logic.ts";

export const FRUIT_NAME = { red_apple: "táo", pear: "lê", watermelon: "dưa hấu", tangerine: "cam", banana: "chuối" } as const;

export function prompt(q: EquationsQuestion): Speech {
  if (q.clues.length) return say("eq_find");
  return q.asks.length > 1 ? say("eq_multi") : say("eq_t1");
}

export function hint(r: CheckResult, q: EquationsQuestion): Speech {
  if (r.correct) return say("eq_ok");
  if (r.reason === "wrongChain") return say("eq_hint_first");
  return q.asks.length > 1 ? say("eq_hint_rows") : say("eq_hint_add");
}

export const GUIDE_STEPS: Speech[] = [
  say("guide_eq_1"),
  say("guide_eq_2"),
  say("guide_eq_3"),
  say("guide_eq_4"),
];
