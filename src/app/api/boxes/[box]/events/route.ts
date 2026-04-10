import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getPusherServer } from "@/lib/pusher";
import { validateSessionValue, SESSION_COOKIE_NAME } from "@/lib/session";
import { incrementUploads, recordUpload, getDevice } from "@/lib/d1";

// POST /api/boxes/:box/events - Trigger events for a box
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ box: string }> }
) {
    const { box } = await params;

    try {
        const { type, fileName, fileSize, fileType } = await request.json();

        if (!type) {
            return NextResponse.json({ error: "Event type is required" }, { status: 400 });
        }

        await getPusherServer().trigger('garden', type, {
            boxNumber: box,
            fileName,
            fileSize
        });

        // Track upload count per device
        if (type === "file-uploaded") {
            try {
                const cookieStore = await cookies();
                const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
                const secret = process.env.SESSION_SECRET;
                if (sessionCookie && secret) {
                    const result = validateSessionValue(secret, sessionCookie);
                    if (result.valid) {
                        await incrementUploads(result.deviceId);
                        try {
                            const device = await getDevice(result.deviceId);
                            await recordUpload(
                                fileName || '', fileType || '', fileSize || 0, parseInt(box),
                                result.deviceId, device?.name || '', device?.city || ''
                            );
                        } catch (err) {
                            console.error("[Events] Failed to record upload transfer:", err);
                        }
                    }
                }
            } catch (err) {
                console.error("[Events] Failed to increment upload count:", err);
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error triggering box event:', error);
        return NextResponse.json({ error: 'Failed to trigger event' }, { status: 500 });
    }
}
