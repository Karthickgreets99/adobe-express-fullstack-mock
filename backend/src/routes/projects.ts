/**
 * ADOBE EXPRESS - Projects Routes
 * Full DB CRUD for user design projects
 * Interview focus: parameterised queries, pagination, auth ownership
 *
 * GET    /api/projects           — list projects (paginated)
 * POST   /api/projects           — create project
 * GET    /api/projects/:id       — get single project
 * PATCH  /api/projects/:id       — update project
 * DELETE /api/projects/:id       — delete project + assets
 */
import { Router, Request, Response } from 'express';
import db from '../models/db';
import s3Service from '../services/s3Service';
import { requireAuth } from '../middleware/auth';

const router = Router();

// ─────────────────────────────────────────
// GET /api/projects — list with pagination
// ─────────────────────────────────────────
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId  = (req as any).user.id;
    const limit   = Math.min(Number(req.query.limit)  || 20, 100);
    const offset  = Number(req.query.offset) || 0;
    const search  = req.query.search as string | undefined;

    const params: any[] = [userId];
    let sql = `
      SELECT id, name, thumbnail_url, is_public, publish_status, created_at, updated_at
      FROM projects
      WHERE user_id = ?
    `;

    // Optional search filter
    if (search) {
      sql += ' AND name LIKE ?';
      params.push(`%${search.substring(0, 100)}%`);
    }

    sql += ' ORDER BY updated_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const projects = await db.query(sql, params);

    // Total count for pagination metadata
    const countParams: any[] = [userId];
    let countSql = 'SELECT COUNT(*) as total FROM projects WHERE user_id = ?';
    if (search) { countSql += ' AND name LIKE ?'; countParams.push(`%${search}%`); }

    const countRows = await db.query(countSql, countParams);
    const total = (countRows[0] as any).total;

    return res.json({ projects, total, limit, offset });

  } catch (err: any) {
    console.error('[listProjects]', err.message);
    return res.status(500).json({ error: 'Failed to list projects' });
  }
});

// ─────────────────────────────────────────
// POST /api/projects — create new project
// ─────────────────────────────────────────
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { name, isPublic = false } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    const result = await db.execute(
      `INSERT INTO projects (user_id, name, is_public, data)
       VALUES (?, ?, ?, ?)`,
      [userId, name.trim().substring(0, 255), isPublic, JSON.stringify({ layers: [], canvas: {} })]
    );

    // Fetch the created project to return full record
    const rows = await db.query(
      'SELECT id, name, is_public, publish_status, created_at FROM projects WHERE id = ?',
      [(result as any).insertId]
    );

    return res.status(201).json(rows[0]);

  } catch (err: any) {
    console.error('[createProject]', err.message);
    return res.status(500).json({ error: 'Failed to create project' });
  }
});

// ─────────────────────────────────────────
// GET /api/projects/:id — single project
// ─────────────────────────────────────────
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id }  = req.params;

    const rows = await db.query(
      `SELECT id, name, thumbnail_url, data, is_public, publish_status, created_at, updated_at
       FROM projects
       WHERE id = ? AND user_id = ?`,
      [id, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    return res.json(rows[0]);

  } catch (err: any) {
    console.error('[getProject]', err.message);
    return res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// ─────────────────────────────────────────
// PATCH /api/projects/:id — update project
// Only update fields that were provided
// ─────────────────────────────────────────
router.patch('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id }  = req.params;
    const { name, data, isPublic, thumbnailUrl } = req.body;

    // Verify ownership first
    const existing = await db.query(
      'SELECT id FROM projects WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Build dynamic update — only set fields that were provided
    const updates: string[] = [];
    const params: any[] = [];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name.trim().substring(0, 255));
    }
    if (data !== undefined) {
      updates.push('data = ?');
      params.push(JSON.stringify(data));
    }
    if (isPublic !== undefined) {
      updates.push('is_public = ?');
      params.push(Boolean(isPublic));
    }
    if (thumbnailUrl !== undefined) {
      updates.push('thumbnail_url = ?');
      params.push(thumbnailUrl);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(id);
    await db.execute(
      `UPDATE projects SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    return res.json({ message: 'Project updated' });

  } catch (err: any) {
    console.error('[updateProject]', err.message);
    return res.status(500).json({ error: 'Failed to update project' });
  }
});

// ─────────────────────────────────────────
// DELETE /api/projects/:id
// Deletes project + all its S3 assets in a transaction
// ─────────────────────────────────────────
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id }  = req.params;

    // 1. Verify ownership + fetch all asset S3 keys
    const projectRows = await db.query(
      'SELECT id FROM projects WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (projectRows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const assetRows = await db.query(
      'SELECT s3_key FROM assets WHERE project_id = ?',
      [id]
    );

    // 2. Delete all S3 assets (best effort — don't block on failures)
    await Promise.allSettled(
      (assetRows as any[]).map(a => s3Service.deleteAsset(a.s3_key))
    );

    // 3. Delete project + cascade deletes assets/exports via FK
    await db.execute('DELETE FROM projects WHERE id = ?', [id]);

    return res.status(204).send();

  } catch (err: any) {
    console.error('[deleteProject]', err.message);
    return res.status(500).json({ error: 'Failed to delete project' });
  }
});

export default router;
