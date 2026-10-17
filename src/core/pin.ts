// Teacher-area PIN. This keeps children out; it is NOT real security (everything
// lives in the browser). A salted FNV-1a hash just avoids storing the PIN in plain text.

export interface PinRecord {
  salt: string;
  hash: string;
}

function fnv1a(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

export function isValidPin(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}

export function makePin(pin: string, salt: string = Math.random().toString(36).slice(2, 10)): PinRecord {
  if (!isValidPin(pin)) throw new Error("PIN must be 4 digits");
  return { salt, hash: fnv1a(salt + ":" + pin) };
}

export function checkPin(rec: PinRecord, pin: string): boolean {
  return isValidPin(pin) && fnv1a(rec.salt + ":" + pin) === rec.hash;
}
