// Temporary screen for step 1 of docs/BUILD_PLAN.md. Replaced by the real home screen in step 2.
import { STR } from "../../i18n/ui.ts";
import { h } from "../dom.ts";
import { mascot } from "../mascot.ts";
import type { ScreenDef } from "../router.ts";

export const placeholderScreen: ScreenDef = {
  mount({ screen }) {
    screen.append(h("div", { class: "placeholder" }, mascot("detective"), h("h1", null, STR.placeholderTitle), h("p", null, STR.placeholderBody)));
  },
};
