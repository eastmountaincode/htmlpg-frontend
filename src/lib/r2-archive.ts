import { CopyObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";
import { getR2, R2_BUCKET } from "@/lib/r2";
import { objectKeyBelongsToBox } from "@/lib/r2-object-keys";

const ARCHIVE_PREFIX = (process.env.R2_ARCHIVE_PREFIX || "archive/uploads").replace(/^\/+|\/+$/g, "");

interface ArchiveUploadedFileArgs {
  box: string;
  key: string;
  metaKey?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
}

function copySource(bucket: string, key: string) {
  const encodedKey = key.split("/").map(encodeURIComponent).join("/");
  return `${bucket}/${encodedKey}`;
}

function safeName(name: string | undefined) {
  const base = (name || "upload")
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 120);

  return base || "upload";
}

function archiveKeyFor(box: string, sourceKey: string, fileName?: string) {
  const now = new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  const timestamp = now.toISOString().replace(/[:.]/g, "-");
  const sourceId = sourceKey.split("/").pop() || randomUUID();

  return `${ARCHIVE_PREFIX}/${year}/${month}/${day}/${timestamp}_box${box}_${sourceId}_${safeName(fileName)}`;
}

async function copyR2Object(sourceKey: string, destinationKey: string) {
  await getR2().send(
    new CopyObjectCommand({
      Bucket: R2_BUCKET,
      Key: destinationKey,
      CopySource: copySource(R2_BUCKET, sourceKey),
      MetadataDirective: "COPY",
    })
  );
}

export async function archiveUploadedFile({
  box,
  key,
  metaKey,
  fileName,
  fileType,
  fileSize,
}: ArchiveUploadedFileArgs) {
  if (!R2_BUCKET) {
    throw new Error("R2 bucket configuration missing");
  }

  if (!objectKeyBelongsToBox(key, box)) {
    throw new Error(`Refusing to archive key outside box ${box}: ${key}`);
  }

  const archiveKey = archiveKeyFor(box, key, fileName);
  await copyR2Object(key, archiveKey);

  const expectedMetaKey = `${key}.meta.json`;
  if (metaKey && metaKey === expectedMetaKey) {
    try {
      await copyR2Object(metaKey, `${archiveKey}.meta.json`);
    } catch (err) {
      console.error("[Archive] File archived but metadata sidecar copy failed", {
        sourceKey: metaKey,
        archiveKey: `${archiveKey}.meta.json`,
        err,
      });
    }
  }

  console.log("[Archive] Uploaded file archived", {
    sourceKey: key,
    archiveKey,
    box,
    fileName,
    fileType,
    fileSize,
  });
}
