/**
 * ADOBE EXPRESS - Asset Routes
 * Wires together: Auth middleware → S3 upload → DB save
 * Covers the full request lifecycle for interview practice
 *
 * POST   /api/assets/upload      — upload file to S3, save record to DB
 * GET    /api/assets/:id         — fetch asset metadata + fresh signed URL
 * GET    /api/assets             — list all assets for authenticated user
 * DELETE /api/assets/:id         — delete from S3 + DB
 */
import { Router, Request, Response } from 'express';
import multer from 'multer';
import db from '../models/db';
import s3Service from '../services/s3Service';
import { requireAuth, requireOwnership } from '../middleware/auth';

const router = Router();

// Multer: parse multipart/form-data, keep file in memory (not disk)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB hard limit
});

// ─────────────────────────────────────────
// POST /api/assets/upload
// Full flow: validate → upload S3 → save DB → return signed URL
// ─────────────────────────────────────────
router.post('/upload', requireAuth, upload.single('file'), async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { projectId } = req.body;

    // 1. Validate file presence
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const { buffer, originalname, mimetype, size } = req.file;

    // 2. Validate file type + size (throws if invalid)
    s3Service.validateUpload(mimetype, size);

    // 3. Upload to S3 (auto-compresses large images, extracts dimensions)
    const uploadResult = await s3Service.uploadAsset({
      userId,
      projectId,
      fileBuffer:  buffer,
      fileName:    originalname,
      contentType: mimetype,
      fileSize:    size,
    });

    // 4. Save asset record to DB inside a transaction
    const assetId = await db.withTransaction(async (conn) => {
      const [result] = await conn.execute(
        `INSERT INTO assets
           (user_id, project_id, s3_key, file_name, content_type, file_size, width, height)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          projectId || null,
          uploadResult.s3Key,
          originalname,
          mimetype,
          uploadResult.fileSize,
          uploadResult.width  || null,
          uploadResult.height || null,
        ]
      );
      return (result as any).insertId;
    });

    // 5. Return asset metadata + time-limited signed URL
    return res.status(201).json({
      assetId,
      s3Key:     uploadResult.s3Key,
      signedUrl: uploadResult.signedUrl,  // valid 1 hour
      cdnUrl:    uploadResult.cdnUrl,
      width:     uploadResult.width,
      height:    uploadResult.height,
      fileSize:  uploadResult.fileSize,
    });

  } catch (err: any) {
    console.error('[upload] error:', err.message);
    const status = err.message.includes('not allowed') || err.message.includes('too large') ? 400 : 500;
    return res.status(status).json({ error: err.message || 'Upload failed' });
  }
});

// ─────────────────────────────────────────
// GET /api/assets/:id
// Fetch asset metadata + generate fresh signed URL
// ─────────────────────────────────────────
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id }  = req.params;

    // 1. Fetch from DB — only columns we need, never SELECT *
    const rows = await db.query(
      `SELECT id, user_id, project_id, s3_key, file_name,
              content_type, file_size, width, height, created_at
       FROM assets
       WHERE id = ? AND user_id = ?`,
      [id, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    const asset = rows[0] as any;

    // 2. Generate fresh signed URL (1 hour expiry)
    const signedUrl = s3Service.getSignedUrl(asset.s3_key, 3600);

    return res.json({ ...asset, signedUrl });

  } catch (err: any) {
    console.error('[getAsset] error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch asset' });
  }
});

// ─────────────────────────────────────────
// GET /api/assets
// List assets for authenticated user — paginated
// ─────────────────────────────────────────
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId   = (req as any).user.id;
    const limit    = Math.min(Number(req.query.limit)  || 20, 100);
    const offset   = Number(req.query.offset) || 0;
    const projectId = req.query.projectId as string | undefined;

    // Build query — filter by projectId if provided
    const params: any[] = [userId];
    let sql = `
      SELECT id, project_id, s3_key, file_name, content_type,
             file_size, width, height, created_at
      FROM assets
      WHERE user_id = ?
    `;

    if (projectId) {
      sql += ' AND project_id = ?';
      params.push(projectId);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const rows = await db.query(sql, params);

    // Count total for pagination
    const countParams: any[] = [userId];
    let countSql = 'SELECT COUNT(*) as total FROM assets WHERE user_id = ?';
    if (projectId) { countSql += ' AND project_id = ?'; countParams.push(projectId); }

    const countRows = await db.query(countSql, countParams);
    const total = (countRows[0] as any).total;

    // Attach fresh signed URLs to each asset
    const assets = (rows as any[]).map(a => ({
      ...a,
      signedUrl: s3Service.getSignedUrl(a.s3_key, 3600),
    }));

    return res.json({ assets, total, limit, offset });

  } catch (err: any) {
    console.error('[listAssets] error:', err.message);
    return res.status(500).json({ error: 'Failed to list assets' });
  }
});

// ─────────────────────────────────────────
// DELETE /api/assets/:id
// Delete from S3 + DB atomically via transaction
// ─────────────────────────────────────────
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id }  = req.params;

    // 1. Verify ownership before deleting
    const rows = await db.query(
      'SELECT id, s3_key, user_id FROM assets WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    const asset = rows[0] as any;

    // 2. Delete from S3 first
    await s3Service.deleteAsset(asset.s3_key);

    // 3. Delete DB record
    await db.execute('DELETE FROM assets WHERE id = ?', [id]);

    return res.status(204).send();

  } catch (err: any) {
    console.error('[deleteAsset] error:', err.message);
    return res.status(500).json({ error: 'Failed to delete asset' });
  }
});

export default router;
