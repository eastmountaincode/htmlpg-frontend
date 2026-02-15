import { createHmac } from "crypto";

export const ADMIN_COOKIE_NAME = "htmlpg_admin";
export const ADMIN_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

export function createAdminCookie(sessionSecret: string): string {
  const exp = Math.floor(Date.now() / 1000) + ADMIN_MAX_AGE;
  const payload = `admin.${exp}`;
  const sig = createHmac("sha256", sessionSecret).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

export function validateAdminCookie(
  sessionSecret: string,
  value: string
): boolean {
  const parts = value.split(".");
  if (parts.length !== 3) return false;

  const [prefix, expStr, sig] = parts;
  if (prefix !== "admin") return false;

  const exp = parseInt(expStr, 10);
  if (isNaN(exp)) return false;

  const now = Math.floor(Date.now() / 1000);
  if (now > exp) return false;

  const payload = `${prefix}.${expStr}`;
  const expectedSig = createHmac("sha256", sessionSecret)
    .update(payload)
    .digest("hex");
  if (sig.length !== expectedSig.length) return false;

  const sigBuf = Buffer.from(sig, "hex");
  const expectedBuf = Buffer.from(expectedSig, "hex");
  return sigBuf.equals(expectedBuf);
}
