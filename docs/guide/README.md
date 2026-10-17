# User guide / Hướng dẫn sử dụng

| | Markdown | HTML (open in a browser, prints well) |
| --- | --- | --- |
| Tiếng Việt | [HUONG_DAN.md](HUONG_DAN.md) | [huong-dan.html](huong-dan.html) |
| English | [USER_GUIDE.md](USER_GUIDE.md) | [user-guide.html](user-guide.html) |

The pictures are in `img/` and the short videos in `video/`. To share the guide, send the whole folder (the HTML pages need `img/` and `video/` next to them).

Everything here is generated: `node scripts/guide-shots.mjs` retakes the pictures and videos from the running app (`npm run dev` first), `node scripts/make-guide.mjs` rebuilds the pages from `scripts/guide-content.mjs`.
