# 07. Living tile scenes and Mèo's new look

The teachers sent picture mock-ups for each tile (`docs/feedbacks/round-2/tile-*.png`) and a new Mèo (`meo-smarty.png`). They are **style references, not files to ship**. The developer's idea is to make the home tiles more beautiful and alive **in code**: each tile becomes a small scene built from HTML, CSS and inline SVG, with leaves that sway, clouds that drift and sparkles that twinkle.

Building in code keeps the titles, "Mới!", stars and level chips live and crisp, and the scenes stay light (no big image files).

## Shared scene kit: `src/ui/scene.ts` + `scene.css`

Small building blocks, each returning an element (inline SVG or divs), used by every tile:

- **Sky:** a soft vertical gradient in the tile's colour family (the `--*-tile` tokens), with 1–2 cloud puffs that drift slowly across.
- **Ground:** 2–3 layered rolling hills (SVG paths) in greens, plus a grass edge.
- **Bushes:** round clusters at the left and right edges.
- **Foliage:** leaf sprigs in the corners and along the sign.
- **Fence:** a short wooden fence behind the subject (as in the references).
- **Flowers:** small daisies dotted on the grass.
- **Sun:** with a slow ray pulse (Chia quả tile).
- **Sparkles:** small 4-point stars that twinkle; the yellow "!" burst marks beside the subject.
- **Sign:** the cream wooden board with a leaf at each end, holding the title.
  - **Title:** two colours like the references ("Thăng **bằng**", "Giải mã **hình**", "Quy **luật**").
  - **Font:** Baloo 2, 800 weight, with a dark outline (`paint-order: stroke`).
  - The `<h3>` stays real text, inside the sign.

Every piece takes a seed or offset so the six tiles don't look copied.

## Motion (only under `fx-anim`)

These follow the "eye candy, switchable" rule; with `fx-anim` off or `prefers-reduced-motion`, everything is still.

- **Leaves and sprigs:** sway around their stem (`transform-origin` at the base), ±4–6°, 3–5 s, `ease-in-out`, alternating.
- **Clouds:** drift 20–30 s across and loop.
- **Sparkles:** twinkle (scale and opacity), staggered.
- **Subject:** a gentle 4 s bob (the robot, Mèo, the scale's face, the basket).
- **Variety:** stagger every animation with `animation-delay` per tile, so the six tiles never move in step.
- **Performance:**
  - animate only `transform` and `opacity`
  - pause the animations when home isn't on screen (`animation-play-state` via a class)
  - keep the whole home screen at 60 fps on an iPad (check in devtools' performance panel with 4× CPU slowdown)
- **On tap:** a short squish (scale .96) and a leaf rustle (respects `fx-anim`).

## The six tiles

Match the composition of each reference picture, using Fluent Emoji where the reference has an object, and inline SVG where it needs a custom drawing.

| Tile | Subject (centre) | Extras |
|---|---|---|
| Thăng bằng | A golden scale with a cute face and a star on top: an SVG built from the scale parts in `scale.ts`, plus the face | Tree stump pedestal, fence, daisies |
| Rô-bốt | Fluent `robot` waving, with the `triangular_flag` planted on a hill | Little stars in the sky |
| Chia quả | Fluent `basket` with a smiling face (an SVG face laid over it), `red_apple`, `banana`, `tangerine`, `grapes` around it | Sun, fence |
| Giải mã hình | A small board showing 🍎 + 🍐 = ?, with Mèo (detective) peeking from the left | Floating "?" marks that bob |
| Mấy và mấy | Animals sitting in the grass, the same ones chosen in task 06 | Pink petals drifting down |
| Quy luật | A board with ● ▲ ● ▲ ● ?, with Mèo peeking | A star on the board's top |

- Badges stay live DOM on top of the scene: "Vòng N", "Mới!" / stars, and the daily-plan states from task 04.
- **Locked tiles** (task 04): `filter: grayscale(.8)`, with the animations paused.
- **Keep the tile's `data-game` attribute and button**, because `ui:check` selects tiles by it.
- **Wide layout** (task 08): the scenes must scale with the tile, so build them in relative units or a `viewBox`.

## Mèo's new look

The app's Mèo is an SVG (`src/ui/mascot.ts`) with moods (`normal`, `happy`, `think`, `sleep`, `detective`) that screens switch between. **Redraw that SVG** to match `meo-smarty.png`, keeping every mood:

- an orange tabby with stripes; a cream muzzle and chest; big round eyes with highlights; pink cheeks
- a brown **plaid deerstalker** hat with a small red pompom
- a brown plaid **cape** with a gold button at the neck
- the **magnifying glass** held up to one eye in `detective` and `normal`
- a full body with a curled tail if the places Mèo appears have room. Check each one: home hero, play, feedback cards, break, locked, star screen, demo layer, rotate notice, and the Giải mã hình and Quy luật tiles. Otherwise keep head + shoulders with the cape collar.
- **Blink:** keep the open eyes in `<g class="eyes">` so the `fx-anim` blink still works.

Then run `node scripts/make-icons.mjs` (the app icons are drawn from the mascot) and check `#/kit`.

## Done when

- The home screen shows six living scenes that look close to the references.
- With "Yên tĩnh" (all effects off) they are still and still pretty.
- Mèo looks like the new design in every mood.
- `npm run pwa:check` and `npm run ui:check` pass.
- Home stays smooth on an iPad.
