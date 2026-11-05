import { readFile } from 'node:fs/promises';

// Read-only probe: prints schema visibility and exact counts, never row values or keys.
const lines = (await readFile('.env', 'utf8')).split(/\r?\n/);
const env = Object.fromEntries(lines.filter((line) => line.includes('=') && !line.trim().startsWith('#')).map((line) => {
  const index = line.indexOf('=');
  return [line.slice(0, index).trim(), line.slice(index + 1).trim().replace(/^['"]|['"]$/g, '')];
}));
const url = env.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
const key = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) throw new Error('Supabase public URL/key are not configured in .env.');
console.log(`project_host=${new URL(url).host}`);

try {
  const response = await fetch(`${url}/rest/v1/`, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/openapi+json' },
  });
  const spec = await response.json().catch(() => ({}));
  const paths = Object.keys(spec.paths || {}).filter((path) => /^\/(study_resources|academic_pdfs|saved_resources|resource_reports)$/.test(path));
  console.log(`openapi_status=${response.status} resource_paths=${paths.join(',') || 'not_visible'}`);
} catch (error) {
  console.log(`openapi_error=${error instanceof Error ? error.message : 'request failed'}`);
}

for (const table of ['study_resources', 'academic_pdfs', 'saved_resources', 'resource_reports']) {
  try {
    const response = await fetch(`${url}/rest/v1/${table}?select=*&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: 'count=exact' },
    });
    const body = await response.json().catch(() => null);
    const columns = Array.isArray(body) && body[0] ? Object.keys(body[0]).join(',') : 'not_visible_or_empty';
    console.log(`${table} status=${response.status} content_range=${response.headers.get('content-range') || 'none'} columns=${columns} error=${body?.message || ''}`);
  } catch (error) {
    console.log(`${table} network_error=${error instanceof Error ? error.message : 'request failed'}`);
  }
}
