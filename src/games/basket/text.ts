import type { ClipId } from "../../audio/manifest.ts";
import type { CheckResult } from "../../core/types.ts";
import { capitalize, numberWords } from "../../i18n/numbers.ts";
import { say, type Speech, type SpeechPart } from "../../i18n/speech.ts";
import type { BasketQuestion, Fruit } from "./logic.ts";

export const FRUIT_CLIP: Record<Fruit, ClipId> = { tangerine: "fruit_cam", red_apple: "fruit_tao", banana: "fruit_chuoi" };

/** "Đưa cho Mèo hai chục quả cam nhé!" / "… mười ba quả cam …" / "… hai quả cam và ba quả táo …" */
export function prompt(q: BasketQuestion): Speech {
  const parts: SpeechPart[] = ["give_meo"];
  q.order.forEach((f, i) => {
    if (i > 0) parts.push("va");
    const n = q.want[f] ?? 0;
    if (q.tens?.kind === "wholeTens") parts.push(q.tens.tens, "chuc");
    else parts.push(n);
    parts.push(FRUIT_CLIP[f]);
  });
  parts.push("nhe");
  return say(...parts);
}

/** After a correct tier-2 answer, name the amount both ways: "Hai chục là 20 quả cam." */
export function tensReading(q: BasketQuestion): string | null {
  if (!q.tens) return null;
  const total = q.tens.tens * 10 + q.tens.ones;
  const head = `${capitalize(numberWords(q.tens.tens))} chục${q.tens.ones ? ` và ${q.tens.ones} quả` : ""}`;
  return `${head} là ${total} quả cam.`;
}

export function hint(r: CheckResult): Speech {
  if (r.correct) return r.reason === "looseTen" ? say("basket_ok", "basket_loose_ten") : say("basket_ok");
  if (r.reason === "tooMany") return say("basket_too_many");
  return say("basket_too_few", "basket_bag_is_ten");
}

export const GUIDE_STEPS = [
  "Nghe Mèo nói cần những quả gì, bao nhiêu quả.",
  "Kéo quả từ Giỏ của em sang Giỏ của Mèo (hoặc chạm quả rồi chạm giỏ).",
  "Mỗi túi có 1 chục = 10 quả. 2 chục = 2 túi. 13 quả = 1 túi và 3 quả.",
  "Đưa đúng số quả: không thừa, không thiếu. Xong thì bấm Xong.",
];
