import type { CheckResult } from "../../core/types.ts";
import { say, type Speech } from "../../i18n/speech.ts";
import { SCENES, type SplitQuestion } from "./logic.ts";

export function prompt(q: SplitQuestion): Speech {
  if (q.mode === "picture") return say("split_count_all");
  if (q.mode === "picture+bond") return say("split_count_parts");
  // "7 gồm 3 và mấy?"
  const known = q.blanks[0] === "a" ? q.b : q.a;
  return say(q.whole, "gom", known, "va", "may_q");
}

/** The fill-in sentence, as segments the view renders (numbers or blanks). */
export function sentence(q: SplitQuestion): ({ text: string } | { slot: "whole" | "a" | "b"; kind?: 0 | 1 })[] {
  const s = SCENES[q.scene];
  if (q.mode === "bond") return [{ slot: "whole" }, { text: "gồm" }, { slot: "a" }, { text: "và" }, { slot: "b" }];
  const where = s.container === "vase" ? "Trong lọ có" : "Trong giỏ có";
  return [
    { text: where }, { slot: "whole" }, { text: `${s.unit}, trong đó có` },
    { slot: "a", kind: 0 }, { text: `${s.names[0]} và` }, { slot: "b", kind: 1 }, { text: `${s.names[1]}.` },
  ];
}

export function hint(r: CheckResult): Speech {
  if (r.correct) return say("split_ok");
  if (r.reason === "miscount") return say("split_hint_tap");
  return say("split_hint_sum");
}

export const GUIDE_STEPS = [
  "Nhìn lọ hoa: có hai loại, khác nhau về hình dạng và màu sắc.",
  "Chạm vào từng bông để đánh dấu, đếm không sót bông nào.",
  "Số ở trên (tất cả) gồm hai số ở dưới (hai phần).",
  "Chạm vào ô trống, chọn số trên bàn phím, rồi bấm Xong.",
];
