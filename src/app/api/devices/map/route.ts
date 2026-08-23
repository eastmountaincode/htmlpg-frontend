import { NextResponse } from "next/server";
import { getMapDevices } from "@/lib/d1";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PUBLIC_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-store",
};

// GET /api/devices/map - public device locations for the website map
export async function GET() {
  try {
    const devices = await getMapDevices();
    return NextResponse.json({ devices }, { headers: PUBLIC_HEADERS });
  } catch (err) {
    console.error("[API] Device map GET error:", err);
    return NextResponse.json(
      { error: "Could not load device locations" },
      { status: 500, headers: PUBLIC_HEADERS }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: PUBLIC_HEADERS });
}
