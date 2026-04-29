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

// --- Transfers tracking ---

export interface Transfer {
  id: number;
  file_name: string;
  file_type: string;
  file_size: number;
  box_num: number;
  upload_device_id: string;
  upload_location: string;
  upload_city: string;
  download_device_id: string | null;
  download_location: string | null;
  download_city: string | null;
  uploaded_at: string;
  downloaded_at: string | null;
}

export interface TransferDeviceEventDay {
  day: string;
  device_id: string;
  device_name: string;
  device_city: string;
  uploads: number;
  downloads: number;
}

export async function createTransfersTable(): Promise<void> {
  await d1Query(`
    CREATE TABLE IF NOT EXISTS transfers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_name TEXT NOT NULL,
      file_type TEXT DEFAULT '',
      file_size INTEGER DEFAULT 0,
      box_num INTEGER NOT NULL,
      upload_device_id TEXT NOT NULL,
      upload_location TEXT DEFAULT '',
      upload_city TEXT DEFAULT '',
      download_device_id TEXT,
      download_location TEXT,
      download_city TEXT,
      uploaded_at TEXT NOT NULL DEFAULT (datetime('now')),
      downloaded_at TEXT
    )
  `);
}

export async function recordUpload(
  fileName: string, fileType: string, fileSize: number, boxNum: number,
  deviceId: string, location: string, city: string
): Promise<void> {
  await d1Query(
    `INSERT INTO transfers (file_name, file_type, file_size, box_num, upload_device_id, upload_location, upload_city, uploaded_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    [fileName, fileType, fileSize, boxNum, deviceId, location, city]
  );
}

export async function recordDownload(
  fileName: string, boxNum: number,
  deviceId: string, location: string, city: string
): Promise<void> {
  // Find the most recent upload record for this file+box that hasn't been downloaded yet
  const rows = await d1Query<{ id: number }>(
    `SELECT id FROM transfers
     WHERE file_name = ? AND box_num = ? AND download_device_id IS NULL
     ORDER BY uploaded_at DESC LIMIT 1`,
    [fileName, boxNum]
  );

  if (rows.length > 0) {
    await d1Query(
      `UPDATE transfers SET download_device_id = ?, download_location = ?, download_city = ?, downloaded_at = datetime('now')
       WHERE id = ?`,
      [deviceId, location, city, rows[0].id]
    );
  } else {
    // No matching upload record — create a download-only record
    await d1Query(
      `INSERT INTO transfers (file_name, file_type, file_size, box_num, upload_device_id, upload_location, upload_city, uploaded_at, download_device_id, download_location, download_city, downloaded_at)
       VALUES (?, '', 0, ?, 'unknown', '', '', datetime('now'), ?, ?, ?, datetime('now'))`,
      [fileName, boxNum, deviceId, location, city]
    );
  }
}

export async function getTransfers(limit: number = 100): Promise<Transfer[]> {
  return d1Query<Transfer>(
    "SELECT * FROM transfers ORDER BY uploaded_at DESC LIMIT ?",
    [limit]
  );
}

export async function getTransferDeviceEventDays(): Promise<TransferDeviceEventDay[]> {
  return d1Query<TransferDeviceEventDay>(`
    WITH RECURSIVE
      bounds AS (
        SELECT MIN(day) AS start_day, MAX(day) AS end_day
        FROM (
          SELECT date(uploaded_at) AS day FROM transfers WHERE upload_device_id != 'unknown'
          UNION ALL
          SELECT date(downloaded_at) AS day FROM transfers WHERE downloaded_at IS NOT NULL
        )
      ),
      days(day) AS (
        SELECT start_day FROM bounds WHERE start_day IS NOT NULL
        UNION ALL
        SELECT date(day, '+1 day')
        FROM days, bounds
        WHERE day < end_day
      ),
      uploads AS (
        SELECT date(uploaded_at) AS day, upload_device_id AS device_id, COUNT(*) AS count
        FROM transfers
        WHERE upload_device_id != 'unknown'
        GROUP BY date(uploaded_at), upload_device_id
      ),
      downloads AS (
        SELECT date(downloaded_at) AS day, download_device_id AS device_id, COUNT(*) AS count
        FROM transfers
        WHERE downloaded_at IS NOT NULL
        GROUP BY date(downloaded_at), download_device_id
      )
    SELECT
      days.day,
      devices.id AS device_id,
      devices.name AS device_name,
      devices.city AS device_city,
      COALESCE(uploads.count, 0) AS uploads,
      COALESCE(downloads.count, 0) AS downloads
    FROM days
    CROSS JOIN devices
    LEFT JOIN uploads ON uploads.day = days.day AND uploads.device_id = devices.id
    LEFT JOIN downloads ON downloads.day = days.day AND downloads.device_id = devices.id
    ORDER BY days.day, devices.id
  `);
}
