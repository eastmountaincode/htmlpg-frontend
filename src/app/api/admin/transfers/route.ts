import { NextResponse } from "next/server";
import { getTransfers, createTransfersTable } from "@/lib/d1";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/admin/transfers - Get transfer history
export async function GET() {
  try {
    const transfers = await getTransfers(200);
    return NextResponse.json(transfers);
  } catch {
    return NextResponse.json({ error: "Failed to fetch transfers" }, { status: 500 });
  }
}

// POST /api/admin/transfers/init - Create transfers table
export async function POST() {
  try {
    await createTransfersTable();
    return NextResponse.json({ success: true, message: "Transfers table created" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
