import {
  PutObjectCommand,
  ListObjectsV2Command,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";
import { getR2, R2_BUCKET } from "@/lib/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const HEALTH_PREFIX = "device-health/";
const STALE_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes (devices heartbeat every 60s)

// POST /api/devices/health — receive heartbeat from a device
export async function POST(request: NextRequest) {
  if (!R2_BUCKET) {
    return NextResponse.json(
      { error: "R2 bucket configuration missing" },
      { status: 500 }
    );
  }

  try {
    const { deviceId, connected, timestamp } = await request.json();

    if (!deviceId || typeof connected !== "boolean" || !timestamp) {
      return NextResponse.json(
        { error: "Missing required fields: deviceId, connected, timestamp" },
        { status: 400 }
      );
    }

    const key = `${HEALTH_PREFIX}${deviceId}.json`;
    const body = JSON.stringify({ deviceId, connected, timestamp });

    await getR2().send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: body,
        ContentType: "application/json",
      })
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[API] Device health POST error:", err);
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// GET /api/devices/health — fetch all device health statuses
export async function GET() {
  if (!R2_BUCKET) {
    return NextResponse.json(
      { error: "R2 bucket configuration missing" },
      { status: 500 }
    );
  }

  try {
    const listResult = await getR2().send(
      new ListObjectsV2Command({
        Bucket: R2_BUCKET,
        Prefix: HEALTH_PREFIX,
      })
    );

    if (!listResult.Contents || listResult.Contents.length === 0) {
      return NextResponse.json([]);
    }

    const now = Date.now();
    const devices = await Promise.all(
      listResult.Contents.filter(
        (obj) => obj.Key && !obj.Key.endsWith("/") && (obj.Size || 0) > 0
      ).map(async (obj) => {
        const result = await getR2().send(
          new GetObjectCommand({ Bucket: R2_BUCKET, Key: obj.Key })
        );
        const body = await result.Body?.transformToString();
        const data = JSON.parse(body || "{}");
        const lastSeen = new Date(data.timestamp).getTime();
        return {
          ...data,
          stale: now - lastSeen > STALE_THRESHOLD_MS,
        };
      })
    );

    return NextResponse.json(devices);
  } catch (err) {
    console.error("[API] Device health GET error:", err);
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
