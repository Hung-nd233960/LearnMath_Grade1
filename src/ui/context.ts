import type { sfx } from "../audio/sfx.ts";
import type { Voice } from "../audio/voice.ts";
import type { DayKey } from "../core/dates.ts";
import type { Store } from "../core/storage.ts";
import type { Stage } from "./stage.ts";

/** Everything a screen needs. Built once by startApp() and passed to every screen. */
export interface AppContext {
  store: Store;
  voice: Voice;
  sfx: typeof sfx;
  stage: Stage;
  /** Navigate: go("home"), go("play/split"), go("teacher"). */
  go(path: string): void;
  /** Current time and local day; use these (not Date) so they can be faked in tests/dev. */
  now(): number;
  today(): DayKey;
}
