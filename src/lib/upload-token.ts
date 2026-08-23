import { createHmac } from "crypto";

interface UploadTokenPayload {
  box: string;
  key: string;
  deviceId: string;
  exp: number;
}

function sign(sessionSecret: string, payload: string) {
  return createHmac("sha256", sessionSecret).update(payload).digest("hex");
}

export function createUploadToken(
  sessionSecret: string,
  payload: Omit<UploadTokenPayload, "exp">,
  expiresInSeconds: number = 86400
) {
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const body = Buffer.from(JSON.stringify({ ...payload, exp })).toString("base64url");
  return `${body}.${sign(sessionSecret, body)}`;
}

export function validateUploadToken(
  sessionSecret: string,
  token: string,
  expected: { box: string; key: string }
): { valid: true; deviceId: string } | { valid: false } {
  const [body, sig] = token.split(".");
  if (!body || !sig) return { valid: false };

  const expectedSig = sign(sessionSecret, body);
  if (sig.length !== expectedSig.length || sig !== expectedSig) return { valid: false };

  let payload: UploadTokenPayload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return { valid: false };
  }

  if (payload.exp < Math.floor(Date.now() / 1000)) return { valid: false };
  if (payload.box !== expected.box || payload.key !== expected.key) return { valid: false };
  if (!payload.deviceId) return { valid: false };

  return { valid: true, deviceId: payload.deviceId };
}
