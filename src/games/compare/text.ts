import type { CheckResult } from "../../core/types.ts";
import { say, type Speech } from "../../i18n/speech.ts";
import type { CompareQuestion } from "./logic.ts";

export function prompt(q: CompareQuestion): Speech {
  return say(q.mode === "order" ? "cmp_order" : q.mode === "heaviest" ? "cmp_heaviest" : "cmp_lightest");
}

export function hint(r: CheckResult): Speech {
  return r.correct ? say("cmp_ok") : say("cmp_hint");
}

export const GUIDE_STEPS = [
  "Mỗi cái cân so sánh hai hộp quà. Các hộp to bằng nhau nhưng nặng khác nhau.",
  "Bên nào cân hạ xuống là bên nặng hơn.",
  "Đọc từng cân để tìm ra manh mối.",
  "Chạm vào hộp đúng, hoặc xếp các hộp từ nhẹ đến nặng rồi bấm Xong.",
];
