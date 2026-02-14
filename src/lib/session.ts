import { createHmac } from "crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE_NAME = "htmlpg_session";
const SESSION_TTL_SECONDS = 30 * 60; // 30 minutes

export function createSessionValue(
  sessionSecret: string,
  deviceId: string
): string {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = `${deviceId}.${exp}`;
  const sig = createHmac("sha256", sessionSecret).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

export function validateSessionValue(
  sessionSecret: string,
  value: string
): { valid: true; deviceId: string; exp: number } | { valid: false } {
  const parts = value.split(".");
  if (parts.length !== 3) return { valid: false };

  const [deviceId, expStr, sig] = parts;
  const exp = parseInt(expStr, 10);
  if (isNaN(exp)) return { valid: false };

  // Check expiration
  const now = Math.floor(Date.now() / 1000);
  if (now > exp) return { valid: false };

  // Verify HMAC signature (constant-time comparison)
  const payload = `${deviceId}.${expStr}`;
  const expectedSig = createHmac("sha256", sessionSecret).update(payload).digest("hex");
  if (sig.length !== expectedSig.length) return { valid: false };
  const sigBuf = Buffer.from(sig, "hex");
  const expectedBuf = Buffer.from(expectedSig, "hex");
  if (!sigBuf.equals(expectedBuf)) return { valid: false };

  return { valid: true, deviceId, exp };
}

export async function setSessionCookie(deviceId: string): Promise<void> {
  const secret = process.env.SESSION_SECRET!;
  const value = createSessionValue(secret, deviceId);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}
