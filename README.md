# Thám tử Toán học Tí hon

A math game web app for Vietnamese grade 1 children (6 years old). It has six mini-games (Thăng bằng, Rô-bốt, Chia quả, Giải mã hình, Mấy và mấy, Quy luật) with the detective cat **Mèo Smarty**. A child plays a few of them each day, one after another (the teacher sets how many).

- **Runs:** in the browser: landscape iPad, computer, or a phone held sideways (iPhone 15 and up).
- **Saves:** on the device only. There is no account and no server.
- **Offline:** works once installed.
- **Live:** [learn-math-grade1.vercel.app](https://learn-math-grade1.vercel.app/) · user guide: [learn-math-grade1.vercel.app/guide/](https://learn-math-grade1.vercel.app/guide/)

```bash
npm install
npm run dev        # develop
npm test           # rules + game generators
npm run build      # static site in dist/
npm run desktop:build   # Windows app (.exe + installer), needs Rust; see docs/BUILD_PLAN.md step 13
```

## Publishing

The game and the user guide go to **GitHub Pages**, the Windows app to a **GitHub Release**, both by GitHub Actions (`.github/workflows/`).

1. Push the repository to GitHub, then turn Pages on once: **Settings > Pages > Build and deployment > Source: GitHub Actions**.
2. Every push to `main` runs the checks (types, tests), builds the app and publishes it:
   - the game at `https://<user>.github.io/<repo>/`
   - the guide at `https://<user>.github.io/<repo>/guide/`
3. For the Windows app, push a version tag (`git tag v0.1.0 && git push origin v0.1.0`). The installer and a portable `.exe` appear under **Releases**.

The game is also on **Vercel** (`vercel.json`): every push to `main` redeploys it, with the user guide at `/guide/`. It works on any other static host too: upload the `dist/` folder (`npm run build`), plus `docs/guide/` as `dist/guide/`. See [THIRD_PARTY.md](THIRD_PARTY.md) for the licences of the pictures and fonts.

## Documents

| Document | Contents |
| --- | --- |
| [docs/guide/](docs/guide/README.md) | **User guide** for teachers and parents (Vietnamese and English; Markdown and HTML, with screenshots and videos) |
| [Games_Description_VI.md](Games_Description_VI.md) / [EN](Games_Description_EN.md) | What each game does (for teachers and judges) |
| [docs/RULES.md](docs/RULES.md) | Difficulty, stars, streak and screen-time rules |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | How the code is organised |
| [docs/BUILD_PLAN.md](docs/BUILD_PLAN.md) | What is done and what is next |
| [docs/UI_GUIDE.md](docs/UI_GUIDE.md) | How screens are built from the mockups |
| [docs/AUDIO_SCRIPT.md](docs/AUDIO_SCRIPT.md) | Kịch bản thu âm for the teacher |
| [mockup/v2/](mockup/v2/) | Clickable design mockups |

Pictures: [Microsoft Fluent Emoji](https://github.com/microsoft/fluentui-emoji) (MIT licence).
