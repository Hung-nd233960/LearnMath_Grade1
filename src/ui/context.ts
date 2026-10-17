import type { sfx } from "../audio/sfx.ts";
import type { Voice } from "../audio/voice.ts";
import type { DayKey } from "../core/dates.ts";
import type { SetSummary } from "../core/session.ts";
import type { Store } from "../core/storage.ts";
import type { GameId } from "../core/types.ts";
import type { Stage } from "./stage.ts";
import type { Timekeeper } from "./timekeeper.ts";

/** The set that just finished, handed from the play screen to the star screen. */
export interface SetResult {
  game: GameId;
  summary: SetSummary;
  /** Days in a row with a star, after this set. */
  streak: number;
  /** This set earned the first star of the day (the streak just grew or started). */
  firstStarToday: boolean;
}

/** Everything a screen needs. Built once by startApp() and passed to every screen. */
export interface AppContext {
  store: Store;
  voice: Voice;
  sfx: typeof sfx;
  stage: Stage;
  /** Screen-time clock: usage, breaks, locks, idle. */
  time: Timekeeper;
  /** Navigate: go("home"), go("play/split"), go("teacher"). */
  go(path: string): void;
  /** Result of the last finished set; read by the star screen. */
  lastSet: SetResult | null;
  /** Current time and local day; use these (not Date) so they can be faked in tests/dev. */
  now(): number;
  today(): DayKey;
}
