import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';

// ─── Storj S3-compatible Storage ──────────────────────────────────────────────
// Free tier: 150 GB storage · 150 GB/month bandwidth · no per-file size limit
// S3-compatible endpoint — uses AWS SDK v3 under the hood.
//
// Required env vars (add these to backend/.env):
//   STORJ_ENDPOINT      — your Storj S3 gateway, e.g. https://gateway.storjshare.io
//   STORJ_ACCESS_KEY    — Storj S3-compatible access key ID
//   STORJ_SECRET_KEY    — Storj S3-compatible secret access key
//   STORJ_BUCKET        — bucket name you created in Storj (e.g. taskflow)
//   STORJ_LINK_ACCESS   — public linksharing access key from Storj dashboard
//                         (Storj does NOT support S3 ACLs — public URLs require
//                          a linksharing access grant tied to your bucket)
//
// How to get STORJ_LINK_ACCESS:
//   Storj dashboard → Access Keys → Create Access Grant →
//   Permission: Download only → Bucket: taskflow → Generate →
//   copy the "Access Grant" string (starts with 1...) → paste as STORJ_LINK_ACCESS

function getClient(): S3Client {
  const endpoint  = process.env.STORJ_ENDPOINT;
  const accessKey = process.env.STORJ_ACCESS_KEY;
  const secretKey = process.env.STORJ_SECRET_KEY;

  if (!endpoint || !accessKey || !secretKey) {
    throw new Error(
      'Storj not configured. Set STORJ_ENDPOINT, STORJ_ACCESS_KEY and STORJ_SECRET_KEY in .env'
    );
  }

  return new S3Client({
    endpoint,
    region: 'us-1',            // Storj ignores region but AWS SDK requires a value
    credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
    forcePathStyle: true,      // required for Storj S3-compatible gateway
  });
}

function getBucket(): string {
  const bucket = process.env.STORJ_BUCKET;
  if (!bucket) throw new Error('STORJ_BUCKET env var is not set.');
  return bucket;
}

// ─── Folder name helper ───────────────────────────────────────────────────────

/**
 * Builds the per-task subfolder name: "yyyymmdd-TaskName"
 * e.g. "20260801-MAN7INE Assignment 2"
 * Invalid path characters are stripped so the key is safe in any S3 client.
 */
function taskFolder(taskTitle: string, createdAt: Date): string {
  const yyyy = createdAt.getUTCFullYear();
  const mm   = String(createdAt.getUTCMonth() + 1).padStart(2, '0');
  const dd   = String(createdAt.getUTCDate()).padStart(2, '0');
  // Keep letters, digits, spaces, hyphens and dots; strip everything else
  const safeTitle = taskTitle.replace(/[^\w\s.\-]/g, '').trim();
  return `${yyyy}${mm}${dd}-${safeTitle}`;
}

// ─── Upload ───────────────────────────────────────────────────────────────────

/**
 * Upload any file to Storj.
 * Automatically uses multipart upload for large files (handled by @aws-sdk/lib-storage).
 * Files are organised under: <bucket>/<yyyymmdd-TaskName>/<filename>
 *
 * Returns:
 *   fileId      — full S3 object key  (used for deletion)
 *   webViewLink — public HTTPS URL for direct browser access / download
 */
export async function uploadFileToDrive(params: {
  fileName:       string;
  mimeType:       string;
  buffer:         Buffer;
  taskId?:        string;
  taskTitle?:     string;
  taskCreatedAt?: Date;
  // 'Materials'            → <task-folder>/Materials/<file>
  // 'Submitted Work/v<n>'  → <task-folder>/Submitted Work/v<n>/<file>
  // omitted                → <task-folder>/Materials/<file>  (default)
  fileCategory?:  string;
}): Promise<{ fileId: string; webViewLink: string }> {
  const client = getClient();
  const bucket = getBucket();

  // Build object key: <yyyymmdd-TaskName>/<fileCategory>/<fileName>
  const taskDir = (params.taskTitle && params.taskCreatedAt)
    ? taskFolder(params.taskTitle, params.taskCreatedAt)
    : (params.taskId ?? 'uploads');

  const category = params.fileCategory || 'Materials';
  const safeFilename = params.fileName.replace(/[^\w.\-\s]/g, '_');
  const key = `${taskDir}/${category}/${safeFilename}`;

  const upload = new Upload({
    client,
    params: {
      Bucket:      bucket,
      Key:         key,
      Body:        params.buffer,
      ContentType: params.mimeType,
      // NOTE: Storj does not support S3 ACLs — public access is via linksharing grant
    },
    // Multipart kicks in automatically for files > partSize
    queueSize: 4,
    partSize:  64 * 1024 * 1024,   // 64 MB parts — well within Storj's 5 GB part limit
    leavePartsOnError: false,
  });

  await upload.done();

  // Public download URL via Storj linksharing service.
  // Format: https://link.storjshare.io/s/<access-grant>/<bucket>/<encoded-key>
  const linkAccess = process.env.STORJ_LINK_ACCESS;
  if (!linkAccess) throw new Error('STORJ_LINK_ACCESS env var is not set. See drive.ts for setup instructions.');
  const encodedKey = key.split('/').map(encodeURIComponent).join('/');
  const webViewLink = `https://link.storjshare.io/s/${linkAccess}/${bucket}/${encodedKey}`;

  return { fileId: key, webViewLink };
}

// ─── Delete ───────────────────────────────────────────────────────────────────

/**
 * Delete a file from Storj by its object key (the fileId returned by uploadFileToDrive).
 */
export async function deleteFileFromDrive(fileId: string): Promise<void> {
  const client = getClient();
  const bucket = getBucket();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: fileId }));
}
