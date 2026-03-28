import {
  ListObjectsV2Command,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getR2, R2_BUCKET } from "@/lib/r2";
import { validateSessionValue, SESSION_COOKIE_NAME, getTimeSlotExpiry } from "@/lib/session";
import { QR_INTERVAL_SECONDS } from "@/lib/qr-token";
import { cookies } from "next/headers";
import { getDevices } from "@/lib/d1";
import AdminTestTools from "./AdminTestTools";
import AdminFileManager from "./AdminFileManager";
import AdminDeviceTable from "./AdminDeviceTable";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const HEALTH_PREFIX = "device-health/";
const STALE_THRESHOLD_MS = 2 * 60 * 1000;

interface DeviceHealth {
  deviceId: string;
  connected: boolean;
  timestamp: string;
  stale: boolean;
  firmwareVersion?: string;
  deviceType?: string;
}

async function getDeviceHealth(): Promise<Record<string, DeviceHealth>> {
  if (!R2_BUCKET) return {};

  try {
    const listResult = await getR2().send(
      new ListObjectsV2Command({ Bucket: R2_BUCKET, Prefix: HEALTH_PREFIX })
    );

    if (!listResult.Contents || listResult.Contents.length === 0) return {};

    const now = Date.now();
    const healthMap: Record<string, DeviceHealth> = {};

    await Promise.all(
      listResult.Contents.filter(
        (obj) => obj.Key && !obj.Key.endsWith("/") && (obj.Size || 0) > 0
      ).map(async (obj) => {
        const result = await getR2().send(
          new GetObjectCommand({ Bucket: R2_BUCKET, Key: obj.Key })
        );
        const body = await result.Body?.transformToString();
        const data = JSON.parse(body || "{}");
        const lastSeen = new Date(data.timestamp).getTime();
        healthMap[data.deviceId] = {
          deviceId: data.deviceId,
          connected: data.connected,
          timestamp: data.timestamp,
          stale: now - lastSeen > STALE_THRESHOLD_MS,
          firmwareVersion: data.firmwareVersion,
          deviceType: data.deviceType,
        };
      })
    );

    return healthMap;
  } catch (err) {
    console.error("[Admin] Failed to fetch device health:", err);
    return {};
  }
}

async function getSessionInfo(): Promise<{ deviceId: string; exp: number } | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionCookie) return null;

  const secret = process.env.SESSION_SECRET;
  if (!secret) return null;

  const result = validateSessionValue(secret, sessionCookie);
  if (!result.valid) return null;

  return { deviceId: result.deviceId, exp: result.exp };
}

export interface DeviceRow {
  id: string;
  name: string;
  city: string;
  notes: string;
  deviceType: string | null;
  firmwareVersion: string | null;
  connected: boolean | null;
  stale: boolean;
  lastSeen: string | null;
}

export default async function AdminPage() {
  const [devices, healthMap, sessionInfo] = await Promise.all([
    getDevices(),
    getDeviceHealth(),
    getSessionInfo(),
  ]);
  const timeSlotExpiry = getTimeSlotExpiry();

  // Merge device registry with health data
  const deviceRows: DeviceRow[] = devices.map((d) => {
    const health = healthMap[d.id];
    return {
      id: d.id,
      name: d.name,
      city: d.city,
      notes: d.notes || '',
      deviceType: health?.deviceType || null,
      firmwareVersion: health?.firmwareVersion || null,
      connected: health ? health.connected : null,
      stale: health?.stale ?? true,
      lastSeen: health?.timestamp || null,
    };
  });

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">HTMLPG Admin</h1>

        {/* Test Tools */}
        <div className="mb-8 bg-white shadow-sm rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Test Tools</h2>
          <AdminTestTools sessionInfo={sessionInfo} timeSlotExpiry={timeSlotExpiry} intervalSeconds={QR_INTERVAL_SECONDS} />
        </div>

        {/* File Management */}
        <div className="mb-8 bg-white shadow-sm rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">File Management</h2>
          <AdminFileManager />
        </div>

        {/* Devices */}
        <div className="mb-8 bg-white shadow-sm rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Devices</h2>
          <AdminDeviceTable initialDevices={deviceRows} />
        </div>
      </div>
    </div>
  );
}
