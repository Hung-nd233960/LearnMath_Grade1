# Voice packs

Each folder here is a **voice pack** the teacher can choose in the teacher area (tab "Giọng nói"):

| Folder | What it is |
| --- | --- |
| `teacher/` | The teacher's own recordings, `<clipId>.mp3`. The clip ids and the exact words for each are in [docs/AUDIO_SCRIPT.md](../../docs/AUDIO_SCRIPT.md), generated from `src/audio/manifest.ts`. This is the real voice. |
| `hoai-my/`, `nam-minh/`, `piper/` | Text-to-speech placeholders made by `node scripts/tts-pilot.mjs --install` (see [docs/TTS_PILOT.md](../../docs/TTS_PILOT.md)). Git ignores them, so they exist only on the machine that made them. |

A pack needs only `<clipId>.mp3` files and, to give it a name, a `pack.json`:
`{ "name": "...", "note": "...", "order": 0 }` (the lowest `order` that is complete is the default pack).
The build lists every folder in `audio/packs.json`; there is nothing to register by hand.

If a clip is missing from the chosen pack, the app reads that sentence with the device's Vietnamese voice instead,
or stays silent (the text is always on screen). The pack **"Giọng của máy"** always exists and does exactly that for every sentence.
