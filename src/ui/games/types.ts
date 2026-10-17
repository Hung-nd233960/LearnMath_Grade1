// The contract between the generic play loop (screens/play.ts) and one game's screen.
// A view only DRAWS a question and hands back an answer. Whether it is right, what the hint
// says and what comes next are decided by SetRunner, logic.check() and text.hint().
import type { Position } from "../../core/types.ts";
import type { AnswerFeedback } from "../../core/session.ts";
import type { Speech } from "../../i18n/speech.ts";
import type { AppContext } from "../context.ts";

export interface GameViewApi<A> {
  ctx: AppContext;
  /** Difficulty position of this question: the tier decides things like live tilt or counts. */
  pos: Position;
  /** The child pressed "Xong" / "Chạy!". Ignored while feedback is showing. */
  submit(answer: A): void;
  /** Say something short (e.g. "Em chọn một số trên bàn phím nhé."). */
  speak(s: Speech): void;
}

export interface GameView<Q, A> {
  /** Draw the question into `el` (an absolutely positioned layer covering the screen under the top bar). */
  mount(el: HTMLElement, q: Q, api: GameViewApi<A>): void;
  /** Show the result before the feedback card (colour the answer, tilt the scale, walk the robot). */
  playResult?(fb: AnswerFeedback): Promise<void>;
  /** The child is out of tries: show a correct answer (it comes from logic.solve). */
  reveal?(answer: A): Promise<void>;
  /** After a wrong try ("retry"): make the question editable again. */
  reset?(): void;
  /** Remove listeners and timers. The play loop clears `el` itself. */
  unmount(): void;
}

export type ViewFactory = () => GameView<any, any>;
