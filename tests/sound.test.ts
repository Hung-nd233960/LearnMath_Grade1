import { describe, expect, it } from "vitest";
import { barSeconds, degreeToMidi, LOOP_BARS, planBar, TRACK_IDS, TRACKS, trackForRoute } from "../src/audio/music.ts";
import { DEFAULT_LIMITS } from "../src/core/config.ts";
import { channelVolume, DEFAULT_MIX, defaultSettings, FX_PRESETS, matchingPreset, sanitizeMix } from "../src/core/settings.ts";
import { emptyData, migrate } from "../src/core/storage.ts";
import { GAMES } from "../src/games/index.ts";

describe("background music", () => {
  it("has a lobby track and one for every game", () => {
    expect([...TRACK_IDS].sort()).toEqual(["lobby", ...GAMES.map((g) => g.id)].sort());
  });

  it("is composed by rules: the same bar is always the same notes", () => {
    for (const id of TRACK_IDS) for (let bar = 0; bar < LOOP_BARS; bar++) expect(planBar(TRACKS[id], bar)).toEqual(planBar(TRACKS[id], bar));
  });

  it("loops: bar 16 is bar 0 again", () => {
    for (const id of TRACK_IDS) expect(planBar(TRACKS[id], LOOP_BARS)).toEqual(planBar(TRACKS[id], 0));
  });

  it("is a tune with a shape: four-bar phrases A A B A", () => {
    for (const id of TRACK_IDS) {
      const lead = (bar: number) => planBar(TRACKS[id], bar).filter((n) => n.voice === "lead").map((n) => [n.at, n.midi]);
      expect(lead(8)).toEqual(lead(0)); // the third phrase repeats the first
      expect(lead(12)).toEqual(lead(0)); // and so does the fourth
      expect(lead(4)).not.toEqual(lead(0)); // the second phrase is different
    }
  });

  it("only uses notes of the track's pentatonic scale, so nothing can clash", () => {
    for (const id of TRACK_IDS) {
      const t = TRACKS[id];
      expect(t.scale).toHaveLength(5);
      for (let bar = 0; bar < LOOP_BARS; bar++) {
        for (const note of planBar(t, bar).filter((n) => n.voice !== "perc")) {
          expect(t.scale, `${id} bar ${bar}`).toContain((((note.midi - t.root) % 12) + 12) % 12);
        }
      }
    }
  });

  it("keeps every note inside its bar, in a singable range, with a melody to hear", () => {
    for (const id of TRACK_IDS) {
      const t = TRACKS[id];
      let leadNotes = 0;
      for (let bar = 0; bar < LOOP_BARS; bar++) {
        for (const n of planBar(t, bar)) {
          expect(n.at).toBeGreaterThanOrEqual(0);
          expect(n.at).toBeLessThan(t.beats);
          expect(n.dur).toBeGreaterThan(0);
          expect(n.at + n.dur).toBeLessThanOrEqual(t.beats + 1e-9);
          expect(n.vel).toBeGreaterThan(0);
          expect(n.vel).toBeLessThanOrEqual(1);
          if (n.voice === "lead") {
            leadNotes++;
            // one octave above the chord register
            expect(n.midi).toBeGreaterThanOrEqual(t.root + 12);
            expect(n.midi).toBeLessThanOrEqual(t.root + 24);
          }
          if (n.voice === "bass") expect(n.midi).toBeLessThan(t.root); // the bass lives below the chords
          if (n.voice === "sparkle") expect(n.midi).toBeGreaterThanOrEqual(t.root + 24); // the chimes sit above the melody
        }
      }
      expect(leadNotes, id).toBeGreaterThan(LOOP_BARS * 1.5);
    }
  });

  it("starts each bar's melody and bass on the chord", () => {
    for (const id of TRACK_IDS) {
      const t = TRACKS[id];
      for (let bar = 0; bar < 8; bar++) {
        const chord = t.progression[bar % 4]!;
        const notes = planBar(t, bar);
        const bass = notes.find((n) => n.voice === "bass" && n.at === 0);
        if (t.bass.includes(0)) expect(bass?.midi).toBe(degreeToMidi(t, chord - t.scale.length));
        const first = notes.find((n) => n.voice === "lead")!;
        // the first note is a chord tone (possibly an octave lower to fit the melody's register)
        const toneClasses = [0, 2, 4].map((d) => (degreeToMidi(t, chord + d) - t.root) % 12);
        expect(toneClasses).toContain((first.midi - t.root) % 12);
      }
    }
  });

  it("each track is a different tune from the others", () => {
    const sig = (id: (typeof TRACK_IDS)[number]) => JSON.stringify(Array.from({ length: 4 }, (_, b) => planBar(TRACKS[id], b)));
    expect(new Set(TRACK_IDS.map(sig)).size).toBe(TRACK_IDS.length);
  });

  it("a bar is a sensible length", () => {
    for (const id of TRACK_IDS) expect(barSeconds(TRACKS[id])).toBeGreaterThan(1.5);
    expect(barSeconds(TRACKS.lobby)).toBeCloseTo((60 / TRACKS.lobby.bpm) * 4, 6);
    expect(barSeconds(TRACKS.split)).toBeCloseTo((60 / TRACKS.split.bpm) * 3, 6); // the waltz has three beats
  });

  it("plays the lobby music on the lobby screens, each game's own tune in the game, silence elsewhere", () => {
    expect(trackForRoute("home", [])).toBe("lobby");
    expect(trackForRoute("who", [])).toBe("lobby");
    expect(trackForRoute("stars", [])).toBe("lobby");
    for (const g of GAMES) expect(trackForRoute("play", [g.id])).toBe(g.id);
    expect(trackForRoute("play", ["nonsense"])).toBe("lobby");
    for (const quiet of ["teacher", "break", "locked", "dev", "kit"]) expect(trackForRoute(quiet, [])).toBeNull();
  });
});

