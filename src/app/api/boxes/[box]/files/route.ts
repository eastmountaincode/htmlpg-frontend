import { ListObjectsV2Command, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextRequest, NextResponse } from "next/server";
import { getR2, R2_BUCKET } from "@/lib/r2";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/boxes/:box/files - List files in a box
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

        const actualFiles = data.Contents.filter(obj => {
            const key = obj.Key || "";
            return !key.endsWith('/') && (obj.Size || 0) > 0;
        });

        if (actualFiles.length === 0) {
            return NextResponse.json({ empty: true });
        }

        const file = actualFiles[0];
        const fileName = file.Key?.replace(prefix, "") || "";

        return NextResponse.json({
            empty: false,
            name: fileName,
            size: file.Size || 0
        });
    } catch (err) {
        console.error(`[API] List files error for box ${box}:`, err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}

// POST /api/boxes/:box/files - Get presigned PUT URL for upload
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ box: string }> }
) {
    const { box } = await params;

    try {
        const { fileName, fileType } = await request.json();

        if (!fileName || !fileType) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const key = `box${box}/${fileName}`;

        if (!R2_BUCKET) {
            return NextResponse.json({ error: "R2 bucket configuration missing" }, { status: 500 });
        }

        const url = await getSignedUrl(
            getR2(),
            new PutObjectCommand({
                Bucket: R2_BUCKET,
                Key: key,
                ContentType: fileType,
            }),
            { expiresIn: 120 }
        );

        return NextResponse.json({ url, key }, { status: 200 });

    } catch (err) {
        console.error("presign error:", err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
