// Game 2 — Rô-bốt. Build a list of arrow steps that takes the robot to the flag.
import { MAX_PROGRAM_STEPS } from "../../core/config.ts";
import type { Rng } from "../../core/rng.ts";
import type { CheckResult, GameLogic, Position } from "../../core/types.ts";

export type Dir = "U" | "D" | "L" | "R";
export type Cell = readonly [row: number, col: number];

export interface RobotQuestion {
  size: number;
  start: Cell;
  goal: Cell;
  /** Cells the robot can never enter, as "r,c". */
  blocks: string[];
  /** Walls on cell edges: "r,c,R" = between (r,c) and (r,c+1); "r,c,D" = between (r,c) and (r+1,c). */
  walls: string[];
  /** Fewest steps that reach the flag (for hints and the guide). */
  shortest: number;
  maxSteps: number;
}

export type RobotAnswer = Dir[];

export const STEP: Record<Dir, readonly [number, number]> = { U: [-1, 0], D: [1, 0], L: [0, -1], R: [0, 1] };
const DIRS: Dir[] = ["U", "D", "L", "R"];
const key = (r: number, c: number) => `${r},${c}`;

export function canMove(q: Pick<RobotQuestion, "size" | "blocks" | "walls">, r: number, c: number, d: Dir): boolean {
  const [dr, dc] = STEP[d];
  const nr = r + dr, nc = c + dc;
  if (nr < 0 || nc < 0 || nr >= q.size || nc >= q.size) return false;
  if (q.blocks.includes(key(nr, nc))) return false;
  const w = q.walls;
  if (d === "R" && w.includes(`${r},${c},R`)) return false;
  if (d === "L" && w.includes(`${r},${c - 1},R`)) return false;
  if (d === "D" && w.includes(`${r},${c},D`)) return false;
  if (d === "U" && w.includes(`${r - 1},${c},D`)) return false;
  return true;
}

/** Shortest path as a list of steps, or null if the flag cannot be reached. */
export function shortestPath(q: Pick<RobotQuestion, "size" | "blocks" | "walls" | "start" | "goal">): Dir[] | null {
  const prev = new Map<string, { from: string; d: Dir }>();
  const startK = key(q.start[0], q.start[1]);
  const goalK = key(q.goal[0], q.goal[1]);
  const queue: Cell[] = [q.start];
  const seen = new Set([startK]);
  while (queue.length) {
    const [r, c] = queue.shift()!;
    if (key(r, c) === goalK) break;
    for (const d of DIRS) {
      if (!canMove(q, r, c, d)) continue;
      const nr = r + STEP[d][0], nc = c + STEP[d][1], k = key(nr, nc);
      if (seen.has(k)) continue;
      seen.add(k);
      prev.set(k, { from: key(r, c), d });
      queue.push([nr, nc]);
    }
  }
  if (!seen.has(goalK)) return null;
  const path: Dir[] = [];
  for (let k = goalK; k !== startK; k = prev.get(k)!.from) path.unshift(prev.get(k)!.d);
  return path;
}

export interface Trace {
  /** Cells visited, starting with the start cell. */
  cells: Cell[];
  /** Index of the step that bumped into a wall/edge/block, or -1. */
  crashAt: number;
  reachedGoal: boolean;
}

/** Run a program step by step (the view animates `cells`). */
export function simulate(q: RobotQuestion, program: readonly Dir[]): Trace {
  let [r, c] = q.start;
  const cells: Cell[] = [[r, c]];
  for (let i = 0; i < program.length; i++) {
    const d = program[i]!;
    if (!canMove(q, r, c, d)) return { cells, crashAt: i, reachedGoal: false };
    r += STEP[d][0];
    c += STEP[d][1];
    cells.push([r, c]);
  }
  return { cells, crashAt: -1, reachedGoal: r === q.goal[0] && c === q.goal[1] };
}

