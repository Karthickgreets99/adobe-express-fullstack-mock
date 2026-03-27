/**
 * ADOBE EXPRESS - Media Upload Route (FIXED VERSION)
 * All security issues resolved
 */
import { Request, Response } from 'express';
import AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import db from '../models/db';

const s3 = new AWS.S3();

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4'];
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

// FIX 1: Auth middleware applied at route level in routes/index.ts
// FIX 2: File validation middleware
export function validateUpload(req: Request, res: Response, next: Function) {
  const { fileData, contentType, fileSize } = req.body;

  if (!ALLOWED_MIME_TYPES.includes(contentType)) {
    return res.status(400).json({ error: 'File type not allowed' });
  }

  if (fileSize > MAX_FILE_SIZE_BYTES) {
    return res.status(400).json({ error: 'File too large. Max 50MB.' });
  }

  next();
}

export async function uploadMedia(req: Request, res: Response) {
  try {
    const { fileData, contentType } = req.body;
    // FIX 1: Get userId from authenticated token, not request body
    const userId = (req as any).user.id;

    // FIX 3: Generate UUID key - user cannot control S3 path
    const fileExtension = contentType.split('/')[1];
    const s3Key = `users/${userId}/assets/${uuidv4()}.${fileExtension}`;

    const params = {
      Bucket: 'adobe-express-assets',
      Key: s3Key,
      Body: Buffer.from(fileData, 'base64'),
      ContentType: contentType,
      // FIX 4: Private - serve via signed URL or CloudFront
      ACL: 'private',
    };

    const result = await s3.upload(params).promise();

    // FIX 5: Parameterised query - no SQL injection
    await db.query(
      'INSERT INTO assets (user_id, s3_key, location) VALUES (?, ?, ?)',
      [userId, s3Key, result.Location]
    );

    // Generate a signed URL valid for 1 hour
    const signedUrl = s3.getSignedUrl('getObject', {
      Bucket: 'adobe-express-assets',
      Key: s3Key,
      Expires: 3600,
    });

    res.json({ url: signedUrl, key: s3Key });

  } catch (error) {
    // FIX 6: Proper error handling
    console.error('Upload failed:', error);
    res.status(500).json({ error: 'Upload failed. Please try again.' });
  }
}
