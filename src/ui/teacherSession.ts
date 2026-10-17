// Whether the teacher area is unlocked right now. Kept in sessionStorage (so a page reload does not
// ask for the PIN again) with a memory fallback; it ends when the tab closes, the area is left,
// or it has been left alone for TEACHER_UNLOCK_MINUTES.
import { unlockValid } from "../core/teacher.ts";

const KEY = "ttth.teacher";
let memory: number | null = null;

function read(): number | null {
  try {
    const v = sessionStorage.getItem(KEY);
    return v ? Number(v) : memory;
  } catch {
    return memory;
  }
}

function write(at: number | null): void {
  memory = at;
  try {
    if (at === null) sessionStorage.removeItem(KEY);
    else sessionStorage.setItem(KEY, String(at));
  } catch {
    /* private mode: memory only */
  }
}

export const teacherSession = {
  isUnlocked(now: number): boolean {
    return unlockValid(read(), now);
  },
  /** Unlock, or push the expiry back because the teacher is still busy. */
  touch(now: number): void {
    write(now);
  },
  lock(): void {
    write(null);
  },
};
