import type { CheckResult } from "../../core/types.ts";
import { say, type Speech } from "../../i18n/speech.ts";

export const prompt = (): Speech => say("robot_prompt");

export function hint(r: CheckResult): Speech {
  if (r.correct) return say("robot_ok");
  if (r.reason === "empty") return say("robot_empty");
  if (r.reason === "blocked") return say("robot_blocked");
  return say("robot_not_there");
}

export const GUIDE_STEPS: Speech[] = [
  say("guide_robot_1"),
  say("guide_robot_2"),
  say("guide_robot_3"),
  say("guide_robot_4"),
];
