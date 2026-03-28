import { NextRequest, NextResponse } from "next/server";
import { getDevices, createDevice } from "@/lib/d1";
import { cookies } from "next/headers";
import { ADMIN_COOKIE_NAME, validateAdminCookie } from "@/lib/admin-session";

export const dynamic = "force-dynamic";

async function isAdmin(): Promise<boolean> {
  if (process.env.NODE_ENV === "development") return true;
  const cookieStore = await cookies();
  const adminCookie = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  const secret = process.env.SESSION_SECRET;
  if (!secret || !adminCookie) return false;
  return validateAdminCookie(secret, adminCookie);
}

// GET /api/admin/devices - List all devices
export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const devices = await getDevices();
  return NextResponse.json({ devices });
}

// POST /api/admin/devices - Create a new device
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { id, name, city } = body;

  if (!id || !name || !city) {
    return NextResponse.json(
      { error: "id, name, and city are required" },
      { status: 400 }
    );
  }

  try {
    const device = await createDevice(id, name, city);
    return NextResponse.json({ device }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
