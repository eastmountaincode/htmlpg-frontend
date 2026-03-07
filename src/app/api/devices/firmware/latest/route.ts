import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getR2, R2_BUCKET } from "@/lib/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Firmware metadata stored in R2
const FIRMWARE_META_KEY = "firmware/latest.json";

interface FirmwareMeta {
  version: string;
  url: string;
  required?: boolean;
  releaseNotes?: string;
  minVersion?: string; // minimum version that can update (for breaking changes)
  deviceType?: string; // "esp32" | "rpi" — filter by device type
}

// GET /api/devices/firmware/latest — check for firmware updates
export async function GET(request: NextRequest) {
  // Optional: filter by device type from headers
  const deviceId = request.headers.get("x-device-id") || "";
  const currentVersion = request.headers.get("x-firmware-version") || "0.0.0";
  
  // Determine device type from device ID prefix
  const deviceType = deviceId.startsWith("htmlpg-") ? "esp32" : "rpi";

  if (!R2_BUCKET) {
    return NextResponse.json(
      { error: "R2 bucket configuration missing" },
      { status: 500 }
    );
  }

  try {
    // Try device-specific firmware first, fall back to generic
    const keys = [
      `firmware/${deviceType}/latest.json`,
      FIRMWARE_META_KEY,
    ];

    let meta: FirmwareMeta | null = null;

    for (const key of keys) {
      try {
        const result = await getR2().send(
          new GetObjectCommand({ Bucket: R2_BUCKET, Key: key })
        );
        const body = await result.Body?.transformToString();
        if (body) {
          meta = JSON.parse(body);
          break;
        }
      } catch {
        // Key doesn't exist, try next
        continue;
      }
    }

    if (!meta) {
      // No firmware metadata found — return current version (no update)
      return NextResponse.json({
        version: currentVersion,
        url: "",
        required: false,
        message: "No firmware updates configured",
      });
    }

    // Check if device type matches (if specified in meta)
    if (meta.deviceType && meta.deviceType !== deviceType) {
      return NextResponse.json({
        version: currentVersion,
        url: "",
        required: false,
        message: "No update for this device type",
      });
    }

    return NextResponse.json({
      version: meta.version,
      url: meta.url,
      required: meta.required || false,
      releaseNotes: meta.releaseNotes || "",
    });
  } catch (err) {
    console.error("[API] Firmware check error:", err);
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
