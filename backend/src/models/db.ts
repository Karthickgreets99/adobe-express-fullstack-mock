/**
 * ADOBE EXPRESS - Database Connection Pool
 * MySQL with connection pooling via mysql2
 * Covers: connection management, query helpers, transactions
 */
import mysql, { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';

// ─────────────────────────────────────────
// Connection Pool Setup
// ─────────────────────────────────────────
const pool: Pool = mysql.createPool({
  host:              process.env.DB_HOST     || 'localhost',
  port:              Number(process.env.DB_PORT) || 3306,
  user:              process.env.DB_USER     || 'root',
  password:          process.env.DB_PASSWORD || '',
  database:          process.env.DB_NAME     || 'adobe_express',
  waitForConnections: true,
  connectionLimit:   10,       // max 10 concurrent connections
  queueLimit:        0,        // unlimited queue
  enableKeepAlive:   true,
  keepAliveInitialDelay: 0,
});

// ─────────────────────────────────────────
// Query Helper — SELECT (returns rows)
// ─────────────────────────────────────────
export async function query<T extends RowDataPacket>(
  sql: string,
  params: any[] = []
): Promise<T[]> {
  const [rows] = await pool.execute<T[]>(sql, params);
  return rows;
}

// ─────────────────────────────────────────
// Execute Helper — INSERT / UPDATE / DELETE
// ─────────────────────────────────────────
export async function execute(
  sql: string,
  params: any[] = []
): Promise<ResultSetHeader> {
  const [result] = await pool.execute<ResultSetHeader>(sql, params);
  return result;
}

// ─────────────────────────────────────────
// Transaction Helper
// Automatically commits or rolls back
// ─────────────────────────────────────────
export async function withTransaction<T>(
  fn: (conn: PoolConnection) => Promise<T>
): Promise<T> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// ─────────────────────────────────────────
// Health Check
// ─────────────────────────────────────────
export async function checkConnection(): Promise<boolean> {
  try {
    await pool.execute('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

export default { query, execute, withTransaction, checkConnection };
