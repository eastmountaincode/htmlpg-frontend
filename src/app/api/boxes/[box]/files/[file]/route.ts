import { GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getPusherServer } from "@/lib/pusher";
import { getR2, R2_BUCKET } from "@/lib/r2";
import { validateSessionValue, SESSION_COOKIE_NAME } from "@/lib/session";
import { incrementDownloads } from "@/lib/d1";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function contentDisposition(filename: string) {
    const asciiSafe = filename
        .normalize('NFC')
        .replace(/["\\]/g, match => (match === '"' ? '\\"' : '\\\\'))
        .replace(/[^\x20-\x7E]/g, '_');
    const utf8Encoded = encodeURIComponent(filename);
    return `attachment; filename="${asciiSafe}"; filename*=UTF-8''${utf8Encoded}`;
}

// GET /api/boxes/:box/files/:file - Stream file download (delete after transfer unless ?keep=true)
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ box: string; file: string }> }
) {
    const { box, file } = await params;
    const key = `box${box}/${file}`;
    const keep = request.nextUrl.searchParams.get('keep') === 'true';

    try {
        const s3Response = await getR2().send(new GetObjectCommand({ Bucket: R2_BUCKET, Key: key }));

        if (!s3Response.Body || typeof s3Response.Body.transformToWebStream !== 'function') {
            return new Response(JSON.stringify({ error: "File not found" }), { status: 404 });
        }

        // Track download count per device
        try {
            const cookieStore = await cookies();
            const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
            const secret = process.env.SESSION_SECRET;
            if (sessionCookie && secret) {
                const result = validateSessionValue(secret, sessionCookie);
                if (result.valid) {
                    await incrementDownloads(result.deviceId);
                }
            }
        } catch (err) {
            console.error("[Download] Failed to increment download count:", err);
        }

        const src = s3Response.Body.transformToWebStream();
        const reader = src.getReader();

        const stream = new ReadableStream({
            async pull(controller) {
                const { value, done } = await reader.read();
                if (done) {
                    try {
                        if (!keep) {
                            // Delete the file
                            await getR2().send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }));
                            // Delete the metadata sidecar (ignore if doesn't exist)
                            try {
                                await getR2().send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: `${key}.meta.json` }));
                            } catch { /* metadata file may not exist */ }
                            await getPusherServer().trigger('garden', 'file-deleted', {
                                boxNumber: box,
                                fileName: file
                            });
                        }
                    } catch (err) {
                        console.error('[API] post-stream cleanup failed', err);
                    } finally {
                        controller.close();
                    }
                    return;
                }
                controller.enqueue(value);
            },
            async cancel(reason) {
                try {
                    console.warn('[API] client aborted stream', reason);
                } finally {
                    try { await reader.cancel(); } catch { /* ignore */ }
                }
            }
        });

        const headers = new Headers();
        headers.set("Content-Type", "application/octet-stream");
        headers.set("Content-Disposition", contentDisposition(file));
        headers.set("X-Content-Type-Options", "nosniff");
        headers.set("Cache-Control", "no-store");
        headers.set("Accept-Ranges", "bytes");

        return new Response(stream, { headers });

    } catch (err) {
        console.error(`[API] Download error for ${key}:`, err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        return new Response(JSON.stringify({ error: errorMessage }), { status: 500 });
    }
}

// DELETE /api/boxes/:box/files/:file - Delete a specific file and its metadata
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ box: string; file: string }> }
) {
    const { box, file } = await params;
    const key = `box${box}/${file}`;

    try {
        // Delete the file
        await getR2().send(new DeleteObjectCommand({
            Bucket: R2_BUCKET,
            Key: key
        }));

        // Delete the metadata sidecar (ignore if doesn't exist)
        try {
            await getR2().send(new DeleteObjectCommand({
                Bucket: R2_BUCKET,
                Key: `${key}.meta.json`
            }));
        } catch { /* metadata file may not exist */ }

        await getPusherServer().trigger('garden', 'file-deleted', {
            boxNumber: box,
            fileName: file
        });

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("delete file error:", err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
