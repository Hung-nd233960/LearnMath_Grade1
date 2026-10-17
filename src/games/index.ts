// Registry: everything the shell needs to list and launch the six games.
// Views (src/ui/games/<id>.ts) are added by the UI build — see docs/BUILD_PLAN.md.
import type { GameId, GameLogic, GameText } from "../core/types.ts";
import { basketLogic } from "./basket/logic.ts";
import * as basketText from "./basket/text.ts";
import { compareLogic } from "./compare/logic.ts";
import * as compareText from "./compare/text.ts";
import { equationsLogic } from "./equations/logic.ts";
import * as equationsText from "./equations/text.ts";
import { robotLogic } from "./robot/logic.ts";
import * as robotText from "./robot/text.ts";
import { scaleLogic } from "./scale/logic.ts";
import * as scaleText from "./scale/text.ts";
import { splitLogic } from "./split/logic.ts";
import * as splitText from "./split/text.ts";

export interface GameMeta {
  id: GameId;
  /** Tile title on the homepage. */
  title: string;
  /** CSS custom-property names for the game's page background and homepage tile. */
  bgVar: string;
  tileVar: string;
  /** Fluent Emoji stems for the tile art (first is the main picture). */
  art: string[];
  logic: GameLogic<any, any>;
  text: GameText<any>;
  /** Shown as "Sắp ra mắt" (locked) on the homepage until the view is built. */
  ready: boolean;
}

export const GAMES: GameMeta[] = [
  { id: "scale", title: "Cái cân", bgVar: "--scale-bg", tileVar: "--scale-tile", art: ["balance_scale"], logic: scaleLogic, text: scaleText, ready: false },
  { id: "robot", title: "Rô-bốt", bgVar: "--robot-bg", tileVar: "--robot-tile", art: ["robot", "triangular_flag"], logic: robotLogic, text: robotText, ready: false },
  { id: "basket", title: "Giỏ trái cây", bgVar: "--basket-bg", tileVar: "--basket-tile", art: ["basket", "tangerine"], logic: basketLogic, text: basketText, ready: false },
  { id: "equations", title: "Tính theo hình", bgVar: "--eq-bg", tileVar: "--eq-tile", art: ["red_apple", "pear"], logic: equationsLogic, text: equationsText, ready: false },
  { id: "split", title: "Mấy và mấy", bgVar: "--split-bg", tileVar: "--split-tile", art: ["tulip", "sunflower"], logic: splitLogic, text: splitText, ready: true },
  { id: "compare", title: "So sánh cân", bgVar: "--cmp-bg", tileVar: "--cmp-tile", art: ["wrapped_gift"], logic: compareLogic, text: compareText, ready: false },
];

export function gameById(id: GameId): GameMeta {
  const g = GAMES.find((x) => x.id === id);
  if (!g) throw new Error(`Unknown game ${id}`);
  return g;
}