describe("sound mixer", () => {
  const s = () => defaultSettings();

  it("plays every channel at its volume by default", () => {
    const x = s();
    expect(channelVolume(x, "music")).toBeCloseTo(DEFAULT_MIX.master * DEFAULT_MIX.music);
    expect(channelVolume(x, "voice")).toBe(1);
  });

  it("master volume scales the other channels", () => {
    const x = s();
    x.mix = { ...x.mix, master: 0.5, voice: 0.8 };
    expect(channelVolume(x, "voice")).toBeCloseTo(0.4);
  });

  it("the speaker's mute silences everything", () => {
    const x = { ...s(), muted: true };
    for (const ch of ["music", "sfx", "voice"] as const) expect(channelVolume(x, ch)).toBe(0);
  });

  it("a channel switched off is silent but keeps its volume", () => {
    const x = s();
    x.mix = { ...x.mix, music: 0.7, musicOn: false };
    expect(channelVolume(x, "music")).toBe(0);
    expect(x.mix.music).toBe(0.7);
    expect(channelVolume(x, "voice")).toBe(1);
  });

  it("what the teacher switched off stays off whatever the child does with the mixer", () => {
    const x = s();
    x.fx = { ...x.fx, music: false, sfx: false };
    expect(channelVolume(x, "music")).toBe(0);
    expect(channelVolume(x, "sfx")).toBe(0);
    expect(channelVolume(x, "voice")).toBeGreaterThan(0); // the voice is not an effect
  });

  it("the Yên tĩnh preset has no music, the others do", () => {
    expect(FX_PRESETS.calm.music).toBe(false);
    expect(FX_PRESETS.mid.music).toBe(true);
    expect(FX_PRESETS.all.music).toBe(true);
    expect(matchingPreset({ ...FX_PRESETS.all, music: false })).toBeNull();
  });

  it("repairs anything odd read from storage", () => {
    expect(sanitizeMix(undefined)).toEqual(DEFAULT_MIX);
    expect(sanitizeMix({ master: 7, music: -3, sfx: NaN, voice: "loud" as unknown as number, musicOn: "yes" as unknown as boolean })).toEqual({ ...DEFAULT_MIX, master: 1, music: 0 });
    expect(sanitizeMix({ sfx: 0.25, sfxOn: false })).toMatchObject({ sfx: 0.25, sfxOn: false });
  });
});

describe("older saves", () => {
  type Data = ReturnType<typeof emptyData>;
  const roundTrip = (mutate: (d: Data) => void) => {
    const d = emptyData();
    mutate(d);
    return migrate(JSON.parse(JSON.stringify(d)))!.settings;
  };
  const dropMusic = (d: Data) => { delete (d.settings.fx as Partial<Data["settings"]["fx"]>).music; };

  it("get a mixer, and music that follows the sound-effects switch (so a quiet setup stays quiet)", () => {
    const loud = roundTrip((d) => { delete (d.settings as Partial<Data["settings"]>).mix; dropMusic(d); d.settings.fx.sfx = true; });
    expect(loud.mix).toEqual(DEFAULT_MIX);
    expect(loud.fx.music).toBe(true);
    const quiet = roundTrip((d) => { d.settings.fx.sfx = false; dropMusic(d); });
    expect(quiet.fx.music).toBe(false);
  });

  it("keep a music switch that is already there", () => {
    expect(roundTrip((d) => { d.settings.fx.music = false; d.settings.fx.sfx = true; }).fx.music).toBe(false);
  });

  it("move from the first release's quick idle timing (20 s / 60 s) to the new one (1 minute / 3 minutes)", () => {
    const old = roundTrip((d) => { d.settings.limits = { ...d.settings.limits, idleNudgeSec: 20, idlePauseSec: 60 }; });
    expect(old.limits.idleNudgeSec).toBe(DEFAULT_LIMITS.idleNudgeSec);
    expect(old.limits.idlePauseSec).toBe(DEFAULT_LIMITS.idlePauseSec);
    expect(DEFAULT_LIMITS.idleNudgeSec).toBe(60);
    expect(DEFAULT_LIMITS.idlePauseSec).toBe(180);
  });

  it("leave a teacher's own idle timing alone", () => {
    const own = roundTrip((d) => { d.settings.limits = { ...d.settings.limits, idleNudgeSec: 30, idlePauseSec: 90 }; });
    expect(own.limits.idleNudgeSec).toBe(30);
    expect(own.limits.idlePauseSec).toBe(90);
  });
});
