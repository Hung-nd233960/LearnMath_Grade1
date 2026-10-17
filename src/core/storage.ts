// Persistence: one versioned JSON document in localStorage under STORAGE_KEY.
// Every read/write is wrapped: private mode or blocked storage must never crash the app.
// Safari may evict localStorage after 7 days unless the app is installed to the home
// screen — the teacher area therefore offers export/import of this same document.
import { dayKey } from "./dates.ts";
import { createProfile, repairProfile, type Profile } from "./profiles.ts";
import { defaultSettings, sanitizeMix, type Settings } from "./settings.ts";
import { DEFAULT_LIMITS } from "./config.ts";
import { defaultLimits, type Limits } from "./screentime.ts";

export const STORAGE_KEY = "ttth.data";
export const SCHEMA = 1;
const EXPORT_APP = "tham-tu-toan-hoc";

export interface AppData {
  schema: typeof SCHEMA;
  profiles: Record<string, Profile>;
  /** Display order of profiles on the "Ai đang chơi?" screen. */
  order: string[];
  activeId: string | null;
  settings: Settings;
}

/** Minimal key-value interface so tests can use an in-memory store. */
export interface KeyValue {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function memoryKV(init: Record<string, string> = {}): KeyValue {
  const m = new Map(Object.entries(init));
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
}

/** localStorage if usable, otherwise an in-memory fallback (progress then lasts only this visit). */
export function browserKV(): KeyValue {
  try {
    const ls = globalThis.localStorage;
    const probe = "ttth.__probe";
    ls.setItem(probe, "1");
    ls.removeItem(probe);
    return ls;
  } catch {
    return memoryKV();
  }
}

export function emptyData(reducedMotion = false): AppData {
  return { schema: SCHEMA, profiles: {}, order: [], activeId: null, settings: defaultSettings(reducedMotion) };
}

/** The first release nudged after 20 s and paused after 60 s: too quick for 6-year-olds. A save still holding exactly those values gets the new defaults (1 and 3 minutes). */
function upgradeIdle(l: Limits): Limits {
  return l.idleNudgeSec === 20 && l.idlePauseSec === 60 ? { ...l, idleNudgeSec: DEFAULT_LIMITS.idleNudgeSec, idlePauseSec: DEFAULT_LIMITS.idlePauseSec } : l;
}

/** Turn anything parsed from storage or an import file into valid AppData (or null). */
export function migrate(raw: unknown, now = Date.now()): AppData | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<AppData> & { schema?: number };
  if (r.schema !== SCHEMA) return null; // future schemas: add upgrade steps here
  const today = dayKey(new Date(now));
  const base = emptyData();
  const profiles: Record<string, Profile> = {};
  for (const [id, p] of Object.entries(r.profiles ?? {})) {
    if (p && typeof p === "object") profiles[id] = repairProfile({ ...(p as Profile), id }, now, today);
  }
  const order = (Array.isArray(r.order) ? r.order : []).filter((id) => id in profiles);
  for (const id of Object.keys(profiles)) if (!order.includes(id)) order.push(id);
  const s = (r.settings ?? {}) as Partial<Settings>;
  return {
    schema: SCHEMA,
    profiles,
    order,
    activeId: r.activeId && r.activeId in profiles ? r.activeId : null,
    settings: {
      ...base.settings,
      ...s,
      // a save from before the music existed has no `music`: it follows the sound-effects switch, so "Yên tĩnh" stays quiet
      fx: { ...base.settings.fx, music: s.fx?.sfx ?? base.settings.fx.music, ...s.fx },
      mix: sanitizeMix(s.mix),
      limits: upgradeIdle({ ...defaultLimits(), ...s.limits }),
      pin: s.pin && typeof s.pin.hash === "string" ? s.pin : base.settings.pin,
      // added after the first release: older saves have none, which means "the best available"
      voicePack: typeof s.voicePack === "string" ? s.voicePack : null,
    },
  };
}

export function load(kv: KeyValue, reducedMotion = false): AppData {
  try {
    const text = kv.getItem(STORAGE_KEY);
    if (text) return migrate(JSON.parse(text)) ?? emptyData(reducedMotion);
  } catch {
    /* corrupt or unreadable: start fresh */
  }
  return emptyData(reducedMotion);
}

export function save(kv: KeyValue, data: AppData): boolean {
  try {
    kv.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function exportJSON(data: AppData, now = Date.now()): string {
  return JSON.stringify({ app: EXPORT_APP, exportedAt: new Date(now).toISOString(), data }, null, 2);
}

/** Parse a backup file. Throws Error with a Vietnamese message the UI can show. */
export function importJSON(text: string): AppData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Tệp này không đọc được.");
  }
  const p = parsed as { app?: string; data?: unknown };
  if (p?.app !== EXPORT_APP) throw new Error("Tệp này không phải bản sao lưu của Thám tử Toán học.");
  const data = migrate(p.data);
  if (!data) throw new Error("Bản sao lưu này không dùng được với phiên bản ứng dụng này.");
  return data;
}

/** Tiny observable store: the UI reads `data`, changes it with update(), and subscribes to redraw. */
export class Store {
  private listeners = new Set<(d: AppData) => void>();
  data: AppData;
  private readonly kv: KeyValue;

  constructor(kv: KeyValue, reducedMotion = false) {
    this.kv = kv;
    this.data = load(kv, reducedMotion);
  }

  update(fn: (d: AppData) => AppData): void {
    this.data = fn(this.data);
    save(this.kv, this.data);
    this.listeners.forEach((l) => l(this.data));
  }

  subscribe(fn: (d: AppData) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  get activeProfile(): Profile | null {
    const id = this.data.activeId;
    return id ? this.data.profiles[id] ?? null : null;
  }

  /** Convenience for the common "change the active profile" case. */
  updateProfile(fn: (p: Profile) => Profile): void {
    const p = this.activeProfile;
    if (!p) return;
    this.update((d) => ({ ...d, profiles: { ...d.profiles, [p.id]: fn(p) } }));
  }

  addProfile(name: string, avatar: string, now = Date.now()): Profile {
    const p = createProfile(name, avatar, now, dayKey(new Date(now)));
    this.update((d) => ({ ...d, profiles: { ...d.profiles, [p.id]: p }, order: [...d.order, p.id] }));
    return p;
  }

  /** Change one child (teacher area: rename, new picture). */
  patchProfile(id: string, fn: (p: Profile) => Profile): void {
    const p = this.data.profiles[id];
    if (!p) return;
    this.update((d) => ({ ...d, profiles: { ...d.profiles, [id]: { ...fn(p), id } } }));
  }

  /** Replace everything (a backup was imported). */
  replace(data: AppData): void {
    this.update(() => data);
  }

  removeProfile(id: string): void {
    this.update((d) => {
      const profiles = { ...d.profiles };
      delete profiles[id];
      return { ...d, profiles, order: d.order.filter((x) => x !== id), activeId: d.activeId === id ? null : d.activeId };
    });
  }

  setActive(id: string | null): void {
    this.update((d) => ({ ...d, activeId: id && id in d.profiles ? id : null }));
  }
}
