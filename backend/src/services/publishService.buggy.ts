/**
 * ADOBE EXPRESS - Social Publishing Service (BUGGY VERSION)
 * CODE DIAGNOSE EXERCISE: Find async/error handling issues
 * Difficulty: P1 - Reliability
 */
import fetch from 'node-fetch';

interface Platform {
  name: string;
  apiUrl: string;
  token: string;
}

// BUG 1: No try/catch - unhandled rejections crash the server
// BUG 2: Promise.all fails fast - one failure kills all platforms
async function publishToSocial(designId: string, platforms: Platform[]) {
  const design = await getDesign(designId);

  const results = await Promise.all(
    platforms.map(platform =>
      uploadToPlatform(platform, design.exportUrl)
    )
  );

  // BUG 3: Status updated even if ALL platforms failed
  await updatePublishStatus(designId, 'published');
  await notifyUser(design.userId, results);

  return results;
}

async function uploadToPlatform(platform: Platform, url: string) {
  const response = await fetch(platform.apiUrl, {
    method: 'POST',
    body: JSON.stringify({ url }),
    headers: { 'Authorization': `Bearer ${platform.token}` },
  });

  // BUG 4: Doesn't check response.ok - 401/500 treated as success
  return response.json();
}

export { publishToSocial };
