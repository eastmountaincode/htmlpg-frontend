const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID!;
const CLOUDFLARE_D1_API_TOKEN = process.env.CLOUDFLARE_D1_API_TOKEN!;
const CLOUDFLARE_D1_DATABASE_ID = process.env.CLOUDFLARE_D1_DATABASE_ID!;

const D1_API_BASE = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/d1/database/${CLOUDFLARE_D1_DATABASE_ID}`;

interface D1Result<T = Record<string, unknown>> {
  results: T[];
  success: boolean;
  meta: {
    changes: number;
    last_row_id: number;
    rows_read: number;
    rows_written: number;
  };
}

interface D1Response<T = Record<string, unknown>> {
  result: D1Result<T>[];
  success: boolean;
  errors: { code: number; message: string }[];
}

export async function d1Query<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  const res = await fetch(`${D1_API_BASE}/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${CLOUDFLARE_D1_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sql, params }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`D1 query failed (${res.status}): ${text}`);
  }

  const data: D1Response<T> = await res.json();

  if (!data.success) {
    throw new Error(`D1 query error: ${data.errors.map((e) => e.message).join(", ")}`);
  }

  return data.result[0]?.results ?? [];
}

export interface Device {
  id: string;
  name: string;
  city: string;
  notes: string;
  uploads: number;
  downloads: number;
  created_at: string;
  updated_at: string;
}

export async function getDevices(): Promise<Device[]> {
  return d1Query<Device>("SELECT * FROM devices ORDER BY id");
}

export async function getDevice(id: string): Promise<Device | null> {
  const results = await d1Query<Device>("SELECT * FROM devices WHERE id = ?", [id]);
  return results[0] ?? null;
}

export async function getDevicesMap(): Promise<Record<string, { name: string; city: string }>> {
  const devices = await getDevices();
  const map: Record<string, { name: string; city: string }> = {};
  for (const d of devices) {
    map[d.id] = { name: d.name, city: d.city };
  }
  return map;
}

export async function createDevice(id: string, name: string, city: string): Promise<Device> {
  await d1Query(
    "INSERT INTO devices (id, name, city) VALUES (?, ?, ?)",
    [id, name, city]
  );
  const device = await getDevice(id);
  return device!;
}

export async function updateDevice(id: string, fields: { name?: string; city?: string; notes?: string }): Promise<Device | null> {
  const sets: string[] = [];
  const params: unknown[] = [];

  if (fields.name !== undefined) { sets.push("name = ?"); params.push(fields.name); }
  if (fields.city !== undefined) { sets.push("city = ?"); params.push(fields.city); }
  if (fields.notes !== undefined) { sets.push("notes = ?"); params.push(fields.notes); }

  if (sets.length === 0) return getDevice(id);

  sets.push("updated_at = datetime('now')");
  params.push(id);

  await d1Query(`UPDATE devices SET ${sets.join(", ")} WHERE id = ?`, params);
  return getDevice(id);
}

export async function deleteDevice(id: string): Promise<void> {
  await d1Query("DELETE FROM devices WHERE id = ?", [id]);
}

export async function incrementUploads(deviceId: string): Promise<void> {
  await d1Query(
    "UPDATE devices SET uploads = uploads + 1, updated_at = datetime('now') WHERE id = ?",
    [deviceId]
  );
}

export async function incrementDownloads(deviceId: string): Promise<void> {
  await d1Query(
    "UPDATE devices SET downloads = downloads + 1, updated_at = datetime('now') WHERE id = ?",
    [deviceId]
  );
}

export async function resetCounters(deviceId: string): Promise<void> {
  await d1Query(
    "UPDATE devices SET uploads = 0, downloads = 0, updated_at = datetime('now') WHERE id = ?",
    [deviceId]
  );
}
