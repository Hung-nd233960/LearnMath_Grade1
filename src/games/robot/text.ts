import type { CheckResult } from "../../core/types.ts";
import { say, type Speech } from "../../i18n/speech.ts";

export const prompt = (): Speech => say("robot_prompt");

export function hint(r: CheckResult): Speech {
  if (r.correct) return say("robot_ok");
  if (r.reason === "empty") return say("robot_empty");
  if (r.reason === "blocked") return say("robot_blocked");
  return say("robot_not_there");
}

export const GUIDE_STEPS = [
  "Tìm rô-bốt và lá cờ trên bảng.",
  "Chạm các mũi tên để xếp từng bước đi cho rô-bốt. Mỗi mũi tên là một ô.",
  "Rô-bốt không đi qua được tường đỏ và ô gạch.",
  "Bấm Chạy! để xem rô-bốt đi. Sai thì bấm Làm lại.",
];
