import { ListObjectsV2Command, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextRequest, NextResponse } from "next/server";
import { getR2, R2_BUCKET } from "@/lib/r2";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
        const fileName = file.Key?.replace(prefix, "") || "";

        // Try to fetch metadata sidecar
        let source = null;
        try {
            const metaKey = `${file.Key}.meta.json`;
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
            }
        } catch {
            // No metadata file — that's fine, source stays null
        }

        return NextResponse.json({
            empty: false,
            name: fileName,
            size: file.Size || 0,
            source
        });
    } catch (err) {
        console.error(`[API] List files error for box ${box}:`, err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}

// POST /api/boxes/:box/files - Get presigned PUT URLs for file + metadata
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ box: string }> }
) {
    const { box } = await params;

    try {
        const { fileName, fileType, metadata } = await request.json();

        if (!fileName || !fileType) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        if (!R2_BUCKET) {
            return NextResponse.json({ error: "R2 bucket configuration missing" }, { status: 500 });
        }

        const key = `box${box}/${fileName}`;
        const metaKey = `${key}.meta.json`;

        // Presigned URL for the file
        const fileUrl = await getSignedUrl(
            getR2(),
            new PutObjectCommand({
                Bucket: R2_BUCKET,
                Key: key,
                ContentType: fileType,
            }),
            { expiresIn: 120 }
        );

        // Presigned URL for the metadata sidecar
        const metaUrl = await getSignedUrl(
            getR2(),
            new PutObjectCommand({
                Bucket: R2_BUCKET,
                Key: metaKey,
                ContentType: 'application/json',
            }),
            { expiresIn: 120 }
        );

        return NextResponse.json({ 
            url: fileUrl,       // Keep 'url' for backwards compatibility
            fileUrl,
            metaUrl,
            key,
            metaKey
        }, { status: 200 });

    } catch (err) {
        console.error("presign error:", err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
