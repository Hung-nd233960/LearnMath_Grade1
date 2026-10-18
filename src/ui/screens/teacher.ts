// The teacher area (#/teacher): PIN gate, then four tabs — Hiệu ứng, Thời gian chơi, Học sinh, Sao lưu.
// Everything an adult can change lives here and nowhere on a child's screen. The PIN keeps children
// out; it is not real security (docs/RULES.md).
import { choosePack, coverage, DEVICE_PACK } from "../../audio/packs.ts";
import { nextGame } from "../../core/dailyPlan.ts";
import { FX_PRESETS, matchingPreset, MAX_DAILY_GAMES, type DailyOrder, type DailySettings, type Fx, type FxPreset } from "../../core/settings.ts";
import { streakToday } from "../../core/profiles.ts";
import { checkPin, makePin } from "../../core/pin.ts";
import {
  afterPinAttempt, isDefaultPin, LIMIT_RANGES, NO_ATTEMPTS, pinBlocked, setLimit, type LimitKey,
} from "../../core/teacher.ts";
import { exportJSON, importJSON } from "../../core/storage.ts";
import { GAMES } from "../../games/index.ts";
import { say } from "../../i18n/speech.ts";
import { STR } from "../../i18n/ui.ts";
import { avatarBadge } from "../avatars.ts";
import type { AppContext } from "../context.ts";
import { emoji, h, type Child, type Cleanup } from "../dom.ts";
import { openOverlay, type Overlay } from "../overlay.ts";
import { createPinPad } from "../pinPad.ts";
import type { ScreenDef } from "../router.ts";
import { teacherSession } from "../teacherSession.ts";
import { backButton } from "../topbar.ts";
import { openAddProfile, openEditProfile } from "./addProfile.ts";
import "./teacher.css";

const T = STR.teacher;

/** Wrong PINs are counted across visits, so leaving and re-entering does not start the count again. */
let attempts = NO_ATTEMPTS;

type Tab = "fx" | "voice" | "time" | "kids" | "backup";
const TABS: { id: Tab; icon: string }[] = [
  { id: "fx", icon: "sparkles" },
  { id: "voice", icon: "studio_microphone" },
  { id: "time", icon: "hourglass_not_done" },
  { id: "kids", icon: "glowing_star" },
  { id: "backup", icon: "package" },
];

/** A small dialog on top of the area: a title, some words and buttons. Resolves with the button's value. */
function dialog<V>(ctx: AppContext, title: string, body: Child, buttons: { label: string; value: V; kind?: "primary" | "secondary" | "danger" }[]): Promise<V | null> {
  return new Promise((resolve) => {
    let overlay: Overlay | null = null;
    const done = (v: V | null) => { resolve(v); overlay?.close(); };
    const card = h("div", { class: "card t-dialog" },
      h("h2", null, title),
      typeof body === "string" ? h("p", null, body) : body,
      h("div", { class: "t-dialog-actions" },
        ...buttons.map((b) => h("button", { class: `btn btn-${b.kind === "secondary" ? "secondary" : b.kind === "danger" ? "danger" : "primary"}`, onclick: () => done(b.value) }, b.label))));
    overlay = openOverlay(ctx.stage.el, card, () => resolve(null));
    overlay.el.classList.add("overlay-top");
  });
}

const notice = (ctx: AppContext, title: string, body: string) => dialog(ctx, title, body, [{ label: T.ok, value: true }]);

/** The "change PIN" flow: new code, then the same code again. */
function openChangePin(ctx: AppContext, onChanged: () => void): void {
  let first: string | null = null;
  const label = h("p", { class: "t-pin-label" }, T.pinNew);
  const err = h("div", { class: "t-err" });
  const pad = createPinPad((pin) => {
    if (first === null) {
      first = pin;
      label.textContent = T.pinAgain;
      err.textContent = "";
      pad.reset();
    } else if (pin === first) {
      ctx.store.update((d) => ({ ...d, settings: { ...d.settings, pin: makePin(pin) } }));
      overlay.close();
      onChanged();
      void notice(ctx, T.pinTitle, T.pinChanged);
    } else {
      first = null;
      label.textContent = T.pinNew;
      err.textContent = T.pinMismatch;
      pad.fail();
    }
  });
  const card = h("div", { class: "card t-dialog t-pin-dialog" },
    h("h2", null, T.changeNow), label, pad.el, err,
    h("div", { class: "t-dialog-actions" }, h("button", { class: "btn btn-secondary", "data-close": true }, STR.cancel)));
  const overlay = openOverlay(ctx.stage.el, card, () => pad.dispose());
  overlay.el.classList.add("overlay-top");
}

