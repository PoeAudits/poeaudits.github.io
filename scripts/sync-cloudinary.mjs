import { writeFile } from 'node:fs/promises';

const cloudName = requiredEnv('CLOUDINARY_CLOUD_NAME');
const apiKey = requiredEnv('CLOUDINARY_API_KEY');
const apiSecret = requiredEnv('CLOUDINARY_API_SECRET');
const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');

const resources = [
  ...(await listResources('image')),
  ...(await listResources('video')),
];

const items = resources
  .filter(isFanimeAsset)
  .filter((resource) => resource.secure_url)
  .map(toMediaItem)
  .sort((a, b) => {
    const dateOrder = b.submittedAt.localeCompare(a.submittedAt);
    return dateOrder || b.id.localeCompare(a.id);
  });

await writeFile('data/media.json', `${JSON.stringify({ items }, null, 2)}\n`);
console.log(`Synced ${items.length} Cloudinary assets.`);

async function listResources(resourceType) {
  const resources = [];
  let nextCursor = '';

  do {
    const url = new URL(`https://api.cloudinary.com/v1_1/${cloudName}/resources/${resourceType}/upload`);
    url.searchParams.set('max_results', '500');
    url.searchParams.set('context', 'true');
    url.searchParams.set('tags', 'true');

    if (nextCursor) {
      url.searchParams.set('next_cursor', nextCursor);
    }

    const response = await fetch(url, {
      headers: { Authorization: `Basic ${auth}` },
    });

    if (!response.ok) {
      throw new Error(`Cloudinary ${resourceType} list failed: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    resources.push(...(Array.isArray(data.resources) ? data.resources : []));
    nextCursor = data.next_cursor || '';
  } while (nextCursor);

  return resources;
}

function toMediaItem(resource) {
  const context = resource.context?.custom || {};
  const name = context.original_filename || resource.filename || resource.public_id.split('/').pop();
  const submissionId = resource.asset_id || resource.public_id;
  const contentType = inferContentType(resource);

  return {
    id: resource.asset_id || resource.public_id,
    submissionId,
    submittedAt: resource.created_at || new Date().toISOString(),
    day: context.day || 'unlabeled',
    notes: context.notes || '',
    name,
    size: Number.isFinite(resource.bytes) ? resource.bytes : 0,
    contentType,
    kind: resource.resource_type === 'video' ? 'video' : 'image',
    url: resource.secure_url,
  };
}

function isFanimeAsset(resource) {
  const tags = Array.isArray(resource.tags) ? resource.tags : [];
  return tags.includes('fanime-2026') && !tags.includes('agent-test');
}

function inferContentType(resource) {
  if (resource.resource_type === 'video') {
    if (resource.format === 'mov') return 'video/quicktime';
    return `video/${resource.format || 'mp4'}`;
  }

  if (resource.format === 'jpg') return 'image/jpeg';
  return `image/${resource.format || 'jpeg'}`;
}

function requiredEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}
