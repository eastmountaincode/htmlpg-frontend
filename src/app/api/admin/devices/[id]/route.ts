import { NextRequest, NextResponse } from "next/server";
import { getDevice, updateDevice, deleteDevice, resetCounters } from "@/lib/d1";
import { ADMIN_COOKIE_NAME, validateAdminCookie } from "@/lib/admin-session";
import { cookies } from "next/headers";
import { geocodeAddress } from "@/lib/geocode";

export const dynamic = "force-dynamic";

async function isAdmin(): Promise<boolean> {
  if (process.env.NODE_ENV === "development") return true;
  const cookieStore = await cookies();
  const adminCookie = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  const secret = process.env.SESSION_SECRET;
  if (!secret || !adminCookie) return false;
  return validateAdminCookie(secret, adminCookie);
}

// PUT /api/admin/devices/[id] - Update a device
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { name, city, notes, address } = body;

  if (!name && !city && notes === undefined && address === undefined) {
    return NextResponse.json(
      { error: "At least one field (name, city, notes, address) is required" },
      { status: 400 }
    );
  }

  const update: {
    name?: string;
    city?: string;
    notes?: string;
    address?: string;
    map_lat?: number | null;
    map_lng?: number | null;
  } = { name, city, notes };

  if (address !== undefined) {
    const cleanAddress = String(address).trim();
    if (cleanAddress) {
      const geocoded = await geocodeAddress(cleanAddress);
      if (!geocoded) {
        return NextResponse.json(
          { error: "Address could not be found on the map" },
          { status: 400 }
        );
      }
      update.address = cleanAddress;
      update.map_lat = geocoded.lat;
      update.map_lng = geocoded.lng;
    } else {
      update.address = "";
      update.map_lat = null;
      update.map_lng = null;
    }
  }

  const device = await updateDevice(id, update);
  if (!device) {
    return NextResponse.json({ error: "Device not found" }, { status: 404 });
  }

  return NextResponse.json({ device });
}

// PATCH /api/admin/devices/[id]/reset-counters - Reset upload/download counters
export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await getDevice(id);
  if (!existing) {
    return NextResponse.json({ error: "Device not found" }, { status: 404 });
  }

  await resetCounters(id);
  return NextResponse.json({ success: true });
}

// DELETE /api/admin/devices/[id] - Delete a device
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await getDevice(id);
  if (!existing) {
    return NextResponse.json({ error: "Device not found" }, { status: 404 });
  }

  await deleteDevice(id);
  return NextResponse.json({ success: true });
}
