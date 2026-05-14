import { DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDevice, incrementDownloads, recordDownload } from "@/lib/d1";
import { getPusherServer } from "@/lib/pusher";
import { getR2, R2_BUCKET } from "@/lib/r2";
import {
  displayNameFromObjectKey,
  objectKeyBelongsToBox,
  objectKeyFromId,
} from "@/lib/r2-object-keys";
import { SESSION_COOKIE_NAME, validateSessionValue } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function contentDisposition(filename: string) {
  const asciiSafe = filename
    .normalize("NFC")
    .replace(/["\\]/g, (match) => (match === '"' ? '\\"' : "\\\\"))
    .replace(/[^\x20-\x7E]/g, "_");
  const utf8Encoded = encodeURIComponent(filename);
  return `attachment; filename="${asciiSafe}"; filename*=UTF-8''${utf8Encoded}`;
}

async function getDisplayName(key: string, box: string) {
  try {
    const metaResponse = await getR2().send(
      new GetObjectCommand({
        Bucket: R2_BUCKET,
        Key: `${key}.meta.json`,
      })
    );
    const metaBody = await metaResponse.Body?.transformToString();
    if (!metaBody) return displayNameFromObjectKey(key, box);

    const metadata = JSON.parse(metaBody);
    return metadata.originalName || displayNameFromObjectKey(key, box);
  } catch {
    return displayNameFromObjectKey(key, box);
  }
}

async function recordReceive(box: string, fileName: string) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const secret = process.env.SESSION_SECRET;
    if (!sessionCookie || !secret) return;

    const result = validateSessionValue(secret, sessionCookie);
    if (!result.valid) return;

    await incrementDownloads(result.deviceId);
    try {
      const device = await getDevice(result.deviceId);
      await recordDownload(
        fileName,
        parseInt(box),
        result.deviceId,
        device?.name || "",
        device?.city || ""
      );
    } catch (err) {
      console.error("[Download] Failed to record download transfer:", err);
    }
  } catch (err) {
    console.error("[Download] Failed to increment download count:", err);
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ box: string; keyId: string }> }
) {
  const { box, keyId } = await params;
  const key = objectKeyFromId(keyId);

  if (!objectKeyBelongsToBox(key, box)) {
    return NextResponse.json({ error: "Invalid object key" }, { status: 400 });
  }

  const keep = request.nextUrl.searchParams.get("keep") === "true";
  const directDownload = request.nextUrl.searchParams.get("download") === "true";
  const downloadName = await getDisplayName(key, box);

  try {
    if (keep && directDownload) {
      const signedUrl = await getSignedUrl(
        getR2(),
        new GetObjectCommand({
          Bucket: R2_BUCKET,
          Key: key,
          ResponseContentDisposition: contentDisposition(downloadName),
          ResponseContentType: "application/octet-stream",
        }),
        { expiresIn: 300 }
      );

      return NextResponse.redirect(signedUrl);
    }

    const s3Response = await getR2().send(new GetObjectCommand({ Bucket: R2_BUCKET, Key: key }));

    if (!s3Response.Body || typeof s3Response.Body.transformToWebStream !== "function") {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    await recordReceive(box, downloadName);

    const src = s3Response.Body.transformToWebStream();
    const reader = src.getReader();

    const stream = new ReadableStream({
      async pull(controller) {
        const { value, done } = await reader.read();
        if (done) {
          try {
            if (!keep) {
              await getR2().send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }));
              try {
                await getR2().send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: `${key}.meta.json` }));
              } catch {
                // Metadata file may not exist.
              }
              await getPusherServer().trigger("garden", "file-deleted", {
                boxNumber: box,
                fileName: downloadName,
              });
            }
          } catch (err) {
            console.error("[API] post-stream cleanup failed", err);
          } finally {
            controller.close();
          }
          return;
        }
        controller.enqueue(value);
      },
      async cancel(reason) {
        try {
          console.warn("[API] client aborted stream", reason);
        } finally {
          try {
            await reader.cancel();
          } catch {
            // Ignore cancellation cleanup failures.
          }
        }
      },
    });

    const headers = new Headers();
    headers.set("Content-Type", "application/octet-stream");
    headers.set("Content-Disposition", contentDisposition(downloadName));
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Cache-Control", "no-store");
    headers.set("Accept-Ranges", "bytes");

    return new Response(stream, { headers });
  } catch (err) {
    console.error(`[API] Download error for ${key}:`, err);
    const message = err instanceof Error ? err.message : "Unknown error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ box: string; keyId: string }> }
) {
  const { box, keyId } = await params;
  const key = objectKeyFromId(keyId);

  if (!objectKeyBelongsToBox(key, box)) {
    return NextResponse.json({ error: "Invalid object key" }, { status: 400 });
  }

  const fileName = await getDisplayName(key, box);

  try {
    await getR2().send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }));
    try {
      await getR2().send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: `${key}.meta.json` }));
    } catch {
      // Metadata file may not exist.
    }

    await getPusherServer().trigger("garden", "file-deleted", {
      boxNumber: box,
      fileName,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("delete file error:", err);
    const message = err instanceof Error ? err.message : "Unknown error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
