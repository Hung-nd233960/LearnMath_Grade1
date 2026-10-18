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

/** The packs that really ship: every folder of public/audio, as the build lists them (see vite.config.ts). */
const mp3 = import.meta.glob("../public/audio/*/*.mp3", { query: "?url", import: "default" });
const meta = import.meta.glob("../public/audio/*/pack.json", { eager: true, import: "default" }) as Record<string, { name?: string; note?: string; order?: number }>;
function shippedPacks(): VoicePack[] {
  const folderOf = (path: string) => path.split("/").slice(-2)[0]!;
  const folders = [...new Set([...Object.keys(mp3), ...Object.keys(meta)].map(folderOf))];
  return folders.map((id) => {
    const m = Object.entries(meta).find(([p]) => folderOf(p) === id)?.[1] ?? {};
    const clips = Object.keys(mp3).filter((p) => folderOf(p) === id).map((p) => p.split("/").pop()!.replace(/.mp3$/, ""));
    return { id, name: m.name ?? id, note: m.note ?? "", order: m.order ?? 10, clips };
  });
}

describe("the voice packs that ship", () => {
  const packs = shippedPacks();
  it("on a fresh device the app speaks with Nam Minh (the Northern voice) until the teacher's recordings are complete", () => {
    expect(choosePack(null, packs)).toBe("nam-minh");
    const nam = packs.find((p) => p.id === "nam-minh")!;
    expect(nam.name).toMatch(/miền Bắc/);
    expect(nam.order).toBeLessThan(packs.find((p) => p.id === "hoai-my")!.order); // the Southern voice is not preferred
  });
  it("the teacher's own recordings still come first once they are complete", () => {
    const teacher = packs.find((p) => p.id === "teacher")!;
    expect(teacher.order).toBeLessThan(packs.find((p) => p.id === "nam-minh")!.order);
    const complete = { ...teacher, clips: Object.keys(CLIPS) };
    expect(choosePack(null, packs.map((p) => (p.id === "teacher" ? complete : p)))).toBe("teacher");
  });
  it("every placeholder pack covers every clip of the app, so no sentence falls back to the device voice", () => {
    for (const id of ["nam-minh", "hoai-my", "piper"]) {
      const p = packs.find((x) => x.id === id)!;
      const c = coverage(p);
      expect(c.have, id).toBe(c.total);
    }
  });
  it("no pack keeps clips the app no longer has (the old So sánh cân guide)", () => {
    for (const p of packs) expect(p.clips.filter((c) => c.startsWith("guide_cmp_")), p.id).toEqual([]);
  });
});
