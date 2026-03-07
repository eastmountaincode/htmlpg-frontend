import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET /api/devices/firmware/latest — check for firmware updates
// Reads from public/firmware/esp32/latest.json (static file)
export async function GET(request: NextRequest) {
  const deviceId = request.headers.get("x-device-id") || "";
  const currentVersion = request.headers.get("x-firmware-version") || "0.0.0";
  
  // Determine device type from device ID prefix
  const deviceType = deviceId.startsWith("htmlpg-") ? "esp32" : "rpi";

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

    // Fetch the static JSON file from our own server
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : "https://htmlpg.andrew-boylan.com";
    
    const metaUrl = `${baseUrl}/firmware/esp32/latest.json`;
    const response = await fetch(metaUrl, { cache: "no-store" });
    
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
