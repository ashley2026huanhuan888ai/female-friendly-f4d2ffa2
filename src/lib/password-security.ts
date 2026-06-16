export type PasswordSafetyResult =
  | { safe: true }
  | { safe: false; reason: "pwned"; breachCount: number }
  | { safe: false; reason: "unavailable" };

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

export async function checkPasswordSafety(password: string): Promise<PasswordSafetyResult> {
  if (
    typeof window === "undefined" ||
    !window.crypto?.subtle ||
    typeof TextEncoder === "undefined"
  ) {
    return { safe: false, reason: "unavailable" };
  }

  try {
    const encoded = new TextEncoder().encode(password);
    const hash = toHex(await window.crypto.subtle.digest("SHA-1", encoded));
    const prefix = hash.slice(0, 5);
    const suffix = hash.slice(5);
    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: {
        "Add-Padding": "true",
      },
    });

    if (!response.ok) return { safe: false, reason: "unavailable" };

    const body = await response.text();
    const match = body
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line.startsWith(`${suffix}:`));

    if (!match) return { safe: true };

    const count = Number(match.split(":")[1] ?? 0);
    return { safe: false, reason: "pwned", breachCount: Number.isFinite(count) ? count : 0 };
  } catch {
    return { safe: false, reason: "unavailable" };
  }
}
