import { ListObjectsV2Command, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getDevice, getDevices } from "@/lib/d1";
import { getR2, R2_BUCKET } from "@/lib/r2";
import { createStorageObjectKey, displayNameFromObjectKey, objectKeyToId } from "@/lib/r2-object-keys";
import { validateSessionValue, SESSION_COOKIE_NAME } from "@/lib/session";
import { createUploadToken } from "@/lib/upload-token";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getUploadSource() {
    if (process.env.NODE_ENV === 'development') {
        const devices = await getDevices();
        const first = devices[0];
        if (!first?.id) return null;
        return {
            deviceId: first.id,
            name: first.name || null,
            city: first.city || null,
        };
    }

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const sessionSecret = process.env.SESSION_SECRET;

    if (!sessionCookie || !sessionSecret) return null;

    const result = validateSessionValue(sessionSecret, sessionCookie);
    if (!result.valid) return null;

    const device = await getDevice(result.deviceId);
    return {
        deviceId: result.deviceId,
        name: device?.name || null,
        city: device?.city || null,
    };
}

// GET /api/boxes/:box/files - List files in a box (with metadata)
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ box: string }> }
) {
    const { box } = await params;

    if (!R2_BUCKET) {
        return NextResponse.json({ error: "R2 bucket configuration missing" }, { status: 500 });
    }

    const prefix = `box${box}/`;

    try {
        const data = await getR2().send(
            new ListObjectsV2Command({
                Bucket: R2_BUCKET,
                Prefix: prefix
            })
        );

        if (!data.Contents || data.Contents.length === 0) {
            return NextResponse.json({ empty: true });
        }

        // Filter out meta files and empty entries
        const actualFiles = data.Contents.filter(obj => {
            const key = obj.Key || "";
            return !key.endsWith('/') && !key.endsWith('.meta.json') && (obj.Size || 0) > 0;
        });

        if (actualFiles.length === 0) {
            return NextResponse.json({ empty: true });
        }

        const file = actualFiles[0];
        const objectKey = file.Key || "";
        let fileName = displayNameFromObjectKey(objectKey, box);

        // Try to fetch metadata sidecar
        let source = null;
        try {
            const metaKey = `${objectKey}.meta.json`;
            const metaResponse = await getR2().send(
                new GetObjectCommand({
                    Bucket: R2_BUCKET,
                    Key: metaKey
                })
            );
            const metaBody = await metaResponse.Body?.transformToString();
            if (metaBody) {
                const metadata = JSON.parse(metaBody);
                source = metadata.source || null;
                fileName = metadata.originalName || fileName;
            }
        } catch {
            // No metadata file — that's fine, source stays null
        }

        return NextResponse.json({
            empty: false,
            name: fileName,
            keyId: objectKeyToId(objectKey),
            size: file.Size || 0,
            source
        });
    } catch (err) {
        console.error(`[API] List files error for box ${box}:`, err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}

// POST /api/boxes/:box/files - Create metadata and get a presigned PUT URL for the file
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ box: string }> }
) {
    const { box } = await params;

    try {
        const { fileName, fileType, fileSize } = await request.json();

        if (!fileName || !fileType) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        if (!R2_BUCKET) {
            return NextResponse.json({ error: "R2 bucket configuration missing" }, { status: 500 });
        }

        const source = await getUploadSource();
        if (!source) {
            return NextResponse.json({ error: "No valid upload session" }, { status: 401 });
        }

        const key = createStorageObjectKey(box, fileName);
        const metaKey = `${key}.meta.json`;
        const sessionSecret = process.env.SESSION_SECRET;

        await getR2().send(
            new PutObjectCommand({
                Bucket: R2_BUCKET,
                Key: metaKey,
                ContentType: 'application/json',
                Body: JSON.stringify({
                    source,
                    uploadedAt: new Date().toISOString(),
                    originalName: fileName,
                    mimeType: fileType,
                    size: typeof fileSize === "number" ? fileSize : 0,
                }),
            })
        );

        // Presigned URL for the file
        const fileUrl = await getSignedUrl(
            getR2(),
            new PutObjectCommand({
                Bucket: R2_BUCKET,
                Key: key,
                ContentType: fileType,
            }),
            { expiresIn: 900 }
        );

        const uploadToken = sessionSecret
            ? createUploadToken(sessionSecret, { box, key, deviceId: source.deviceId })
            : undefined;

        return NextResponse.json({ 
            url: fileUrl,       // Keep 'url' for backwards compatibility
            fileUrl,
            key,
            metaKey,
            uploadToken,
        }, { status: 200 });

    } catch (err) {
        console.error("presign error:", err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
