import { after, NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getPusherServer } from "@/lib/pusher";
import { validateSessionValue, SESSION_COOKIE_NAME } from "@/lib/session";
import { incrementUploads, recordUpload, getDevice } from "@/lib/d1";
import { archiveUploadedFile } from "@/lib/r2-archive";
import { validateUploadToken } from "@/lib/upload-token";

// POST /api/boxes/:box/events - Trigger events for a box
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ box: string }> }
) {
    const { box } = await params;

    try {
        const { type, fileName, fileSize, fileType, key, metaKey, uploadToken } = await request.json();

        if (!type) {
            return NextResponse.json({ error: "Event type is required" }, { status: 400 });
        }

        if (type === "file-uploaded" && typeof key === "string") {
            after(async () => {
                try {
                    await archiveUploadedFile({
                        box,
                        key,
                        metaKey: typeof metaKey === "string" ? metaKey : undefined,
                        fileName: typeof fileName === "string" ? fileName : undefined,
                        fileType: typeof fileType === "string" ? fileType : undefined,
                        fileSize: typeof fileSize === "number" ? fileSize : undefined,
                    });
                } catch (err) {
                    console.error("[Archive] Failed to archive uploaded file", {
                        box,
                        key,
                        fileName,
                        err,
                    });
                }
            });
        }

        await getPusherServer().trigger('garden', type, {
            boxNumber: box,
            fileName,
            fileSize
        });

        // Track upload count per device
        if (type === "file-uploaded") {
            try {
                const secret = process.env.SESSION_SECRET;
                let uploadDeviceId: string | null = null;

                const cookieStore = await cookies();
                const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
                if (sessionCookie && secret) {
                    const result = validateSessionValue(secret, sessionCookie);
                    if (result.valid) {
                        uploadDeviceId = result.deviceId;
                    }
                }

                if (!uploadDeviceId && secret && typeof uploadToken === "string" && typeof key === "string") {
                    const result = validateUploadToken(secret, uploadToken, { box, key });
                    if (result.valid) {
                        uploadDeviceId = result.deviceId;
                    }
                }

                if (uploadDeviceId) {
                    await incrementUploads(uploadDeviceId);
                    try {
                        const device = await getDevice(uploadDeviceId);
                        await recordUpload(
                            fileName || '', fileType || '', fileSize || 0, parseInt(box),
                            uploadDeviceId, device?.name || '', device?.city || ''
                        );
                    } catch (err) {
                        console.error("[Events] Failed to record upload transfer:", err);
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
