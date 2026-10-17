import type { CheckResult, Position } from "../../core/types.ts";
import { say, type Speech } from "../../i18n/speech.ts";

export const FRUIT_NAME = { grapes: "nho", red_apple: "táo", watermelon: "dưa hấu" } as const;

export function prompt(_q: unknown, pos: Position): Speech {
  return say(pos.tier === 1 ? "scale_t1" : pos.tier === 2 ? "scale_t2" : "scale_t3");
}

export function hint(r: CheckResult): Speech {
  if (r.correct) return say("scale_ok");
  if (r.reason === "leftHeavier") return say("scale_left_heavier", "scale_fix");
  if (r.reason === "rightHeavier") return say("scale_right_heavier", "scale_fix");
  return say("scale_fix");
}

export const GUIDE_STEPS = [
  "Nhìn hai đĩa cân: đĩa nào nặng hơn?",
  "Xem bảng cân: mỗi loại quả nặng khác nhau (Vòng 1: chỉ cần đếm).",
  "Kéo quả từ khay vào đĩa nhẹ hơn (hoặc chạm quả rồi chạm đĩa).",
  "Bấm Xong để thả cân và xem kết quả.",
];
