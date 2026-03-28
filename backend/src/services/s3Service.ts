/**
 * ADOBE EXPRESS - S3 Service
 * Covers: upload, signed URL, delete, copy, metadata
 * All uploads are PRIVATE — served via signed URLs or CloudFront
 */
import AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';

// ─────────────────────────────────────────
// S3 Client Setup
// ─────────────────────────────────────────
const s3 = new AWS.S3({
  region: process.env.AWS_REGION || 'us-east-1',
  accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const BUCKET = process.env.S3_BUCKET || 'adobe-express-assets';
const CDN_URL = process.env.CDN_URL  || '';

// Allowed MIME types per use case
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm'];
const ALLOWED_EXPORT_TYPES = ['image/png', 'image/jpeg', 'application/pdf', 'image/svg+xml'];
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // 50 MB

// ─────────────────────────────────────────
// Types
// ─────────────────────────────────────────
export interface UploadInput {
  userId:      string;
  projectId?:  string;
  fileBuffer:  Buffer;
  fileName:    string;
  contentType: string;
  fileSize:    number;
}

export interface UploadResult {
  s3Key:       string;
  cdnUrl:      string;
  signedUrl:   string;
  fileSize:    number;
  width?:      number;
  height?:     number;
}

// ─────────────────────────────────────────
// Validate upload before touching S3
// ─────────────────────────────────────────
export function validateUpload(contentType: string, fileSize: number): void {
  const allowed = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];
  if (!allowed.includes(contentType)) {
    throw new Error(`File type not allowed: ${contentType}`);
  }
  if (fileSize > MAX_UPLOAD_BYTES) {
    throw new Error(`File too large. Max ${MAX_UPLOAD_BYTES / 1024 / 1024}MB`);
  }
}

// ─────────────────────────────────────────
// Upload asset to S3
// ─────────────────────────────────────────
export async function uploadAsset(input: UploadInput): Promise<UploadResult> {
  validateUpload(input.contentType, input.fileSize);

  // Build a safe, non-guessable S3 key
  const ext = input.contentType.split('/')[1].replace('jpeg', 'jpg');
  const s3Key = `users/${input.userId}/assets/${uuidv4()}.${ext}`;

  // Auto-generate thumbnail for images
  let width: number | undefined;
  let height: number | undefined;

  let uploadBuffer = input.fileBuffer;

  if (ALLOWED_IMAGE_TYPES.includes(input.contentType) && input.contentType !== 'image/svg+xml') {
    const meta = await sharp(input.fileBuffer).metadata();
    width  = meta.width;
    height = meta.height;

    // Auto-compress large images to keep S3 costs down
    if (input.fileSize > 2 * 1024 * 1024) {
      uploadBuffer = await sharp(input.fileBuffer)
        .resize({ width: 3000, withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer();
    }
  }

  // Upload to S3 — always PRIVATE
  await s3.putObject({
    Bucket:      BUCKET,
    Key:         s3Key,
    Body:        uploadBuffer,
    ContentType: input.contentType,
    ACL:         'private',
    Metadata: {
      userId:    input.userId,
      projectId: input.projectId || '',
      fileName:  input.fileName,
    },
  }).promise();

  const signedUrl = getSignedUrl(s3Key);
  const cdnUrl    = CDN_URL ? `${CDN_URL}/${s3Key}` : signedUrl;

  return { s3Key, cdnUrl, signedUrl, fileSize: uploadBuffer.length, width, height };
}

// ─────────────────────────────────────────
// Upload export (PNG/PDF) to S3
// ─────────────────────────────────────────
export async function uploadExport(
  userId: string,
  projectId: string,
  fileBuffer: Buffer,
  format: 'png' | 'jpg' | 'pdf' | 'svg'
): Promise<string> {
  const contentTypeMap: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    pdf: 'application/pdf',
    svg: 'image/svg+xml',
  };

  const s3Key = `users/${userId}/exports/${projectId}/${uuidv4()}.${format}`;

  await s3.putObject({
    Bucket:      BUCKET,
    Key:         s3Key,
    Body:        fileBuffer,
    ContentType: contentTypeMap[format],
    ACL:         'private',
  }).promise();

  return s3Key;
}

// ─────────────────────────────────────────
// Generate Signed URL (time-limited access)
// Default: 1 hour expiry
// ─────────────────────────────────────────
export function getSignedUrl(s3Key: string, expiresIn = 3600): string {
  return s3.getSignedUrl('getObject', {
    Bucket:  BUCKET,
    Key:     s3Key,
    Expires: expiresIn,
  });
}

// ─────────────────────────────────────────
// Delete asset from S3
// ─────────────────────────────────────────
export async function deleteAsset(s3Key: string): Promise<void> {
  await s3.deleteObject({ Bucket: BUCKET, Key: s3Key }).promise();
}

// ─────────────────────────────────────────
// Copy asset (e.g. duplicate a template)
// ─────────────────────────────────────────
export async function copyAsset(
  sourceKey: string,
  destUserId: string
): Promise<string> {
  const ext    = sourceKey.split('.').pop();
  const destKey = `users/${destUserId}/assets/${uuidv4()}.${ext}`;

  await s3.copyObject({
    Bucket:     BUCKET,
    CopySource: `${BUCKET}/${sourceKey}`,
    Key:        destKey,
    ACL:        'private',
  }).promise();

  return destKey;
}

// ─────────────────────────────────────────
// Check if S3 key exists
// ─────────────────────────────────────────
export async function assetExists(s3Key: string): Promise<boolean> {
  try {
    await s3.headObject({ Bucket: BUCKET, Key: s3Key }).promise();
    return true;
  } catch {
    return false;
  }
}

export default { uploadAsset, uploadExport, getSignedUrl, deleteAsset, copyAsset, assetExists, validateUpload };
