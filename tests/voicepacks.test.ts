import { describe, expect, it } from "vitest";
import { choosePack, coverage, DEVICE_PACK, type VoicePack } from "../src/audio/packs.ts";
import { CLIPS } from "../src/audio/manifest.ts";
import { defaultSettings } from "../src/core/settings.ts";
import { emptyData, migrate, SCHEMA } from "../src/core/storage.ts";

const ids = ["a", "b", "c"];
const pack = (id: string, clips: string[], order = 10): VoicePack => ({ id, name: id, note: "", order, clips });

describe("voice packs", () => {
  it("counts how many of the app's clips a pack has", () => {
    expect(coverage(pack("x", ["a", "c", "zzz"]), ids)).toEqual({ have: 2, total: 3 });
    expect(coverage(pack("x", []), ids).have).toBe(0);
  });

  it("uses the teacher's choice while that pack exists, and 'device' always", () => {
    const packs = [pack("teacher", ids, 0), pack("robot", ids)];
    expect(choosePack("robot", packs, ids)).toBe("robot");
    expect(choosePack(DEVICE_PACK, packs, ids)).toBe(DEVICE_PACK);
    expect(choosePack("gone", packs, ids)).toBe("teacher"); // a pack that is no longer shipped falls back to the default
  });

  it("by default picks the first COMPLETE pack by order, then the first with any clips, then the device voice", () => {
    expect(choosePack(null, [pack("teacher", ["a"], 0), pack("tts", ids, 10)], ids)).toBe("tts"); // the teacher has not finished
    expect(choosePack(null, [pack("teacher", ids, 0), pack("tts", ids, 10)], ids)).toBe("teacher");
    expect(choosePack(null, [pack("teacher", [], 0), pack("half", ["a"], 5)], ids)).toBe("half");
    expect(choosePack(null, [pack("teacher", [], 0)], ids)).toBe(DEVICE_PACK);
    expect(choosePack(null, [], ids)).toBe(DEVICE_PACK);
  });

  it("is steady: the same input always gives the same pack", () => {
    const packs = [pack("b", ids, 10), pack("a", ids, 10)];
    expect(choosePack(null, packs, ids)).toBe("a");
    expect(choosePack(null, [...packs].reverse(), ids)).toBe("a");
  });

  it("the real manifest has clips to speak", () => {
    expect(Object.keys(CLIPS).length).toBeGreaterThan(100);
  });
});

describe("voice pack setting", () => {
  it("starts as 'best available' (null)", () => {
    expect(defaultSettings().voicePack).toBeNull();
  });
  it("is filled in for saves made before it existed, and kept when present", () => {
    const old = emptyData();
    delete (old.settings as Partial<typeof old.settings>).voicePack;
    expect(migrate(JSON.parse(JSON.stringify(old)))!.settings.voicePack).toBeNull();
    const chosen = { ...old, schema: SCHEMA, settings: { ...old.settings, voicePack: "hoai-my" } };
    expect(migrate(JSON.parse(JSON.stringify(chosen)))!.settings.voicePack).toBe("hoai-my");
    const junk = { ...old, settings: { ...old.settings, voicePack: 42 } };
    expect(migrate(JSON.parse(JSON.stringify(junk)))!.settings.voicePack).toBeNull();
  });
});
