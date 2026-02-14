import { NextRequest, NextResponse } from "next/server";
import { validateQrToken } from "@/lib/qr-token";
import { setSessionCookie } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ deviceId: string; code: string }> }
) {
  const { deviceId, code } = await params;
  const qrSecret = process.env.QR_SECRET;

  if (!qrSecret) {
    console.error("[QR] QR_SECRET not configured");
    return NextResponse.redirect(new URL("/denied", request.url));
  }

  const isValid = validateQrToken(qrSecret, deviceId, code);

  if (!isValid) {
    console.log(`[QR] Invalid token for device ${deviceId}`);
    return NextResponse.redirect(new URL("/denied", request.url));
  }

  console.log(`[QR] Valid token for device ${deviceId}, creating session`);
  await setSessionCookie(deviceId);

  return NextResponse.redirect(new URL("/", request.url));
}
