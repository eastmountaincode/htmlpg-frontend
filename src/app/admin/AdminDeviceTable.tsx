'use client';

import { useState } from 'react';
import type { DeviceRow } from './page';

function relativeTime(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function StatusDot({ connected, stale, hasHealth }: { connected: boolean | null; stale: boolean; hasHealth: boolean }) {
  if (!hasHealth) {
    return <span className="inline-block w-3 h-3 rounded-full bg-gray-300" title="Never reported" />;
  }
  if (stale) {
    return <span className="inline-block w-3 h-3 rounded-full bg-yellow-400" title="Stale" />;
  }
  return (
    <span
      className={`inline-block w-3 h-3 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`}
      title={connected ? "Connected" : "Disconnected"}
    />
  );
}

function TypeBadge({ type }: { type: string | null }) {
  if (!type) return <span className="text-gray-400">—</span>;
  if (type === "esp32" || type === "esp32-s3") {
    return <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">ESP32</span>;
  }
  if (type === "rpi") {
    return <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">RPi</span>;
  }
  return <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{type}</span>;
}

interface EditingDevice {
  id: string;
  name: string;
  city: string;
  notes: string;
}

export default function AdminDeviceTable({ initialDevices }: { initialDevices: DeviceRow[] }) {
  const [devices, setDevices] = useState(initialDevices);
  const [editing, setEditing] = useState<EditingDevice | null>(null);
  const [busy, setBusy] = useState(false);

  const startEdit = (d: DeviceRow) => {
    setEditing({ id: d.id, name: d.name, city: d.city, notes: d.notes });
  };

  const cancelEdit = () => setEditing(null);

  const saveEdit = async () => {
    if (!editing) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/devices/${editing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editing.name, city: editing.city, notes: editing.notes }),
      });
      if (res.ok) {
        setDevices(devices.map(d =>
          d.id === editing.id ? { ...d, name: editing.name, city: editing.city, notes: editing.notes } : d
        ));
        setEditing(null);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-gray-100 text-left text-gray-600">
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Device ID</th>
            <th className="px-3 py-2">Location</th>
            <th className="px-3 py-2">City</th>
            <th className="px-3 py-2">Type</th>
            <th className="px-3 py-2">Firmware</th>
            <th className="px-3 py-2">Uploads</th>
            <th className="px-3 py-2">Downloads</th>
            <th className="px-3 py-2">Last Seen</th>
            <th className="px-3 py-2">Notes</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {devices.map((d) => (
            <tr key={d.id} className="border-t border-gray-100">
              <td className="px-3 py-2">
                <StatusDot connected={d.connected} stale={d.stale} hasHealth={d.lastSeen !== null} />
              </td>
              <td className="px-3 py-2 font-mono">{d.id}</td>
              <td className="px-3 py-2">
                {editing?.id === d.id ? (
                  <input
                    value={editing.name}
                    onChange={e => setEditing({ ...editing, name: e.target.value })}
                    className="border rounded px-2 py-1 w-full text-sm"
                  />
                ) : d.name}
              </td>
              <td className="px-3 py-2">
                {editing?.id === d.id ? (
                  <input
                    value={editing.city}
                    onChange={e => setEditing({ ...editing, city: e.target.value })}
                    className="border rounded px-2 py-1 w-full text-sm"
                  />
                ) : d.city}
              </td>
              <td className="px-3 py-2"><TypeBadge type={d.deviceType} /></td>
              <td className="px-3 py-2 font-mono text-gray-600">
                {d.firmwareVersion ? `v${d.firmwareVersion}` : '—'}
              </td>
              <td className="px-3 py-2 text-center tabular-nums">{d.uploads}</td>
              <td className="px-3 py-2 text-center tabular-nums">{d.downloads}</td>
              <td className="px-3 py-2 text-gray-500">
                {d.lastSeen ? relativeTime(d.lastSeen) : '—'}
              </td>
              <td className="px-3 py-2">
                {editing?.id === d.id ? (
                  <textarea
                    value={editing.notes}
                    onChange={e => setEditing({ ...editing, notes: e.target.value })}
                    className="border rounded px-2 py-1 w-full text-sm resize-none"
                    rows={2}
                  />
                ) : (
                  <span className="text-gray-500 text-xs whitespace-pre-wrap">{d.notes || '—'}</span>
                )}
              </td>
              <td className="px-3 py-2">
                {editing?.id === d.id ? (
                  <div className="flex gap-1">
                    <button
                      onClick={saveEdit}
                      disabled={busy}
                      className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 cursor-pointer disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => startEdit(d)}
                    className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 cursor-pointer"
                  >
                    Edit
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
