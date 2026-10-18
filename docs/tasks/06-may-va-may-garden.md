# 06. Mấy và mấy: a garden scene

The teachers find the flower vase plain and asked for "white rabbits and brown rabbits in a garden with trees and flowers". Agreed rules:

- **Animals are fine when free in a garden.** No fences around them, no cages, nothing scary.
- **The two kinds must differ by shape, not only colour** (the existing rule in `SCENES`; it also helps colour-blind children). Motion is **not** used to tell them apart: with `fx-anim` off they would look the same, and moving things are hard to count.
- **The garden is a faded background.** Nothing in it may look like something to count: no small separate flowers or fruit in the play area; trees and bushes only at the edges, soft and low-contrast.

## Ask the developer first: which animals?

- **(A) Recommended:** rabbits **and chicks** ("thỏ" and "gà con"). Fluent Emoji 3D `rabbit_3d.png` and `baby_chick_3d.png` (MIT, the same source as the others in `public/assets/emoji/`). The shapes are completely different at a glance, and it can be built now.
- **(B) What the teachers literally asked for:** white rabbits and brown rabbits, **custom drawn in SVG** with clearly different poses: a white rabbit sitting low and round with its ears down, and a brown rabbit standing on its hind legs, ears up, holding a carrot. More drawing work, and it must still read clearly at about 56 px.

A plain colour change of one emoji (like the gift boxes in the old compare game) is **not** acceptable here.

## Changes

- **`src/games/split/logic.ts`:**
  - add a `garden` scene: `{ container: "garden", kinds: [...], names: ["thỏ trắng", "gà con"] or ["thỏ trắng", "thỏ nâu"], unit: "con" }`
  - scene choice becomes garden 50%, vase 20%, basket 30% (keep the old ones for variety)
  - add a test that every scene's two kinds have different image files (catches a colour-only pair)
- **`src/games/split/text.ts`:** the `sentence()` start for garden: "Trong vườn có ☐ con, trong đó có ☐ con thỏ trắng và ☐ con gà con." New clips for the words that aren't in the manifest yet (`trong_vuon_co`, `con`, the animal names).
- **`src/ui/games/split.ts` + css:**
  - **The garden background:** an inline SVG behind the play area with sky, grass, a tree at each edge and a few soft bushes, at about 40% opacity, or desaturated.
  - **The animals:** stand on the grass, laid out by the existing `splitLayout.ts` (no overlaps; the `tests/splitLayout.test.ts` rules still hold).
  - **Tap-to-mark:** works as before.
- **The blank's small picture** (each answer box shows its item) uses the animal image.
- **`ui:check`:** the split section also runs a garden question via the dev route (pin the scene with a seed that gives `garden`, or add a dev-only override), counting the animals from the DOM.
- Run `npm run audio:script`.

## Done when

- The garden scene shows up in normal play.
- The two kinds are easy to tell apart in a greyscale screenshot (check this: take one with `filter: grayscale(1)`).
- Nothing in the background is countable.
