import { createHmac } from "crypto";

//export const QR_INTERVAL_SECONDS = 1800; // 30 minutes
export const QR_INTERVAL_SECONDS = 30; // 30 seconds for testing

export function generateQrToken(
  secret: string,
  deviceId: string,
  timestampSeconds: number = Math.floor(Date.now() / 1000)
): string {
  const timeSlot = Math.floor(timestampSeconds / QR_INTERVAL_SECONDS);
  const message = `${deviceId}${timeSlot}`;
  return createHmac("sha256", secret).update(message).digest("hex");
}

export function validateQrToken(
  secret: string,
  deviceId: string,
  token: string
): boolean {
  const now = Math.floor(Date.now() / 1000);
  const currentToken = generateQrToken(secret, deviceId, now);
  const previousToken = generateQrToken(secret, deviceId, now - QR_INTERVAL_SECONDS);
  return token === currentToken || token === previousToken;
}