export const teacherScreen: ScreenDef = {
  bg: "--teacher-bg",
  decor: null,
  mount({ ctx, screen }) {
    screen.classList.add("screen-teacher");
    let tab: Tab = "fx";
    let inArea = false;
    let viewCleanup: Cleanup | null = null;
    const timers = new Set<number>();
    const later = (fn: () => void, ms: number) => {
      const t = window.setTimeout(() => { timers.delete(t); fn(); }, ms);
      timers.add(t);
    };

    const leaveView = () => {
      viewCleanup?.();
      viewCleanup = null;
    };

    // ---------------------------------------------------------------- PIN gate
    const showGate = () => {
      leaveView();
      inArea = false;
      teacherSession.lock();
      const err = h("div", { class: "t-err", id: "pin-error" });
      const pad = createPinPad((pin) => {
        const now = ctx.now();
        if (pinBlocked(attempts, now)) return;
        const ok = checkPin(ctx.store.data.settings.pin, pin);
        attempts = afterPinAttempt(attempts, ok, now);
        if (ok) {
          teacherSession.touch(now);
          showArea();
          return;
        }
        ctx.sfx.play("oops");
        pad.fail();
        if (pinBlocked(attempts, now)) {
          const wait = Math.ceil((attempts.blockedUntil! - now) / 1000);
          err.textContent = T.pinWait(wait);
          pad.setDisabled(true);
          later(() => { pad.setDisabled(false); err.textContent = ""; }, attempts.blockedUntil! - now);
        } else {
          err.textContent = T.pinWrong;
        }
      });
      if (pinBlocked(attempts, ctx.now())) {
        // still waiting from an earlier visit
        const left = attempts.blockedUntil! - ctx.now();
        err.textContent = T.pinWait(Math.ceil(left / 1000));
        pad.setDisabled(true);
        later(() => { pad.setDisabled(false); err.textContent = ""; }, left);
      }
      screen.replaceChildren(
        h("div", { class: "t-back" }, backButton(() => ctx.go("home"))),
        h("div", { class: "t-gate" },
          h("div", { class: "card t-gate-card" }, h("h2", null, T.title), h("p", null, T.gateSub), pad.el, err)));
      viewCleanup = pad.dispose;
    };

    // ---------------------------------------------------------------- the area
    const showArea = () => {
      leaveView();
      inArea = true;
      const panel = h("div", { class: "card t-panel", id: "t-panel" });
      const nav = h("nav", { class: "t-nav" }, ...TABS.map(({ id, icon }) =>
        h("button", { "data-tab": id, onclick: () => { tab = id; renderTab(); } }, emoji(icon, 34), T.tabs[id])));
      const lock = h("button", { class: "t-lock", id: "t-lock", onclick: () => showGate() }, emoji("locked", 28), T.lockAgain);
      screen.replaceChildren(
        h("div", { class: "t-head" }, backButton(() => ctx.go("home")), h("h1", null, T.title), lock),
        nav,
        panel);

      const renderTab = () => {
        nav.querySelectorAll("button").forEach((b) => b.classList.toggle("on", b.dataset.tab === tab));
        const body = { fx: fxTab, voice: voiceTab, time: timeTab, kids: kidsTab, backup: backupTab }[tab]();
        const settings = ctx.store.data.settings;
        panel.replaceChildren(body);
        if (isDefaultPin(settings.pin)) {
          panel.prepend(h("div", { class: "t-warn", id: "t-default-pin" }, h("span", null, T.defaultPinWarn), h("button", { class: "btn btn-secondary", onclick: () => openChangePin(ctx, renderTab) }, T.changeNow)));
        }
      };

      // ---- Hiệu ứng
      const fxTab = (): HTMLElement => {
        const fxNow = () => ctx.store.data.settings.fx;
        const setFx = (fx: Fx) => ctx.store.update((d) => ({ ...d, settings: { ...d.settings, fx } }));
        const presetIcons: Record<FxPreset, string> = { calm: "seedling", mid: "sparkles", all: "party_popper" };
        const presets = h("div", { class: "presets" }, ...(Object.keys(FX_PRESETS) as FxPreset[]).map((name) =>
          h("button", { "data-preset": name, onclick: () => { setFx({ ...FX_PRESETS[name] }); sync(); ctx.sfx.play("win"); } }, emoji(presetIcons[name], 34), T.presets[name])));
        const rows = (Object.keys(T.fxRows) as (keyof Fx)[]).map((key) => {
          const [title, sub] = T.fxRows[key];
          const input = h("input", { type: "checkbox", "data-fx": key });
          input.addEventListener("change", () => { setFx({ ...fxNow(), [key]: input.checked }); sync(); });
          return h("label", { class: "sw" }, h("span", null, h("b", null, title), h("small", null, sub)), input, h("i"));
        });
        const sync = () => {
          const fx = fxNow();
          rows.forEach((r) => { const i = r.querySelector("input")!; i.checked = fx[i.dataset.fx as keyof Fx]; });
          presets.querySelectorAll<HTMLElement>("[data-preset]").forEach((b) => b.classList.toggle("on", b.dataset.preset === matchingPreset(fx)));
        };
        sync();
        return h("div", { class: "settings" }, h("h2", null, T.fxTitle), h("p", { class: "sub" }, T.fxSub), presets, ...rows, h("p", { class: "note" }, T.fxNote));
      };

      // ---- Giọng nói: the voice pack
      const voiceTab = (): HTMLElement => {
        const packs = [...ctx.voicePacks].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
        const chosen = () => choosePack(ctx.store.data.settings.voicePack, packs);
        const sample = say("hello", "give_meo", 13, "fruit_cam");
        const cards = [
          { id: DEVICE_PACK, name: T.deviceName, note: T.deviceNote, have: null as number | null, total: 0 },
          ...packs.map((p) => ({ id: p.id, name: p.name, note: p.note, ...(() => { const c = coverage(p); return { have: c.have as number | null, total: c.total }; })() })),
        ];
        const radios: HTMLInputElement[] = [];
        const rows = cards.map((c) => {
          const empty = c.have === 0;
          const radio = h("input", { type: "radio", name: "voicepack", value: c.id, "data-pack": c.id });
          radio.disabled = empty;
          radio.addEventListener("change", () => { ctx.store.update((d) => ({ ...d, settings: { ...d.settings, voicePack: c.id } })); sync(); });
          radios.push(radio);
          const stat = c.have === null ? null
            : empty ? h("span", { class: "t-pack-stat warn" }, T.packEmpty)
            : h("span", { class: `t-pack-stat${c.have < c.total ? " warn" : ""}` }, T.packCoverage(c.have, c.total), c.have < c.total ? ` · ${T.packMissing(c.total - c.have)}` : "");
          const listen = h("button", { class: "t-mini", "data-listen": c.id, onclick: (e: Event) => { e.preventDefault(); void ctx.voice.play(sample, c.id, true); } }, T.packListen);
          listen.disabled = empty;
          return h("label", { class: `t-pack${empty ? " off" : ""}`, "data-pack-card": c.id }, radio, h("i"),
            h("span", { class: "t-pack-body" }, h("b", null, c.name), h("small", null, c.note), stat), listen);
        });
        const now = h("span", { id: "t-pack-now" });
        const reset = h("button", { class: "t-mini", id: "t-pack-reset", onclick: () => { ctx.store.update((d) => ({ ...d, settings: { ...d.settings, voicePack: null } })); sync(); } }, T.packReset);
        const sync = () => {
          const id = chosen();
          radios.forEach((r) => (r.checked = r.value === id));
          const name = cards.find((c) => c.id === id)?.name ?? id;
          now.textContent = `${T.packNow}: ${name}. ${T.packDefaultNote}`;
          reset.hidden = ctx.store.data.settings.voicePack === null;
        };
        sync();
        return h("div", { class: "t-voice" }, h("h2", null, T.voiceTitle), h("p", { class: "sub" }, T.voiceSub), h("div", { class: "t-pack-now" }, now, reset), ...rows, h("p", { class: "note" }, T.packFolder));
      };

      // ---- Thời gian chơi
      const timeTab = (): HTMLElement => {
        const limits = () => ctx.store.data.settings.limits;
        const slider = (key: LimitKey, label: string, show: (n: number) => string) => {
          const r = LIMIT_RANGES[key];
          const out = h("output", null, show(limits()[key]));
          const input = h("input", { type: "range", min: r.min, max: r.max, step: r.step, value: limits()[key], "data-limit": key });
          input.addEventListener("input", () => {
            ctx.store.update((d) => ({ ...d, settings: { ...d.settings, limits: setLimit(d.settings.limits, key, Number(input.value)) } }));
            out.textContent = show(limits()[key]);
          });
          return h("div", { class: "rng" }, h("span", { class: "rng-name" }, label), out, input);
        };
        const weekend = h("input", { type: "checkbox", id: "t-weekend" });
        weekend.checked = ctx.store.data.settings.skipWeekends;
        weekend.addEventListener("change", () => ctx.store.update((d) => ({ ...d, settings: { ...d.settings, skipWeekends: weekend.checked } })));

        return h("div", null,
          h("h2", null, T.timeTitle), h("p", { class: "sub" }, T.timeSub),
          todayBox(),
          dailyBox(),
          slider("sessionMin", T.sessionLabel, T.minutes),
          slider("breakMin", T.breakLabel, T.minutes),
          slider("dailyMin", T.dailyLabel, T.minutes),
          slider("idleNudgeSec", T.idleLabel, T.seconds),
          h("label", { class: "sw" }, h("span", null, h("b", null, T.weekendTitle), h("small", null, T.weekendSub)), weekend, h("i")));
      };

      /** How many games a child plays per day, and in what order (core/dailyPlan.ts). */
      const dailyBox = (): HTMLElement => {
        const daily = () => ctx.store.data.settings.daily;
        const set = (patch: Partial<DailySettings>) => {
          ctx.store.update((d) => ({ ...d, settings: { ...d.settings, daily: { ...d.settings.daily, ...patch } } }));
          draw();
        };
        const counts = Array.from({ length: MAX_DAILY_GAMES + 1 }, (_, n) =>
          h("button", { class: "t-seg", "data-daily": n, onclick: () => set({ gamesPerDay: n }) }, n === 0 ? T.dailyOff : String(n)));
        const orderButton = (value: DailyOrder, title: string, sub: string) =>
          h("button", { class: "t-opt", "data-order": value, onclick: () => set({ order: value }) }, h("b", null, title), h("small", null, sub));
        const orders = [orderButton("warmup", T.orderWarm, T.orderWarmSub), orderButton("random", T.orderRandom, T.orderRandomSub)];
        const note = h("p", { class: "note", id: "t-daily-note" });
        const draw = () => {
          const d = daily();
          counts.forEach((b) => b.classList.toggle("on", Number(b.dataset.daily) === d.gamesPerDay));
          orders.forEach((b) => { b.classList.toggle("on", b.dataset.order === d.order); b.disabled = d.gamesPerDay === 0; });
          note.textContent = d.gamesPerDay === 0 ? T.dailyOffNote : T.dailyOn(d.gamesPerDay);
        };
        draw();
        return h("div", { class: "t-daily" }, h("h3", null, T.dailyTitle), h("p", { class: "sub" }, T.dailySub),
          h("div", { class: "t-segs" }, ...counts), note, h("h3", null, T.orderTitle), h("div", { class: "t-opts" }, ...orders));
      };

      /** The child who is playing now: how long they have played, and the adult's extra-time buttons. */
      const todayBox = (): HTMLElement => {
        const profile = ctx.store.activeProfile;
        if (!profile) return h("div", { class: "t-today" }, h("p", { class: "note" }, T.nobodyPlaying));
        const status = h("p", { class: "t-status", id: "t-status" });
        const msg = h("p", { class: "t-msg", id: "t-msg" });
        const endBtn = h("button", { class: "btn btn-secondary", id: "t-end-break", onclick: () => { ctx.time.endBreak(); msg.textContent = T.endBreakDone; draw(); } }, T.endBreak);
        const lockBtn = h("button", { class: "btn btn-warn", id: "t-lock-early", onclick: () => { ctx.time.lockForToday(); msg.textContent = T.lockEarlyDone(profile.name); draw(); } }, T.lockEarly(profile.name));
        const less: HTMLButtonElement[] = [];
        const draw = () => {
          const snap = ctx.time.snapshot();
          const played = Math.round(ctx.time.playedMs() / 60000);
          const left = Math.ceil(ctx.time.dailyLeftMs() / 60000);
          const onBreak = snap?.mode === "break";
          status.textContent = snap?.usage.lockedEarly ? T.nowLockedEarly : snap?.lockDue ? T.nowLocked : onBreak ? T.nowBreak : T.nowStatus(played, left);
          endBtn.hidden = !onBreak;
          lockBtn.hidden = !!snap?.lockDue; // already stopped: "+10 phút" gives the time back
          less.forEach((b) => (b.disabled = left <= 0)); // nothing left to take away
        };
        // +10 / +20 give time (and end an early stop); -10 / -20 take it back, in case of a misclick
        const bonus = (n: number) => {
          const b = h("button", { class: n > 0 ? "btn btn-primary" : "btn btn-secondary", "data-bonus": n, onclick: () => { ctx.time.grantBonus(n); msg.textContent = n > 0 ? T.bonusDone(n) : T.bonusLess(-n); draw(); } }, T.bonus(n));
          if (n < 0) less.push(b);
          return b;
        };
        const buttons = [bonus(-20), bonus(-10), bonus(10), bonus(20)];
        draw();
        return h("div", { class: "t-today" },
          h("h3", null, avatarBadge(profile.avatar, 40), T.nowTitle(profile.name)),
          status,
          h("div", { class: "actions" }, ...buttons),
          h("div", { class: "actions" }, lockBtn, endBtn),
          msg);
      };

      // ---- Học sinh
      const kidsTab = (): HTMLElement => {
        const { profiles, order, settings } = ctx.store.data;
        /** Today's games for one child: finished ones ticked, the one open now marked. Nothing if the plan is off or not made yet. */
        const planCells = (p: (typeof profiles)[string]): Child[] => {
          const plan = p.plan && p.plan.day === ctx.today() && settings.daily.gamesPerDay > 0 ? p.plan : null;
          if (!plan) return ["—"];
          const next = nextGame(plan);
          return plan.games.map((id) => {
            const g = GAMES.find((x) => x.id === id);
            const state = plan.done.includes(id) ? "done" : id === next ? "next" : "later";
            return h("span", { class: `pl ${state}`, "data-game": id, title: g?.title ?? id }, emoji(g?.art[0] ?? "star", 26), state === "done" ? "✓" : state === "next" ? "▶" : "");
          });
        };
        const rows = order.map((id) => {
          const p = profiles[id]!;
          const streak = streakToday(p, ctx.today(), settings);
          return h("tr", { "data-profile": id },
            h("td", null, h("span", { class: "av" }, avatarBadge(p.avatar, 36)), h("b", null, p.name)),
            h("td", null, p.stars),
            h("td", null, streak),
            ...GAMES.map((g) => { const t = p.games[g.id].seed.tier; return h("td", null, h("span", { class: `v v${t}` }, T.tierShort(t))); }),
            h("td", { class: "t-plan", "data-plan": id }, ...planCells(p)),
            h("td", { class: "t-row-actions" },
              h("button", { class: "t-mini", "data-edit": id, onclick: () => openEditProfile(ctx, p, renderTab) }, T.edit),
              h("button", { class: "t-mini danger", "data-remove": id, onclick: () => void remove(id) }, T.remove)));
        });
        const remove = async (id: string) => {
          const p = ctx.store.data.profiles[id];
          if (!p) return;
          const yes = await dialog(ctx, T.removeTitle(p.name), T.removeBody(p.stars), [
            { label: T.keep, value: false, kind: "secondary" },
            { label: T.removeYes, value: true, kind: "danger" },
          ]);
          if (!yes) return;
          // the clock holds the playing child's time: let go of it first so it is not written back
          if (ctx.store.data.activeId === id) ctx.time.discard();
          ctx.store.removeProfile(id);
          ctx.time.reload();
          renderTab();
        };
        const head = h("tr", null,
          h("th", null, T.colName),
          h("th", { title: T.colStars }, emoji("glowing_star", 26)),
          h("th", { title: T.colStreak }, emoji("fire", 26)),
          ...GAMES.map((g) => h("th", { title: g.title }, emoji(g.art[0]!, 30))),
          h("th", null, T.colToday),
          h("th"));
        return h("div", null,
          h("h2", null, T.kidsTitle), h("p", { class: "sub" }, T.kidsSub),
          h("div", { class: "actions t-kids-actions" }, h("button", { class: "btn btn-secondary", id: "t-add", onclick: () => openAddProfile(ctx, renderTab) }, T.add)),
          rows.length ? h("table", { id: "t-kids" }, head, ...rows) : h("p", { class: "note" }, T.noKids));
      };

      // ---- Sao lưu
      const backupTab = (): HTMLElement => {
        const download = () => {
          ctx.time.flush();
          const text = exportJSON(ctx.store.data, ctx.now());
          const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
          const a = h("a", { href: url, download: `tham-tu-toan-hoc-sao-luu-${ctx.today()}.json` });
          document.body.append(a);
          a.click();
          a.remove();
          setTimeout(() => URL.revokeObjectURL(url), 5000);
          msg.textContent = T.exportDone;
        };
        const file = h("input", { type: "file", accept: "application/json,.json", id: "t-import", hidden: true });
        file.addEventListener("change", async () => {
          const f = file.files?.[0];
          file.value = "";
          if (!f) return;
          let data;
          try {
            data = importJSON(await f.text());
          } catch (e) {
            await notice(ctx, T.importFailed, e instanceof Error ? e.message : String(e));
            return;
          }
          const yes = await dialog(ctx, T.importTitle, T.importBody(data.order.length), [
            { label: STR.cancel, value: false, kind: "secondary" },
            { label: T.importYes, value: true },
          ]);
          if (!yes) return;
          // the clock must not write its old working time over the imported children
          ctx.time.discard();
          ctx.store.replace({ ...data, activeId: null });
          ctx.time.reload();
          renderTab();
          void notice(ctx, T.importYes, T.importDone);
        });
        const msg = h("p", { class: "t-msg", id: "t-backup-msg" });
        return h("div", null,
          h("h2", null, T.backupTitle), h("p", { class: "sub" }, T.backupSub),
          h("div", { class: "actions" },
            h("button", { class: "btn btn-primary", id: "t-export", onclick: download }, T.export),
            h("label", { class: "btn btn-secondary", id: "t-import-label" }, T.import, file)),
          msg,
          h("h3", { class: "t-sub" }, T.pinTitle),
          h("div", { class: "actions" }, h("button", { class: "btn btn-secondary", id: "t-change-pin", onclick: () => openChangePin(ctx, renderTab) }, T.changeNow)),
          h("p", { class: "note" }, T.pinNote));
      };

      renderTab();
    };

    // The area stays open while the teacher is busy and closes after a quiet half hour.
    screen.addEventListener("pointerdown", () => { if (inArea) teacherSession.touch(ctx.now()); }, { capture: true });
    const watch = window.setInterval(() => { if (inArea && !teacherSession.isUnlocked(ctx.now())) showGate(); }, 5000);

    if (teacherSession.isUnlocked(ctx.now())) { teacherSession.touch(ctx.now()); showArea(); } else showGate();

    return () => {
      clearInterval(watch);
      timers.forEach(clearTimeout);
      leaveView();
      teacherSession.lock(); // leaving the area locks it again: a child must not find it open
    };
  },
};
