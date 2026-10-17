// Game views by id. A game's home tile becomes playable when it is listed here AND its
// `ready` flag is set in src/games/index.ts. Add each view as its step in docs/BUILD_PLAN.md is built.
import type { GameId } from "../../core/types.ts";
import { createSplitView } from "./split.ts";
import type { ViewFactory } from "./types.ts";

export const VIEWS: Partial<Record<GameId, ViewFactory>> = {
  split: createSplitView,
};
