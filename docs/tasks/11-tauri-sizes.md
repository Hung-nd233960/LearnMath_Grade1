# 11. Three desktop builds (16:9, iPad, iPhone 15)

The developer wants three Windows builds of the Tauri app, each opening at a different screen shape, so the layouts can be shown and tested on a PC. Do this **after task 08**: the iPhone build only makes sense once the wide layout exists.

## The builds

| Build | Window (CSS px) | Notes |
|---|---|---|
| `16x9` | 1600×900 | Desktop/TV shape: the 1180×820 stage letterboxed |
| `ipad` | 1180×820 | Today's window (iPad Air landscape) |
| `iphone15` | 852×393 | iPhone 15 landscape: shows the wide layout from task 08 |

- **Windows are resizable** in all three; `minWidth`/`minHeight` low enough for the iPhone one (e.g. 640×360).
- **Distinct apps:** each build has its own `productName` suffix and **its own `identifier`** (e.g. `vn.thamtutoanhoc.app.iphone15`), so the three can be installed side by side and the installers don't overwrite each other. Note: each then keeps **its own** WebView2 storage; use Sao lưu to move children between them, as BUILD_PLAN step 13 says.

## How

- Keep `src-tauri/tauri.conf.json` as the base (ipad). Add two override files, `src-tauri/tauri.16x9.conf.json` and `src-tauri/tauri.iphone15.conf.json`, each holding only the changed fields. Tauri 2's `tauri build --config <file>` merges them over the base.
- **Window array:** check how `--config` merges the `app.windows` array (it may replace the whole array, not merge items) and write the override files to suit.
- **npm scripts:**
  - `desktop:build` stays the ipad build
  - add `desktop:build:16x9`, `desktop:build:iphone15`, and `desktop:build:all` (runs `npm run build` once, then the three `tauri build`s)
  - no new dependencies
- **Output:** each installer lands in `src-tauri/target/release/bundle/nsis/` with a distinct file name, so the three can sit next to each other.
- **Docs:**
  - [BUILD_PLAN.md](../BUILD_PLAN.md) step 13 (desktop app) gets the three commands
  - CLAUDE.md's command list gets `desktop:build:all`

## Done when

- `npm run desktop:build:all` produces three installers.
- Each opens at its size and shows the right layout (the iPhone one shows `body.wide`).
- All three can be installed at the same time.

**Note:** this needs Rust and the VS Build Tools on the machine. If they're missing, write the configs and scripts, check the merged configs with `tauri info` or a dry run if available, and report that the build itself wasn't run.
