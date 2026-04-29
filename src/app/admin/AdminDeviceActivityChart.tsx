"use client";

import { useMemo, useState } from "react";
import type { TransferDeviceEventDay } from "@/lib/d1";

const COLORS = ["#2563eb", "#dc2626", "#16a34a", "#ca8a04", "#9333ea", "#0891b2"];

interface DeviceSeries {
  id: string;
  label: string;
  city: string;
  color: string;
  values: Record<string, { uploads: number; downloads: number }>;
}

function formatDay(day: string): string {
  const [, month, date] = day.split("-");
  return `${Number(month)}/${Number(date)}`;
}

function getNiceTicks(maxValue: number): number[] {
  const roughStep = maxValue / 5;
  const exponent = Math.floor(Math.log10(Math.max(1, roughStep)));
  const base = 10 ** exponent;
  const fraction = roughStep / base;
  const step = (fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10) * base;
  const top = Math.ceil(maxValue / step) * step;
  const ticks: number[] = [];

  for (let value = 0; value <= top; value += step) {
    ticks.push(value);
  }

  return ticks;
}

function buildSeries(data: TransferDeviceEventDay[]) {
  const days = Array.from(new Set(data.map((item) => item.day)));
  const devices = new Map<string, DeviceSeries>();

  for (const item of data) {
    if (!devices.has(item.device_id)) {
      devices.set(item.device_id, {
        id: item.device_id,
        label: item.device_name ? `${item.device_name} (${item.device_id})` : item.device_id,
        city: item.device_city,
        color: COLORS[devices.size % COLORS.length],
        values: {},
      });
    }

    devices.get(item.device_id)!.values[item.day] = {
      uploads: item.uploads,
      downloads: item.downloads,
    };
  }

  return {
    days,
    devices: Array.from(devices.values()),
  };
}

