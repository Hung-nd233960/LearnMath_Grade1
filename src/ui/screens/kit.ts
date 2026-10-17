// Dev-only component gallery at #/kit: every shared UI piece on one screen, so they can be
// reviewed (and tested in a real browser) before the real screens exist. Not part of the app.
import { dragTap } from "../dragTap.ts";
import { emoji, h } from "../dom.ts";
import { mountAdultGate } from "../adultGate.ts";
import { ICON } from "../icons.ts";
import { mascot, type Mood } from "../mascot.ts";
import { boxValue, createNumpad } from "../numpad.ts";
import { showFeedback, showGuide } from "../overlay.ts";
import type { ScreenDef } from "../router.ts";
import { topbar } from "../topbar.ts";

const abs = (x: number, y: number, extra = "") => `position:absolute;left:${x}px;top:${y}px;${extra}`;

export const kitScreen: ScreenDef = {
  bg: "--home-bg",
  mount({ ctx, screen }) {
    const stage = ctx.stage.el;
    const status = h("div", { id: "kit-status", class: "card", style: abs(40, 590, "width:700px;padding:16px 24px;font:700 22px 'Baloo 2'") }, "—");
    const say = (text: string) => (status.textContent = text);

    const bar = topbar({
      tier: 2, index: 2, length: 5,
      onBack: () => ctx.go("home"),
      onInfo: () => showGuide(stage, ["Nhìn kỹ câu hỏi.", "Kéo hoặc chạm để trả lời.", "Bấm Xong khi em chắc chắn."], () => say("guide closed")),
    });

    const moods: Mood[] = ["normal", "happy", "think", "sleep", "detective"];
    const meos = moods.map((m, i) => {
      const el = mascot(m);
      el.style.cssText = abs(40 + i * 130, 120, "width:110px;height:110px");
      return el;
    });

    // compact demo buttons so all five fit on one row above the drop zones
    const small = "font-size:22px;padding:10px 22px 6px";
    const buttons = h("div", { style: abs(40, 250, "display:flex;gap:14px;width:720px") },
      h("button", { style: small, class: "btn btn-primary", onclick: () => say("primary") }, html5(ICON.check), "Xong"),
      h("button", { style: small, class: "btn btn-secondary", onclick: () => say("secondary") }, "Làm lại"),
      h("button", { style: small, class: "btn btn-secondary", id: "kit-fb-ok", onclick: () => showFeedback(stage, { kind: "correct", title: "Giỏi quá!", message: "Em làm đúng rồi.", onClose: () => say("feedback ok closed") }) }, "Đúng"),
      h("button", { style: small, class: "btn btn-secondary", id: "kit-fb-retry", onclick: () => showFeedback(stage, { kind: "retry", title: "Gần đúng rồi!", message: "Em thử lại nhé.", onClose: () => say("feedback retry closed") }) }, "Thử lại"),
      h("button", { style: small, class: "btn btn-secondary", id: "kit-fb-stars", onclick: () => showFeedback(stage, { kind: "correct", title: "Xong vụ án!", message: "Em được 3 sao.", stars: 3, button: "Về trang chủ" }) }, "3 sao"),
    );

    const zone = (name: string, x: number) =>
      h("div", { class: "card", "data-zone": name, id: `zone-${name}`, style: abs(x, 380, "width:330px;height:170px;display:flex;flex-wrap:wrap;gap:6px;padding:12px;align-content:flex-start") });
    const fruit = (name: string, fixed = false) => h("div", { "data-item": true, "data-fixed": fixed, style: "width:60px;height:60px;display:grid;place-items:center" }, emoji(name, 58));
    const zoneA = zone("A", 40), zoneB = zone("B", 390);
    zoneA.append(fruit("red_apple"), fruit("tangerine"), fruit("grapes"), fruit("banana", true));
    const stopDrag = dragTap({ root: screen, onMove: (item, z) => { z.append(item); say(`moved to ${z.dataset.zone}`); } });

    const boxes = h("div", { style: abs(800, 400, "display:flex;gap:16px") }, h("span", { class: "answer-box", id: "box-a" }), h("span", { class: "answer-box", id: "box-b" }));
    const pad = h("div", { style: abs(800, 130), id: "kit-pad" });

    screen.append(bar.el, ...meos, buttons, zoneA, zoneB, boxes, pad, status);
    const numpad = createNumpad(pad, {
      scope: screen,
      onChange: () => say(`boxes: ${boxValue(boxes.children[0] as HTMLElement) ?? "-"} / ${boxValue(boxes.children[1] as HTMLElement) ?? "-"}`),
    });
    const stopGate = mountAdultGate(screen, () => say("gate opened"));

    return () => {
      stopDrag();
      numpad.dispose();
      stopGate();
    };
  },
};

function html5(svg: string): HTMLElement {
  const s = h("span", { style: "display:contents" });
  s.innerHTML = svg;
  return s;
}