interface Cfg { size: number; blocks: [number, number]; walls: [number, number]; path: [number, number]; detour: boolean }
// Per tier and hidden step.
const CFG: Cfg[][] = [
  [
    { size: 4, blocks: [0, 0], walls: [0, 0], path: [2, 2], detour: false },
    { size: 4, blocks: [0, 0], walls: [0, 0], path: [3, 3], detour: false },
    { size: 4, blocks: [0, 1], walls: [0, 0], path: [3, 4], detour: false },
  ],
  [
    { size: 5, blocks: [2, 3], walls: [1, 1], path: [4, 6], detour: false },
    { size: 5, blocks: [3, 4], walls: [1, 2], path: [5, 7], detour: true },
    { size: 5, blocks: [3, 5], walls: [1, 2], path: [6, 8], detour: true },
  ],
  [
    { size: 6, blocks: [4, 6], walls: [2, 3], path: [7, 9], detour: true },
    { size: 6, blocks: [5, 7], walls: [2, 3], path: [8, 10], detour: true },
    { size: 6, blocks: [6, 8], walls: [2, 4], path: [9, 11], detour: true },
  ],
];

const manhattan = (a: Cell, b: Cell) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);

function attempt(cfg: Cfg, rng: Rng): RobotQuestion | null {
  const n = cfg.size;
  const start: Cell = [n - 1, rng.int(0, 1)];
  const goal: Cell = [rng.int(0, Math.max(0, n - 3)), rng.int(0, n - 1)];
  if (manhattan(start, goal) < cfg.path[0] && !cfg.detour) return null;
  const blocks: string[] = [];
  const nb = rng.int(cfg.blocks[0], cfg.blocks[1]);
  while (blocks.length < nb) {
    const r = rng.int(0, n - 1), c = rng.int(0, n - 1), k = key(r, c);
    if (k === key(...start) || k === key(...goal) || blocks.includes(k)) continue;
    blocks.push(k);
  }
  const walls: string[] = [];
  const nw = rng.int(cfg.walls[0], cfg.walls[1]);
  for (let tries = 0; walls.length < nw && tries < 40; tries++) {
    const side = rng.chance(0.5) ? "R" : "D";
    const r = rng.int(0, side === "D" ? n - 2 : n - 1), c = rng.int(0, side === "R" ? n - 2 : n - 1);
    const w = `${r},${c},${side}`;
    if (!walls.includes(w)) walls.push(w);
  }
  const q = { size: n, start, goal, blocks, walls, shortest: 0, maxSteps: MAX_PROGRAM_STEPS };
  const path = shortestPath(q);
  if (!path) return null;
  if (path.length < cfg.path[0] || path.length > cfg.path[1] || path.length > MAX_PROGRAM_STEPS) return null;
  if (cfg.detour && path.length <= manhattan(start, goal)) return null;
  return { ...q, shortest: path.length };
}

export const robotLogic: GameLogic<RobotQuestion, RobotAnswer> = {
  id: "robot",

  generate(pos: Position, rng: Rng): RobotQuestion {
    const row = CFG[pos.tier - 1]!;
    const cfg = row[Math.min(pos.step, row.length - 1)]!;
    for (let i = 0; i < 500; i++) {
      const q = attempt(cfg, rng);
      if (q) return q;
    }
    // Fallback that is always valid: straight up then right, no obstacles.
    const n = cfg.size;
    return { size: n, start: [n - 1, 0], goal: [0, n - 1], blocks: [], walls: [], shortest: 2 * (n - 1), maxSteps: MAX_PROGRAM_STEPS };
  },

  check(q: RobotQuestion, program: RobotAnswer): CheckResult {
    if (!Array.isArray(program) || program.length === 0) return { correct: false, reason: "empty" };
    const t = simulate(q, program);
    if (t.crashAt >= 0) return { correct: false, reason: "blocked", data: { step: t.crashAt + 1 } };
    if (!t.reachedGoal) return { correct: false, reason: "notThere", data: { steps: program.length } };
    return { correct: true, reason: "reached", data: { steps: program.length, shortest: q.shortest } };
  },

  solve: (q) => shortestPath(q) ?? [],
};
