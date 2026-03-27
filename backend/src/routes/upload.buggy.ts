/**
 * ADOBE EXPRESS - Media Upload Route (BUGGY VERSION)
 * CODE DIAGNOSE EXERCISE: Find 4 critical security issues
 * Difficulty: P0 - Security
 */
import { Request, Response } from 'express';
import AWS from 'aws-sdk';

const s3 = new AWS.S3();

// BUG 1: No auth middleware - anyone can upload
// BUG 2: No file validation middleware
export async function uploadMedia(req: Request, res: Response) {
  const { filename, fileData, userId } = req.body;

  const params = {
    Bucket: 'adobe-express-assets',
    // BUG 3: User controls S3 key - path traversal attack possible
    Key: filename,
    Body: Buffer.from(fileData, 'base64'),
    ContentType: req.body.contentType,
    // BUG 4: ALL uploads are public - should be private + signed URL
    ACL: 'public-read',
  };

  const result = await s3.upload(params).promise();

  // BUG 5: SQL injection via template literal
  await db.query(
    `INSERT INTO assets VALUES ('${userId}', '${filename}', '${result.Location}')`
  );

  // BUG 6: No error handling - unhandled promise rejection crashes server
  res.json({ url: result.Location });
}
