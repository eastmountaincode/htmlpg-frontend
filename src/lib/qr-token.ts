import { createHmac } from "crypto";

export const QR_INTERVAL_SECONDS = 1800; // 30 minutes

export function generateQrToken(
  secret: string,
  deviceId: string,
  timestampSeconds: number = Math.floor(Date.now() / 1000)
): string {
  const timeSlot = Math.floor(timestampSeconds / QR_INTERVAL_SECONDS);
  const message = `${deviceId}${timeSlot}`;
  return createHmac("sha256", secret).update(message).digest("hex").slice(0, 16);
}

export function validateQrToken(
  secret: string,
  deviceId: string,
  token: string
): boolean {
  const now = Math.floor(Date.now() / 1000);
  // Accept tokens from current slot and previous 10 slots (~5 min window for clock drift)
  for (let i = 0; i <= 10; i++) {
    const checkToken = generateQrToken(secret, deviceId, now - i * QR_INTERVAL_SECONDS);
    if (token === checkToken) return true;
  }
  return false;
}
