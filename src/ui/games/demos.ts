// Mèo's worked examples ("Xem Mèo làm mẫu"): for one fixed sample question, a ghost hand does what a child
// should do, using the same TAP controls a child has (tap a step, tap Chạy; tap a fruit, tap a pan).
// This file only says WHAT to tap and WHAT Mèo says; ui/demo.ts moves the hand and talks.
// It has no DOM code, so it can be unit tested (tests/games.test.ts checks the samples still teach the right thing).
import type { GameId, Position } from "../../core/types.ts";
import { say, type Speech } from "../../i18n/speech.ts";
import type { Dir } from "../../games/robot/logic.ts";
import type { BalanceAnswer } from "../../games/scale/logic.ts";

export interface DemoHelpers {
  /** Mèo says it: caption on screen + voice. Resolves when it has been read (never faster than a child can follow). */
  say(s: Speech): Promise<void>;
  /** The hand moves to the element and taps it (a selector inside the demo, or an element). */
  tap(target: Element | string): Promise<void>;
  pause(ms: number): Promise<void>;
  /** Call BEFORE the tap that submits; the promise resolves when the view has shown the result. */
  expectResult(): Promise<void>;
}

export interface DemoScript<Q, A> {
  /** Which question: generated from this position with this seed, so the demo is always the same. */
  pos: Position;
  seed: number;
  play(h: DemoHelpers, q: Q, answer: A): Promise<void>;
}

const robot: DemoScript<unknown, Dir[]> = {
  pos: { tier: 2, step: 0 },
  seed: 2, // a wall, bricks and a turn: URUUUL
  async play(h, _q, path) {
    await h.say(say("demo_robot_look"));
    for (const d of path) {
      await h.say(say(`demo_robot_${d}` as const));
      await h.tap(`.rb-pad button[data-dir=${d}]`);
    }
    await h.say(say("demo_robot_run"));
    const shown = h.expectResult();
    await h.tap("#run");
    await shown;
    await h.say(say("robot_ok"));
  },
};

const scale: DemoScript<unknown, BalanceAnswer> = {
  pos: { tier: 1, step: 1 },
  seed: 2, // two kinds of fruit and a weight table: one apple and one grape make the left pan as heavy as the right
  async play(h, _q, answer) {
    await h.say(say("demo_scale_key"));
    await h.tap(".sc-key");
    const moves = [
      ...answer.addedLeft.map((kind) => ({ kind, pan: "L" })),
      ...answer.addedRight.map((kind) => ({ kind, pan: "R" })),
    ];
    for (const m of moves) {
      await h.say(say("demo_scale_light"));
      await h.tap(`[data-zone=tray] [data-item][data-k=${m.kind}]`);
      await h.tap(`.sc-pan.${m.pan}`);
    }
    await h.say(say("demo_scale_done"));
    const shown = h.expectResult();
    await h.tap("#xong");
    await shown;
    await h.say(say("scale_ok"));
  },
};

export const DEMOS: Partial<Record<GameId, DemoScript<any, any>>> = { robot, scale };
