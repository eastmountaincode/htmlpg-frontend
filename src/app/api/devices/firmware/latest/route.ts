import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const BASE_URL = "https://htmlpg.andrew-boylan.com";

// GET /api/devices/firmware/latest — check for firmware updates
// Only serves firmware explicitly configured for the requesting device
export async function GET(request: NextRequest) {
  const deviceId = request.headers.get("x-device-id") || "";
  const currentVersion = request.headers.get("x-firmware-version") || "0.0.0";

  // Determine device type from device ID prefix
  const isEsp32 = deviceId.startsWith("htmlpg-") || deviceId.startsWith("pvfll-");
  const deviceType = isEsp32 ? "esp32" : "rpi";

  try {
    // For now, only ESP32 firmware is supported
    if (deviceType !== "esp32") {
      return NextResponse.json({
        version: currentVersion,
        url: "",
        required: false,
        message: "No firmware updates for this device type",
      });
    }

    // Require a per-device manifest (e.g. /firmware/esp32/htmlpg-005/latest.json)
    const response = await fetch(
      `${BASE_URL}/firmware/esp32/${deviceId}/latest.json`,
      { cache: "no-store" }
    );

    if (!response.ok) {
      return NextResponse.json({
        version: currentVersion,
        url: "",
        required: false,
        message: "No firmware updates configured",
      });
    }

    const meta = await response.json();

    return NextResponse.json({
      version: meta.version,
      url: meta.url,
      required: meta.required || false,
      releaseNotes: meta.releaseNotes || "",
    });
  } catch (err) {
    console.error("[API] Firmware check error:", err);
    return NextResponse.json({
      version: currentVersion,
      url: "",
      required: false,
      message: "Error checking for updates",
    });
  }
}
