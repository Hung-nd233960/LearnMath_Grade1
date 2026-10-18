// The daily plan: each day a child gets a few games (the teacher sets how many) and plays them one after
// another. "Finishing a game" is finishing one set of 5. Only the next game is open; the others wait.
//
//   Which games: the ones played least recently (never played first); a tie goes to the lower level, then to chance.
//   In what order ("Khởi động"): lowest level first, so progress stays even across games; or shuffled ("Ngẫu nhiên").
//   Leaving a set half-way changes nothing: the game is only done once its set has been recorded.
//   A finished game can be replayed for no credit (see recordPractice in profiles.ts).
//
// Pure: the random generator comes from the caller, and nothing is stored here (the plan lives in the profile).
import type { DayKey } from "./dates.ts";
import { toIndex } from "./difficulty.ts";
import type { Profile } from "./profiles.ts";
import type { Rng } from "./rng.ts";
import type { DailyOrder, DailySettings } from "./settings.ts";
import type { GameId } from "./types.ts";

export interface DailyPlan {
  day: DayKey;
  /** Today's games, in the order they are played. */
  games: GameId[];
  /** The ones whose set has been finished today, in the order they were finished. */
  done: GameId[];
}

/** "open": there is no plan (the teacher switched it off), so every game is open. */
export type TileState = "next" | "done" | "later" | "notToday" | "open";

export const MAX_GAMES_PER_DAY = 6;

export interface GameStat {
  id: GameId;
  lastPlayed: DayKey | null;
  /** Position on the difficulty ladder, 0 (Vòng 1, step 0) to 8. */
  index: number;
}

export function gameStats(p: Profile, eligible: readonly GameId[]): GameStat[] {
  return eligible.map((id) => ({ id, lastPlayed: p.games[id].lastPlayed, index: toIndex(p.games[id].seed) }));
}

/** Pick `n` games (the least recently played) and put them in order. */
export function chooseGames(stats: readonly GameStat[], n: number, order: DailyOrder, rng: Rng): GameId[] {
  const tie = new Map(stats.map((s) => [s.id, rng.next()]));
  const t = (id: GameId) => tie.get(id)!;
  const picked = [...stats]
    .sort((a, b) => (a.lastPlayed ?? "").localeCompare(b.lastPlayed ?? "") || a.index - b.index || t(a.id) - t(b.id))
    .slice(0, Math.max(0, n));
  if (order === "random") return rng.shuffle(picked.map((s) => s.id));
  return picked.sort((a, b) => a.index - b.index || t(a.id) - t(b.id)).map((s) => s.id);
}

/**
 * Today's plan for a child, or null when the plan is switched off. The same plan comes back all day (the very same
 * object while nothing changed, so the caller can tell whether to save). If the teacher changes the number of games
 * during the day, games already played keep their place: more games are added at the end, fewer ones drop from the end.
 */
export function ensurePlan(p: Profile, daily: DailySettings, today: DayKey, eligible: readonly GameId[], rng: Rng): DailyPlan | null {
  if (daily.gamesPerDay <= 0) return null;
  const want = Math.min(daily.gamesPerDay, eligible.length);
  const cur = p.plan;
  if (!cur || cur.day !== today) {
    return { day: today, games: chooseGames(gameStats(p, eligible), want, daily.order, rng), done: [] };
  }
  const games = cur.games.filter((g) => eligible.includes(g));
  const done = cur.done.filter((g) => games.includes(g));
  if (games.length === want && games.length === cur.games.length && done.length === cur.done.length) return cur;
  if (games.length < want) {
    const more = chooseGames(gameStats(p, eligible).filter((s) => !games.includes(s.id)), want - games.length, daily.order, rng);
    return { day: today, games: [...games, ...more], done };
  }
  // fewer games than before: drop unfinished ones from the end (finished ones always stay)
  const kept = games.slice();
  for (let i = kept.length - 1; i >= 0 && kept.length > want; i--) if (!done.includes(kept[i]!)) kept.splice(i, 1);
  return { day: today, games: kept, done };
}

/** The game the child plays now, or null when today's games are all done. */
export function nextGame(plan: DailyPlan): GameId | null {
  return plan.games.find((g) => !plan.done.includes(g)) ?? null;
}

export function tileState(plan: DailyPlan | null, game: GameId): TileState {
  if (!plan) return "open";
  if (plan.done.includes(game)) return "done";
  if (!plan.games.includes(game)) return "notToday";
  return nextGame(plan) === game ? "next" : "later";
}

/** Mark a game finished. Only the next game can be finished: anything else changes nothing. */
export function markDone(plan: DailyPlan, game: GameId): DailyPlan {
  return nextGame(plan) === game ? { ...plan, done: [...plan.done, game] } : plan;
}

export const planComplete = (plan: DailyPlan): boolean => nextGame(plan) === null;
