// PLACEHOLDER: replaced by docs/tasks/03-quy-luat.md.
import type { CheckResult } from "../../core/types.ts";
import { say, type Speech } from "../../i18n/speech.ts";

export function prompt(): Speech {
  return say("help_today");
}

export function hint(r: CheckResult): Speech {
  return r.correct ? say("praise_1") : say("try_again");
}

export const GUIDE_STEPS: Speech[] = [say("guide_pattern_1"), say("guide_pattern_2"), say("guide_pattern_3"), say("guide_pattern_4")];
