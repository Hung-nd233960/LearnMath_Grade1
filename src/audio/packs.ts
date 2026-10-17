// Voice packs: folders of clips (public/audio/<pack>/<clipId>.mp3) the teacher can choose between in the
// teacher area. The build writes audio/packs.json listing the folders it finds (see vite.config.ts), so a
// pack exists exactly when its folder is shipped. "device" is always available: no clip files, the
// device's own Vietnamese voice reads the text.
import { CLIPS } from "./manifest.ts";

export interface VoicePack {
  id: string;
  /** Shown to the teacher. */
  name: string;
  note: string;
  /** Lower comes first; the first complete pack is the default. */
  order: number;
  /** Clip ids found in the folder. */
  clips: string[];
}

export const DEVICE_PACK = "device";
export const ALL_CLIP_IDS: string[] = Object.keys(CLIPS);

/** How many of the app's clips a pack has. */
export function coverage(pack: Pick<VoicePack, "clips">, allIds: readonly string[] = ALL_CLIP_IDS): { have: number; total: number } {
  const set = new Set(pack.clips);
  return { have: allIds.filter((id) => set.has(id)).length, total: allIds.length };
}

/**
 * The pack to use: the teacher's choice if it still exists; otherwise the first complete pack, then the
 * first pack with any clips, then the device voice. `selected` is null until the teacher picks one.
 */
export function choosePack(selected: string | null, packs: readonly VoicePack[], allIds: readonly string[] = ALL_CLIP_IDS): string {
  if (selected === DEVICE_PACK) return DEVICE_PACK;
  if (selected && packs.some((p) => p.id === selected)) return selected;
  const sorted = [...packs].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  const complete = sorted.find((p) => { const c = coverage(p, allIds); return c.have === c.total && c.total > 0; });
  if (complete) return complete.id;
  return sorted.find((p) => coverage(p, allIds).have > 0)?.id ?? DEVICE_PACK;
}

/** Read audio/packs.json. Any problem (not there, not JSON) means "no packs": the device voice is used. */
export async function loadPacks(url: string): Promise<VoicePack[]> {
  try {
    const res = await fetch(url, { cache: "no-cache" });
    if (!res.ok) return [];
    const data = (await res.json()) as { packs?: VoicePack[] };
    return (data.packs ?? []).filter((p) => p && typeof p.id === "string" && Array.isArray(p.clips));
  } catch {
    return [];
  }
}
