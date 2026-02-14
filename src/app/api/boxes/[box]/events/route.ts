import { NextRequest, NextResponse } from "next/server";
import { getPusherServer } from "@/lib/pusher";

// POST /api/boxes/:box/events - Trigger events for a box
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ box: string }> }
) {
    const { box } = await params;

    try {
        const { type, fileName, fileSize } = await request.json();

        if (!type) {
            return NextResponse.json({ error: "Event type is required" }, { status: 400 });
        }

        await getPusherServer().trigger('garden', type, {
            boxNumber: box,
            fileName,
            fileSize
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error triggering box event:', error);
        return NextResponse.json({ error: 'Failed to trigger event' }, { status: 500 });
    }
}
