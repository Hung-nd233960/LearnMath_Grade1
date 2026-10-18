# 09. Voice: Nam Minh (Northern) by default

The teachers say the voice sounds too much like AI and want a Northern accent. Today the default pack is **Hoài My**, whose own `pack.json` describes it as sounding Southern. **Nam Minh** is the Northern pack, and it is already shipped with every clip. The fix is to make Nam Minh the default.

## Steps

1. **Make Nam Minh the default:**
   - In `public/audio/nam-minh/pack.json`, set `"order": 1`.
   - In `public/audio/hoai-my/pack.json`, set `"order": 11`.
   - `teacher` stays at `0`, so real recordings still win once they are complete.
   - This works because `choosePack()` in `src/audio/packs.ts` picks the first *complete* pack by `order` when the teacher hasn't chosen one. No code change is needed.
   - **Existing saves:** a device where a teacher already chose a pack keeps that choice, which is correct.
2. **Name and note in the teacher area:** change Nam Minh's `name` to "Nam Minh (giọng miền Bắc)", so teachers see at once which voice is Northern.
3. **Generate the new clips.** Tasks 01–06 add and change clips. Run `npm run audio:script`, then generate every new or re-worded clip for **all** shipped packs with `scripts/tts-pilot.mjs` (see [TTS_PILOT.md](../TTS_PILOT.md)). Nam Minh comes first. No pack should fall back to the device voice mid-sentence. Coverage shows in the teacher area's "Giọng nói" tab.
4. **Script section:** add a short "Changed in feedback round 2" section at the top of [AUDIO_SCRIPT.md](../AUDIO_SCRIPT.md) listing the new and re-worded clip ids, in case the teacher records her own voice later.
5. **Test** (`tests/voicepacks.test.ts`): with the shipped `pack.json` orders and full coverage, `choosePack(null, packs)` returns `nam-minh`.
6. **Doc:** update [TTS_PILOT.md](../TTS_PILOT.md) to say Nam Minh is the default and why.

## Done when

- On a fresh device the app speaks with Nam Minh.
- Nam Minh covers 100% of the clips, including the round-2 ones.
- The teacher area shows Nam Minh as the chosen default.
