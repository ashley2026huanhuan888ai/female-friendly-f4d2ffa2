// Application-layer "保持登录 30 天" enforcement.
// Supabase SDK manages the actual session. We only store a small flag
// + expiry timestamp to decide whether to keep or drop the session.

const KEY_UNTIL = "rememberLoginUntil";
const KEY_PREF = "rememberLoginPref"; // "1" = user wants to be remembered
export const REMEMBER_DURATION_MS = 30 * 24 * 60 * 60 * 1000;
export const EXPIRED_FLAG = "rememberLoginExpired";

function safeLocal(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

export function setRemember(remember: boolean) {
  const ls = safeLocal();
  if (!ls) return;
  try {
    if (remember) {
      ls.setItem(KEY_PREF, "1");
      ls.setItem(KEY_UNTIL, String(Date.now() + REMEMBER_DURATION_MS));
    } else {
      ls.removeItem(KEY_PREF);
      ls.removeItem(KEY_UNTIL);
    }
  } catch {
    /* ignore quota / disabled storage */
  }
}

export function getRememberPref(): boolean {
  const ls = safeLocal();
  if (!ls) return false;
  try {
    return ls.getItem(KEY_PREF) === "1";
  } catch {
    return false;
  }
}

export function isRememberExpired(): boolean {
  const ls = safeLocal();
  if (!ls) return false;
  try {
    const raw = ls.getItem(KEY_UNTIL);
    if (!raw) return false;
    const until = Number(raw);
    if (!Number.isFinite(until)) return false;
    return Date.now() > until;
  } catch {
    return false;
  }
}

export function clearRemember() {
  const ls = safeLocal();
  if (!ls) return;
  try {
    ls.removeItem(KEY_PREF);
    ls.removeItem(KEY_UNTIL);
  } catch {
    /* ignore */
  }
}

export function markExpiredNotice() {
  const ls = safeLocal();
  if (!ls) return;
  try {
    ls.setItem(EXPIRED_FLAG, "1");
  } catch {
    /* ignore */
  }
}

export function consumeExpiredNotice(): boolean {
  const ls = safeLocal();
  if (!ls) return false;
  try {
    const v = ls.getItem(EXPIRED_FLAG) === "1";
    if (v) ls.removeItem(EXPIRED_FLAG);
    return v;
  } catch {
    return false;
  }
}
