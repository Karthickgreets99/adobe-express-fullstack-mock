/**
 * ADOBE EXPRESS - Express App Entry Point
 * Wires together: middleware → routes → error handling
 */
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { requireAuth, apiRateLimiter, uploadRateLimiter } from './middleware/auth';
import assetsRouter   from './routes/assets';
import projectsRouter from './routes/projects';
import uploadRouter   from './routes/upload';
import db             from './models/db';

const app = express();

// ─────────────────────────────────────────
// Global Middleware
// ─────────────────────────────────────────
app.use(helmet());                          // sets secure HTTP headers
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:3000' }));
app.use(express.json({ limit: '10mb' }));
app.use(apiRateLimiter);                    // 100 req/15min per IP

// ─────────────────────────────────────────
// Health Check (no auth)
// ─────────────────────────────────────────
app.get('/health', async (_req, res) => {
  const dbOk = await db.checkConnection();
  res.status(dbOk ? 200 : 503).json({
    status: dbOk ? 'ok' : 'degraded',
    db: dbOk ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

// ─────────────────────────────────────────
// Routes
// ─────────────────────────────────────────
app.use('/api/assets',   uploadRateLimiter, requireAuth, assetsRouter);
app.use('/api/projects', requireAuth, projectsRouter);
app.use('/api/upload',   uploadRateLimiter, requireAuth, uploadRouter);

// ─────────────────────────────────────────
// Global Error Handler
// ─────────────────────────────────────────
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[unhandled error]', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ─────────────────────────────────────────
// Start Server
// ─────────────────────────────────────────
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Adobe Express API running on port ${PORT}`);
});

export default app;
