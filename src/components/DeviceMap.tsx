'use client';

import { useEffect, useRef } from 'react';
import type { MapDevice } from '@/lib/d1';

interface DeviceMapProps {
    devices: MapDevice[];
    compact?: boolean;
}

export default function DeviceMap({ devices, compact = false }: DeviceMapProps) {
    const mapEl = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!mapEl.current || devices.length === 0) return;

        let disposed = false;
        let cleanup: (() => void) | undefined;

        async function setupMap() {
            const L = await import('leaflet');
            if (disposed || !mapEl.current) return;

            const map = L.map(mapEl.current, {
                scrollWheelZoom: false,
                zoomControl: true,
                attributionControl: true,
            });

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '&copy; OpenStreetMap contributors',
            }).addTo(map);

            const bounds = L.latLngBounds([]);

            for (const device of devices) {
                const latLng = L.latLng(device.lat, device.lng);
                bounds.extend(latLng);
                L.circleMarker(latLng, {
                    radius: 7,
                    color: '#111',
                    weight: 2,
                    fillColor: '#facc15',
                    fillOpacity: 1,
                })
                    .bindPopup(
                        `<strong>${escapeHtml(device.name)}</strong><br>${escapeHtml(device.city)}<br><span>${escapeHtml(device.address)}</span>`
                    )
                    .addTo(map);
            }

            if (devices.length === 1) {
                map.setView([devices[0].lat, devices[0].lng], 11);
            } else {
                map.fitBounds(bounds, { padding: [40, 40], maxZoom: 11 });
            }

            cleanup = () => map.remove();
        }

        setupMap();

        return () => {
            disposed = true;
            cleanup?.();
        };
    }, [devices]);

    if (devices.length === 0) {
        return (
            <div className="border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-500">
                No public device locations yet.
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <div
                ref={mapEl}
                className={`w-full border border-black bg-gray-100 ${compact ? 'h-56' : 'h-72'}`}
            />
            <ul className="text-xs text-gray-600 space-y-1">
                {devices.map((device) => (
                    <li key={device.id}>
                        <span className="font-bold">{device.name}</span>
                        {device.city ? ` — ${device.city}` : ''}
                    </li>
                ))}
            </ul>
        </div>
    );
}

function escapeHtml(value: string) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
