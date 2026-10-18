# Text-to-speech pilot: placeholder voices for Mèo

**Why.** The final voice is the teacher's own recording (see [AUDIO_SCRIPT.md](AUDIO_SCRIPT.md), 161 short clips as of round 2). Until it exists, the app needs *something* better than silence. The project rule (CLAUDE.md): synthetic clips are allowed during development, they use the same file names as the real ones, and **nothing is generated at run time**. This pilot tried the realistic options on the real clip list and turned the working ones into **voice packs** the teacher can switch between (teacher area, tab **Giọng nói**).

Result in one line: **132 of 132 clips made with three different synthetic voices, all playable in the app today; the quality still has to be judged by ear** (nobody in this pilot could listen; open the listening pages, see below).

## Round 2 (October 2026): Nam Minh is the default

The teachers found the voice "too AI" and asked for a **Northern (Hà Nội) accent**. A child's voice is not practical, so the request settled on a Northern adult voice. The shipped default was *Hoài My*, whose own note says it sounds Southern, so:

* **Nam Minh** (`vi-VN-NamMinhNeural`, northern) now has `order: 1` and the name "Nam Minh (giọng miền Bắc)"; Hoài My is `11`, Piper `12`, the teacher's pack stays `0`. `choosePack()` picks the first *complete* pack by `order`, so a fresh device speaks with Nam Minh, and the teacher's own recordings take over once they are complete. No code changed: only the three `pack.json` files and the names in `scripts/tts-pilot.mjs`. `tests/voicepacks.test.ts` reads the real folders and checks this.
* The round-2 games added 33 clips and re-worded 6 (`guide_scale_*`, `guide_split_1/2`); the old `guide_cmp_*` went. All three placeholder packs were topped up so **every pack has all 161 clips** (a test checks it): `node scripts/tts-pilot.mjs --voice vi-VN-NamMinhNeural --edge-bin .tts-venv/Scripts/edge-tts --python .tts-venv/Scripts/python --only <ids> --force --install` (and the same for `vi-VN-HoaiMyNeural` and `--engine piper …`). The ids are listed in [AUDIO_SCRIPT.md](AUDIO_SCRIPT.md), section "Mới trong đợt góp ý thứ hai".
* To ask for a nicer synthetic voice later (FPT.AI, Viettel AI, Zalo AI offer Northern voices), add an engine to `scripts/tts-pilot.mjs` that writes a new pack folder; keep keys in an environment variable. Nothing is generated at run time.

## What was tried

The whole text is small: 132 clips, 3,884 characters, so even paid services cost almost nothing for this job.

| Option | Needs | Vietnamese voices | Result here |
| --- | --- | --- | --- |
| **The device's own voice** (the browser's speech synthesis; the app's existing fallback, now the pack "Giọng của máy") | nothing | depends on the device (iPad and Android usually have one; this Windows PC has English voices only) | Works with no files. Quality and availability vary by device, so it is not a dependable default. |
| **Microsoft Edge neural voices** through the `edge-tts` Python tool | `pip install edge-tts`, internet while generating | `vi-VN-HoaiMyNeural` (female, southern), `vi-VN-NamMinhNeural` (male, northern) | **Made 132/132 for both voices**, about 2.7 MB each. Free, no account. It uses the same online service as Edge's "read aloud", which is not an official, licensed API: fine for private testing, **not for something you redistribute** (see Licences). Sometimes the service answers with nothing when asked too fast: the script retries. |
| **Piper**, offline neural TTS | `pip install piper-tts`, a 63 MB voice file (`vi_VN-vais1000-medium`) | one Vietnamese voice of that name (also `25hours_single` and `vivos`, not tried) | **Made 132/132**, 1.9 MB, no internet while generating. Code is MIT; check the licence of the voice's training data before redistributing. |
| **Azure Speech**, **Google Cloud TTS** | an account and key | Azure has the same two neural voices as Edge above, with a proper commercial licence; Google has Vietnamese voices | Not run (no key). Both have free monthly allowances far larger than 3,884 characters. **The right way to make a synthetic pack you can publish.** |
| **Voice cloning of the teacher** (ElevenLabs; the open-weight VieNeu-TTS) | account / a GPU-friendly setup | the teacher's own voice from a few seconds of sample | Not run. Worth trying only if the teacher cannot record all 132 clips: a clone of the right voice beats a stranger's voice. |
| FPT.AI, Viettel AI (Vietnamese vendors) | account | many Vietnamese voices | Not run; not found in the sources searched, check their sites directly. |

## What the numbers showed

