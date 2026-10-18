# 08. Phones in landscape

## Why phones are blocked today

The teachers report that a phone in landscape still shows the "turn sideways" notice. **That is our own rule, not a bug.** `isPortrait()` in [src/ui/stage.ts](../../src/ui/stage.ts) returns true when `Math.min(width, height) < 420`, meant to keep phones out. An iPhone 15 in landscape is 852×393 CSS px, so it is "too small"; a 15 Pro Max is 932×430, but Safari's toolbars take its height under 420 too.

## Targets

- iPhone 15: 852×393 (aspect 2.17)
- iPhone 15 Pro Max: 932×430
- In Safari with toolbars, the visible height is lower (about 330–370); installed to the home screen, it's the full height minus the notch/Dynamic Island insets on the left or right.
- **Portrait still shows the notice.** iPad and desktop must not change at all.

## Phase A: let phones in (small)

1. `isPortrait(w, h)` → `h > w` only. Update `tests/ui.test.ts`.
2. The rotate notice now appears only in portrait. Make its text only ask to rotate. Today it says "…hoặc dùng máy tính bảng nhé!", so change `STR.rotate` in `src/i18n/ui.ts` to match the `rotate` clip: "Em hãy xoay ngang máy nhé!".
3. `index.html`: add `viewport-fit=cover` to the viewport meta, and pad the stage host with `env(safe-area-inset-left/right/top/bottom)` so the notch never covers anything.
4. **Measure:** with the 1180×820 stage letterboxed on 852×393 the scale is about 0.48. Take screenshots at 852×393 and 932×430 (the browser driver in `scripts/ui-check.mjs` can set the viewport) and list which controls end up smaller than 40 CSS px.
5. Commit Phase A on its own. It's already usable for a quick look, though small.

## Phase B: a wide layout (large)

A second stage shape for short, wide screens:

- **Stage choice:** `computeLayout(w, h)` in `stage.ts` returns `{ stageW, stageH, scale, wide }`.
  - **wide:** `w / h ≥ 1.75 && h < 600`. Stage **1240×600**, so the scale on an iPhone 15 is about 0.65 instead of 0.48.
  - **Otherwise:** today's 1180×820, unchanged.
  - Set `body.wide`, and CSS vars `--stage-w` / `--stage-h` that the `.stage` rule uses instead of fixed numbers. Unit test `computeLayout` with the iPad, desktop, iPhone 15 and Pro Max sizes.
- **Re-lay out each screen under `body.wide`** with CSS only where possible, keeping each screen's logic as is. Work through this list and take a screenshot of each at 852×393:
  - **home:** the hero becomes a slim left column (Mèo, name, chips); the 3×2 tile grid fills the right; the week strip moves into the hero column or hides
  - **play top bar:** thinner; the prompt bar sits beside it, not under it
  - **each game view:** split, equations, basket (Chia quả), scale (all three kinds), robot (board on the left, arrow pad and slots on the right), pattern. The numpad becomes 2 rows where it's 3+.
  - stars, break, locked, who, add profile, teacher area (the teacher area can scroll; it's for adults)
  - overlays (feedback card, guide, demo layer)
- **Tap targets:** at least 44 CSS px **after** scaling on an iPhone 15. Raise sizes under `body.wide` where needed (a `--tap-min` var is a clean way).
- **Drag:** check that `dragTap.ts` still finds drop targets with the new scale (it should, since it uses the same `--s` scaling). The tap fallback must work everywhere.
- **`ui:check`:** add a "phone" pass that runs a reduced set (home, one full set of two games, a drag, the numpad, the guide) at 852×393 and checks that no control is under 44 px and nothing overflows the stage.

## Done when

- On an iPhone 15 (or Chrome devtools device mode at 852×393, touch on) in landscape, every screen is usable without zooming and nothing is cut off by the notch.
- Portrait shows the notice.
- iPad and desktop look exactly as before (compare screenshots).

## Note from the developer

They don't like children playing on phones (a worse experience); the teachers asked for it. Keep the phone layout good but don't let it change the iPad design.
