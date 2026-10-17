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

export const GUIDE_STEPS = [
  "Mỗi loại quả là một con số.",
  "Vòng 1: xem Bảng số để biết mỗi quả là số mấy, rồi cộng lại.",
  "Có manh mối: tìm manh mối chỉ có một loại quả chưa biết và giải nó trước, rồi thay số vào manh mối tiếp theo.",
  "Chạm số trên bàn phím để trả lời, rồi bấm Xong.",
];
