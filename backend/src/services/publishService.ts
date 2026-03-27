/**
 * ADOBE EXPRESS - Social Publishing Service (FIXED VERSION)
 * All async/error handling issues resolved
 */
import fetch from 'node-fetch';
import db from '../models/db';

interface Platform {
  name: string;
  apiUrl: string;
  token: string;
}

interface PublishResult {
  platform: string;
  status: 'success' | 'failed';
  data?: any;
  error?: string;
}

interface Design {
  id: string;
  userId: string;
  exportUrl: string;
}

async function getDesign(designId: string): Promise<Design> {
  const [rows] = await db.query('SELECT * FROM designs WHERE id = ?', [designId]);
  return (rows as Design[])[0];
}

async function updatePublishStatus(designId: string, status: string, results: PublishResult[]) {
  await db.query(
    'UPDATE designs SET publish_status = ?, publish_results = ? WHERE id = ?',
    [status, JSON.stringify(results), designId]
  );
}

// FIX 2: Promise.allSettled - all platforms run regardless of individual failures
async function publishToSocial(designId: string, platforms: Platform[]) {
  // FIX 1: try/catch wraps the whole operation
  try {
    const design = await getDesign(designId);

    const settled = await Promise.allSettled(
      platforms.map(platform => uploadToPlatform(platform, design.exportUrl))
    );

    // Map results to a consistent structure
    const results: PublishResult[] = settled.map((result, i) => ({
      platform: platforms[i].name,
      status: result.status === 'fulfilled' ? 'success' : 'failed',
      data: result.status === 'fulfilled' ? result.value : undefined,
      error: result.status === 'rejected' ? result.reason?.message : undefined,
    }));

    const allFailed = results.every(r => r.status === 'failed');
    const someFailed = results.some(r => r.status === 'failed');

    // FIX 3: Status reflects actual results
    const publishStatus = allFailed ? 'failed' : someFailed ? 'partial' : 'published';
    await updatePublishStatus(designId, publishStatus, results);

    // Notify user with actual results summary
    await notifyUser(design.userId, results);

    return { status: publishStatus, results };

  } catch (error) {
    console.error('Publish failed for design:', designId, error);
    throw new Error('Failed to publish design. Please try again.');
  }
}

async function uploadToPlatform(platform: Platform, url: string) {
  const response = await fetch(platform.apiUrl, {
    method: 'POST',
    body: JSON.stringify({ url }),
    headers: {
      'Authorization': `Bearer ${platform.token}`,
      'Content-Type': 'application/json',
    },
  });

  // FIX 4: Check response.ok before parsing
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`${platform.name} API error ${response.status}: ${errorBody}`);
  }

  return response.json();
}

async function notifyUser(userId: string, results: PublishResult[]) {
  const successCount = results.filter(r => r.status === 'success').length;
  const message = `Published to ${successCount}/${results.length} platforms`;
  await db.query(
    'INSERT INTO notifications (user_id, message) VALUES (?, ?)',
    [userId, message]
  );
}

export { publishToSocial, PublishResult };