* **Raw clips are padded with silence.** Edge clips start with about **0.2 s** of silence and end with **0.9 to 1.35 s** of it, whatever the word. Played one after another ("mười" + "ba" + "quả" + "cam") that is a long gap between every word. `scripts/tts_trim.py` cuts each clip to the speech plus **0.05 s** before and **0.12 s** after, and re-encodes it as a small mono mp3 (64 kbps). The pilot always does this.
* **Isolated words each get their own sentence melody**: "mười" falling, "ba" falling... Stitched numbers can sound list-like. The teacher's recordings will have the same limit, so tell the teacher to read the numbers in an even, slightly rising "counting" tone, and to read "quả", "cam", "và" as in the middle of a sentence. The listening pages have stitched sample sentences to judge exactly this.
* **Speed**: generation takes about 2 to 3 minutes for all 132 clips with Edge (3 at a time) and about as long with Piper on this PC. The slowdown set for children is `--rate=-8%` (Edge only).

## Listen and decide

```text
audio-pilot/edge-vi-VN-HoaiMyNeural/index.html
audio-pilot/edge-vi-VN-NamMinhNeural/index.html
audio-pilot/piper-vais1000/index.html
```

Each page plays every clip and six sentences stitched from clips exactly the way the app joins them ("Đưa cho Mèo mười ba quả cam", "Ba cộng bốn bằng bảy"...). Listen for: the six tones, numbers joined without odd gaps, no clipped starts or ends. Or just open the teacher area, **Giọng nói**, and press **Nghe thử** on each pack. Then pick one (or none: the pack list and the teacher recording work the same way).

## Repeat it

```bash
python -m venv .tts-venv
.tts-venv/Scripts/pip install edge-tts piper-tts miniaudio lameenc     # Windows; use bin/ on macOS and Linux
# Edge voices
node scripts/tts-pilot.mjs --edge-bin .tts-venv/Scripts/edge-tts --python .tts-venv/Scripts/python --install
node scripts/tts-pilot.mjs --voice vi-VN-NamMinhNeural --edge-bin .tts-venv/Scripts/edge-tts --python .tts-venv/Scripts/python --install
# Piper (download vi_VN-vais1000-medium.onnx and its .json from huggingface.co/rhasspy/piper-voices, folder vi/vi_VN/vais1000/medium)
node scripts/tts-pilot.mjs --engine piper --voice vais1000 --piper-bin .tts-venv/Scripts/piper --model path/to/vi_VN-vais1000-medium.onnx --python .tts-venv/Scripts/python --install
```

`--install` creates the voice pack folder in `public/audio/` (`hoai-my`, `nam-minh`, `piper`) with a `pack.json` naming it. `--only n7,n13` makes just a few clips; `--force` redoes existing ones. `.tts-venv/` and `audio-pilot/` are git-ignored.

## How a voice pack works

* A pack is a folder `public/audio/<pack>/` of `<clipId>.mp3` files, optionally with `pack.json` (`name`, `note`, `order`). The build lists every folder in `audio/packs.json`, so nothing is registered by hand ([UI_GUIDE.md](UI_GUIDE.md), `vite.config.ts`).
* The teacher picks one in **Giọng nói**; the choice is saved in the settings (`voicePack`; empty means "the first *complete* pack by `order`", so the teacher's own voice wins as soon as all 132 clips are there).
* A clip missing from the chosen pack is read, for that whole sentence, by the device's voice (as before). **Giọng của máy** always exists.
* The service worker keeps every shipped pack for offline use. Each pack is about 2 to 3 MB.

## Licences, to settle before publishing

* **Edge voices (`edge-tts`)**: unofficial use of Microsoft's online service. Treat the audio as **test material**. For a pack you publish, regenerate the same two voices with **Azure Speech** (official, licensed) and use that.
* **Piper `vais1000`**: Piper and the voice-file repository are MIT-licensed; the speech data the voice was trained on has its own terms. Check before publishing.
* **All packs are committed** (`public/audio/<pack>/`), so GitHub Pages and Vercel ship every one of them. To keep a pack out of a deploy, delete its folder or add its path to `.gitignore`.
* The **teacher's recordings** are the only voice with no licence question; that is the goal.

## Sources

* [edge-tts Vietnamese voice names in use](https://huggingface.co/spaces/HuuDatLego/tts-app/blob/main/app.py) (the tool itself lists `vi-VN-HoaiMyNeural` and `vi-VN-NamMinhNeural` with `edge-tts --list-voices`)
* [rhasspy/piper-voices, Vietnamese section](https://huggingface.co/rhasspy/piper-voices/tree/main/vi/vi_VN)
* [VieNeu-TTS](https://github.com/pnnbao97/VieNeu-TTS) (open weights, on-device, voice cloning; its newest model is not open)
* [PlayHT: Vietnamese text-to-speech](https://play.ht/text-to-speech-api/vietnamese/), [fal.ai: TTS API comparison](https://fal.ai/learn/tools/best-text-to-speech-apis) (market overviews; prices and counts vary by page, check the vendor)