function DeviceLineChart({
  title,
  metric,
  days,
  devices,
  activeDeviceIds,
  yMax,
}: {
  title: string;
  metric: "uploads" | "downloads";
  days: string[];
  devices: DeviceSeries[];
  activeDeviceIds: string[];
  yMax: number;
}) {
  const width = 720;
  const height = 250;
  const margin = { top: 22, right: 20, bottom: 40, left: 34 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;
  const xStep = days.length > 1 ? chartWidth / (days.length - 1) : 0;
  const labelEvery = days.length > 28 ? 7 : days.length > 16 ? 3 : 1;
  const gridValues = getNiceTicks(yMax);
  const maxValue = gridValues[gridValues.length - 1] || 1;

  const pointFor = (value: number, index: number) => {
    const x = margin.left + (days.length > 1 ? index * xStep : chartWidth / 2);
    const y = margin.top + chartHeight - (value / maxValue) * chartHeight;
    return { x, y };
  };

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-2">{title}</h3>
      <svg
        role="img"
        aria-labelledby={`${metric}-chart-title ${metric}-chart-desc`}
        viewBox={`0 0 ${width} ${height}`}
        className="block h-auto w-full"
      >
        <title id={`${metric}-chart-title`}>{title}</title>
        <desc id={`${metric}-chart-desc`}>
          Daily {metric} counts plotted as one line per device.
        </desc>

        {gridValues.map((value) => {
          const y = margin.top + chartHeight - (value / maxValue) * chartHeight;
          return (
            <g key={value}>
              <line
                x1={margin.left}
                x2={width - margin.right}
                y1={y}
                y2={y}
                stroke="#e5e7eb"
              />
              <text
                x={margin.left - 8}
                y={y + 4}
                textAnchor="end"
                className="fill-gray-400 text-[11px]"
              >
                {value}
              </text>
            </g>
          );
        })}

        <line
          x1={margin.left}
          x2={width - margin.right}
          y1={margin.top + chartHeight}
          y2={margin.top + chartHeight}
          stroke="#9ca3af"
        />

        {devices.map((device) => {
          const opacity = activeDeviceIds.length > 0 && !activeDeviceIds.includes(device.id) ? 0.18 : 1;
          const points = days
            .map((day, index) => {
              const value = device.values[day]?.[metric] ?? 0;
              const { x, y } = pointFor(value, index);
              return `${x},${y}`;
            })
            .join(" ");

          return (
            <g key={device.id}>
              <polyline
                points={points}
                fill="none"
                stroke={device.color}
                strokeWidth="2.5"
                strokeLinejoin="round"
                strokeLinecap="round"
                opacity={opacity}
              />
              {days.map((day, index) => {
                const value = device.values[day]?.[metric] ?? 0;
                if (value === 0) return null;
                const { x, y } = pointFor(value, index);
                return (
                  <circle
                    key={`${device.id}-${day}`}
                    cx={x}
                    cy={y}
                    r="3.5"
                    fill={device.color}
                    opacity={opacity}
                  >
                    <title>{`${device.label}, ${day}: ${value} ${metric}`}</title>
                  </circle>
                );
              })}
            </g>
          );
        })}

        {days.map((day, index) => {
          if (index % labelEvery !== 0) return null;
          const x = margin.left + (days.length > 1 ? index * xStep : chartWidth / 2);
          return (
            <g key={day}>
              <line
                x1={x}
                x2={x}
                y1={margin.top + chartHeight}
                y2={margin.top + chartHeight + 5}
                stroke="#9ca3af"
              />
              <text
                x={x}
                y={height - 14}
                textAnchor="middle"
                className="fill-gray-500 text-[11px]"
              >
                {formatDay(day)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function AdminDeviceActivityChart({ data }: { data: TransferDeviceEventDay[] }) {
  const { days, devices } = useMemo(() => buildSeries(data), [data]);
  const [activeDeviceIds, setActiveDeviceIds] = useState<string[]>([]);
  const yMax = Math.max(
    1,
    ...devices.flatMap((device) =>
      days.flatMap((day) => [
        device.values[day]?.uploads ?? 0,
        device.values[day]?.downloads ?? 0,
      ])
    )
  );

  if (days.length === 0 || devices.length === 0) {
    return (
      <div className="text-sm text-gray-500 border border-dashed border-gray-300 rounded p-6 text-center">
        No device activity has been recorded yet.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <p className="text-sm text-gray-500">Daily event counts, split by device</p>
        <p className="text-xs text-gray-400">
          {formatDay(days[0])} - {formatDay(days[days.length - 1])}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <div>
          <div className="space-y-2">
            {devices.map((device) => {
              const active = activeDeviceIds.includes(device.id);
              const dimmed = activeDeviceIds.length > 0 && !active;
              return (
                <button
                  key={device.id}
                  type="button"
                  onClick={() =>
                    setActiveDeviceIds((current) =>
                      current.includes(device.id)
                        ? current.filter((id) => id !== device.id)
                        : [...current, device.id]
                    )
                  }
                  className={`flex w-full items-start gap-2 rounded border px-3 py-2 text-left text-xs cursor-pointer transition ${
                    active ? "border-gray-900 bg-gray-50" : "border-gray-200 bg-white hover:bg-gray-50"
                  } ${dimmed ? "opacity-40" : "opacity-100"}`}
                >
                  <span className="mt-1 h-3 w-3 shrink-0" style={{ backgroundColor: device.color }} />
                  <span>
                    <span className="block font-medium leading-snug text-gray-700">{device.label}</span>
                    {device.city && <span className="block text-gray-400">{device.city}</span>}
                  </span>
                </button>
              );
            })}
          </div>
          {activeDeviceIds.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveDeviceIds([])}
              className="mt-3 px-2 py-1 text-xs border rounded bg-white hover:bg-gray-50 cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        <div className="space-y-7 min-w-0">
          <DeviceLineChart
            title="Uploads Over Time"
            metric="uploads"
            days={days}
            devices={devices}
            activeDeviceIds={activeDeviceIds}
            yMax={yMax}
          />
          <DeviceLineChart
            title="Downloads Over Time"
            metric="downloads"
            days={days}
            devices={devices}
            activeDeviceIds={activeDeviceIds}
            yMax={yMax}
          />
        </div>
      </div>
    </div>
  );
}
