// View for "Rô-bốt": build a list of arrow steps, press "Chạy!", and watch the robot walk it.
//   Vòng 1  an open 4×4 board         Vòng 2  walls (red bars) and bricks it cannot enter
//   Vòng 3  a bigger board, longer paths, more obstacles
// The walk is animated from simulate(), the same function that judges the answer, so what the
// child sees is exactly what is checked.
import { say } from "../../i18n/speech.ts";
import { STR } from "../../i18n/ui.ts";
import { simulate, STEP, type Dir, type RobotAnswer, type RobotQuestion } from "../../games/robot/logic.ts";
import { emoji, emojiSrc, h, wait } from "../dom.ts";
import { ARROW } from "../icons.ts";
import type { GameView } from "./types.ts";
import "./robot.css";

const GAP = 8;
const STEP_MS = 450;
const DIR_CLASS: Record<Dir, string> = { U: "u", L: "l", D: "d", R: "r" };
const KEY_TO_DIR: Record<string, Dir> = { ArrowUp: "U", ArrowDown: "D", ArrowLeft: "L", ArrowRight: "R" };

export function createRobotView(): GameView<RobotQuestion, RobotAnswer> {
  let q: RobotQuestion;
  let cellSize = 0;
  let bot: HTMLElement;
  let board: HTMLElement;
  let slotsEl: HTMLElement;
  let program: Dir[] = [];
  let busy = false;
  let onKey: ((e: KeyboardEvent) => void) | null = null;
  let api: Parameters<GameView<RobotQuestion, RobotAnswer>["mount"]>[2];
  let cells: Record<string, HTMLElement> = {};

  const origin = (r: number, c: number) => ({ x: c * (cellSize + GAP), y: r * (cellSize + GAP) });

  /** Put the robot on a cell; `nudge` leans it towards a direction (a bump into a wall). */
  function place(r: number, c: number, nudge?: Dir) {
    const { x, y } = origin(r, c);
    const dx = nudge ? STEP[nudge][1] * cellSize * 0.3 : 0;
    const dy = nudge ? STEP[nudge][0] * cellSize * 0.3 : 0;
    bot.style.transform = `translate(${x + dx}px, ${y + dy}px)`;
    if (!nudge) bot.dataset.rc = `${r},${c}`;
  }

  function paintSlots(running = -1) {
    slotsEl.replaceChildren(...Array.from({ length: q.maxSteps }, (_, i) => {
      const dir = program[i];
      const slot = h("button", { class: `rb-slot${dir ? " on" : ""}${i === running ? " run" : ""}`, "data-i": i, "data-dir": dir ?? null, tabindex: -1 });
      if (dir) slot.innerHTML = ARROW[dir];
      // tapping the LAST step takes it back (an undo, so a small mistake does not mean starting over)
      if (dir && i === program.length - 1) slot.addEventListener("click", () => { if (!busy) { program.pop(); paintSlots(); } });
      return slot;
    }));
  }

  const addStep = (d: Dir) => {
    if (busy || program.length >= q.maxSteps) return;
    program.push(d);
    paintSlots();
  };

  /** Animate a program on the board, following simulate(). Ends with the robot where the walk ended (or back at the start after a bump). */
  async function walk(steps: readonly Dir[]) {
    const trace = simulate(q, steps);
    place(q.start[0], q.start[1]);
    await wait(250);
    for (let i = 0; i < steps.length; i++) {
      paintSlots(i);
      if (i === trace.crashAt) {
        const [r, c] = trace.cells[i]!;
        place(r, c, steps[i]);
        await wait(220);
        place(r, c);
        board.classList.add("shake");
        const [br, bc] = [r + STEP[steps[i]!][0], c + STEP[steps[i]!][1]];
        cells[`${br},${bc}`]?.classList.add("bad"); // bumping into a brick turns it red for a moment
        await wait(500);
        board.classList.remove("shake");
        cells[`${br},${bc}`]?.classList.remove("bad");
        place(q.start[0], q.start[1]);
        paintSlots();
        return trace;
      }
      const [r, c] = trace.cells[i + 1]!;
      place(r, c);
      await wait(STEP_MS);
    }
    paintSlots();
    return trace;
  }

  return {
    mount(root, question, a) {
      q = question;
      api = a;
      program = [];
      busy = false;
      cells = {};
      cellSize = (560 - GAP * (q.size - 1)) / q.size;

      const grid = h("div", { class: "rb-grid" });
      for (let r = 0; r < q.size; r++) {
        for (let c = 0; c < q.size; c++) {
          const isGoal = r === q.goal[0] && c === q.goal[1];
          const isBlock = q.blocks.includes(`${r},${c}`);
          const cell = h("div", { class: `rb-cell${isGoal ? " goal" : ""}${isBlock ? " block" : ""}`, "data-rc": `${r},${c}` },
            isGoal ? emoji("triangular_flag", cellSize * 0.66) : isBlock ? emoji("brick", cellSize * 0.62) : null);
          const { x, y } = origin(r, c);
          cell.style.cssText = `left:${x}px;top:${y}px;width:${cellSize}px;height:${cellSize}px`;
          cells[`${r},${c}`] = cell;
          grid.append(cell);
        }
      }
      for (const w of q.walls) {
        const [r, c, side] = w.split(",");
        const { x, y } = origin(Number(r), Number(c));
        const wall = h("div", { class: "rb-wall", "data-wall": w });
        wall.style.cssText = side === "R"
          ? `left:${x + cellSize + GAP / 2 - 6}px;top:${y - 4}px;width:12px;height:${cellSize + 8}px`
          : `left:${x - 4}px;top:${y + cellSize + GAP / 2 - 6}px;width:${cellSize + 8}px;height:12px`;
        grid.append(wall);
      }
      bot = h("div", { class: "rb-bot", id: "bot" }, h("img", { src: emojiSrc("robot"), alt: "" }));
      bot.style.cssText = `width:${cellSize * 0.82}px;height:${cellSize * 0.82}px;left:${cellSize * 0.09}px;top:${cellSize * 0.09}px`;
      bot.dataset.start = `${q.start[0]},${q.start[1]}`;
      grid.append(bot);
      board = h("div", { class: "rb-board" }, grid);

      slotsEl = h("div", { class: "rb-slots" });
      const pad = h("div", { class: "rb-pad" },
        ...(["U", "L", "D", "R"] as const).map((d) => {
          const b = h("button", { class: DIR_CLASS[d], "data-dir": d, title: STR.dirTitle[d], onclick: () => addStep(d) });
          b.innerHTML = ARROW[d];
          return b;
        }));
      const clear = h("button", { class: "btn btn-secondary", id: "clear", onclick: () => { if (busy) return; program = []; paintSlots(); place(q.start[0], q.start[1]); } }, STR.clearProgram);
      const run = h("button", { class: "btn btn-primary", id: "run" }, STR.run);
      run.addEventListener("click", () => {
        if (busy) return;
        if (!program.length) {
          // nothing to run yet: a nudge, not a wrong try
          pad.classList.add("shake");
          setTimeout(() => pad.classList.remove("shake"), 450);
          api.speak(say("robot_empty"));
          return;
        }
        busy = true;
        api.submit([...program]);
      });
      const side = h("div", { class: "rb-side" },
        h("div", { class: "rb-prog card" }, h("h3", null, STR.robotSteps), slotsEl),
        pad,
        h("div", { class: "rb-actions" }, clear, run));

      root.append(h("div", { class: "rb" }, board, side));
      paintSlots();
      place(q.start[0], q.start[1]);

      onKey = (e) => {
        const d = KEY_TO_DIR[e.key];
        if (d) addStep(d);
        else if (e.key === "Backspace" && !busy && program.length) { program.pop(); paintSlots(); }
      };
      document.addEventListener("keydown", onKey);
    },

    async playResult(fb) {
      const trace = await walk(program);
      if (fb.result.correct) {
        cells[`${q.goal[0]},${q.goal[1]}`]?.classList.add("ok");
        bot.classList.add("hop");
        await wait(1000);
      } else if (trace.crashAt < 0) {
        await wait(700); // it stopped somewhere else: let the child see where
      }
    },

    reset() {
      // keep the program so the child can fix it (tap the last step to undo, or "Làm lại" to start over)
      place(q.start[0], q.start[1]);
      busy = false;
      paintSlots();
    },

    async reveal(answer) {
      busy = true;
      program = [...answer].slice(0, q.maxSteps);
      paintSlots();
      await walk(program);
      cells[`${q.goal[0]},${q.goal[1]}`]?.classList.add("ok");
      await wait(1000);
    },

    unmount() {
      if (onKey) document.removeEventListener("keydown", onKey);
      onKey = null;
    },
  };
}
