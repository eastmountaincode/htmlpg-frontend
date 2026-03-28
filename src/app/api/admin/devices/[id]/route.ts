import { NextRequest, NextResponse } from "next/server";
import { getDevice, updateDevice, deleteDevice, resetCounters } from "@/lib/d1";
import { ADMIN_COOKIE_NAME, validateAdminCookie } from "@/lib/admin-session";
import { cookies } from "next/headers";

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
  const { name, city, notes } = body;

  if (!name && !city && notes === undefined) {
    return NextResponse.json(
      { error: "At least one field (name, city, notes) is required" },
      { status: 400 }
    );
  }

  const device = await updateDevice(id, { name, city, notes });
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
