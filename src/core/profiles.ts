// Child profiles and their progress. Pure functions over AppData (see storage.ts).
// Shapes are kept JSON-friendly so a backend can sync them later without changes.
import { SESSION_HISTORY_MAX } from "./config.ts";
import { addDays, weekdayIndex, isWeekend, type DayKey } from "./dates.ts";
import { START_POSITION, normalize } from "./difficulty.ts";
import { currentStreak, EMPTY_STREAK, recordStarDay, type Streak } from "./rewards.ts";
import { newUsage, type Usage } from "./screentime.ts";
import type { SetSummary } from "./session.ts";
import type { Settings } from "./settings.ts";
import { GAME_IDS, type GameId, type Position } from "./types.ts";

export interface GameProgress {
  /** Where the next set starts. */
  seed: Position;
  sets: number;
  bestStars: 0 | 1 | 2 | 3;
  /** The guide (i) auto-plays until this is true. */
  seenGuide: boolean;
  lastPlayed: DayKey | null;
}

export interface SessionRecord {
  game: GameId;
  day: DayKey;
  at: number;
  seed: Position;
  score: number;
  total: number;
  stars: 1 | 2 | 3;
  peakTier: number;
}

export interface Profile {
  id: string;
  name: string;
  /** Fluent Emoji file stem, e.g. "rocket" → /assets/emoji/rocket_3d.png */
  avatar: string;
  createdAt: number;
  stars: number;
  /** Stars per day, last 14 days only. */
  starsByDay: Record<DayKey, number>;
  streak: Streak;
  games: Record<GameId, GameProgress>;
  history: SessionRecord[];
  usage: Usage;
}

export const AVATARS = ["rocket", "rainbow", "strawberry", "soccer_ball", "sun_with_face", "kite", "cherry_blossom", "star", "teddy_bear", "seedling"] as const;

function newGameProgress(): GameProgress {
  return { seed: { ...START_POSITION }, sets: 0, bestStars: 0, seenGuide: false, lastPlayed: null };
}

export function emptyGames(): Record<GameId, GameProgress> {
  return Object.fromEntries(GAME_IDS.map((g) => [g, newGameProgress()])) as Record<GameId, GameProgress>;
}

export function newId(): string {
  return "p_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function createProfile(name: string, avatar: string, now: number, today: DayKey, id: string = newId()): Profile {
  return {
    id,
    name: name.trim().slice(0, 20) || "Bạn nhỏ",
    avatar,
    createdAt: now,
    stars: 0,
    starsByDay: {},
    streak: { ...EMPTY_STREAK },
    games: emptyGames(),
    history: [],
    usage: newUsage(today, now),
  };
}

/** Fill missing fields of a stored profile (older save, partial import). */
export function repairProfile(p: Partial<Profile> & { id: string }, now: number, today: DayKey): Profile {
  const base = createProfile(p.name ?? "Bạn nhỏ", p.avatar ?? AVATARS[0], p.createdAt ?? now, today, p.id);
  const games = emptyGames();
  for (const g of GAME_IDS) {
    const old = p.games?.[g];
    if (old) games[g] = { ...newGameProgress(), ...old, seed: normalize(old.seed) };
  }
  return {
    ...base,
    ...p,
    starsByDay: p.starsByDay ?? {},
    streak: p.streak ?? { ...EMPTY_STREAK },
    games,
    history: Array.isArray(p.history) ? p.history : [],
    usage: p.usage ?? base.usage,
  } as Profile;
}

/** Apply a finished set to a profile. Returns a new profile. */
export function recordSet(p: Profile, game: GameId, s: SetSummary, settings: Settings, now: number, today: DayKey): Profile {
  const g = p.games[game];
  const starsByDay = { ...p.starsByDay, [today]: (p.starsByDay[today] ?? 0) + s.stars };
  for (const day of Object.keys(starsByDay)) if (day < addDays(today, -13)) delete starsByDay[day];
  const record: SessionRecord = { game, day: today, at: now, seed: s.seed, score: s.score, total: s.total, stars: s.stars, peakTier: s.peakTier };
  return {
    ...p,
    stars: p.stars + s.stars,
    starsByDay,
    streak: recordStarDay(p.streak, today, settings.skipWeekends),
    games: {
      ...p.games,
      [game]: { ...g, seed: s.nextSeed, sets: g.sets + 1, bestStars: Math.max(g.bestStars, s.stars) as GameProgress["bestStars"], lastPlayed: today },
    },
    history: [...p.history, record].slice(-SESSION_HISTORY_MAX),
  };
}

export function markGuideSeen(p: Profile, game: GameId): Profile {
  return { ...p, games: { ...p.games, [game]: { ...p.games[game], seenGuide: true } } };
}

export function starsToday(p: Profile, today: DayKey): number {
  return p.starsByDay[today] ?? 0;
}

export function streakToday(p: Profile, today: DayKey, settings: Settings): number {
  return currentStreak(p.streak, today, settings.skipWeekends);
}

export type WeekDayStatus = "star" | "today" | "missed" | "off" | "future";

/** Monday…Sunday of the current week for the homepage strip (T2 … CN). */
export function weekStrip(p: Profile, today: DayKey, settings: Settings): { day: DayKey; status: WeekDayStatus }[] {
  const monday = addDays(today, -weekdayIndex(today));
  return Array.from({ length: 7 }, (_, i) => {
    const day = addDays(monday, i);
    const got = (p.starsByDay[day] ?? 0) > 0;
    let status: WeekDayStatus;
    if (got) status = "star";
    else if (day === today) status = "today";
    else if (day > today) status = "future";
    else if (settings.skipWeekends && isWeekend(day)) status = "off";
    else status = "missed";
    return { day, status };
  });
}
