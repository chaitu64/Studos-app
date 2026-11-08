import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const route = readFileSync(new URL('../src/app/resource/[id].tsx', import.meta.url), 'utf8');
const preview = readFileSync(new URL('../src/components/home/DrivePdfPreview.tsx', import.meta.url), 'utf8');
const service = readFileSync(new URL('../src/services/studyResourceLinksService.ts', import.meta.url), 'utf8');
const linksUi = readFileSync(new URL('../src/components/resources/CommunityLearningLinks.tsx', import.meta.url), 'utf8');
const pdfQuery = readFileSync(new URL('../src/services/studyHubPdf.ts', import.meta.url), 'utf8');

test('PDF details keeps the document preview before community links and collapsible information', () => {
  const summary = route.indexOf('styles.identityCard');
  const previewIndex = route.indexOf('<DrivePdfPreview', summary);
  const community = route.indexOf('<CommunityLearningLinks', previewIndex);
  const information = route.indexOf('Document information', community);
  assert.ok(summary >= 0 && previewIndex > summary && community > previewIndex && information > community);
  assert.match(preview, /Read PDF/);
  assert.match(route, /Open in Google Drive/);
  assert.match(route, /Report broken PDF link/);
  assert.match(pdfQuery, /pdf_link,youtube_link,file_size_mb/);
});

test('learning link queries sort by date and always use the authenticated contributor identity', () => {
  assert.match(service, /from\('study_resource_links'\)/);
  assert.match(service, /eq\('study_resource_id', studyResourceId\)/);
  assert.match(service, /order\('created_at', \{ ascending: true \}\)/);
  assert.match(service, /auth\.getUser\(\)/);
  assert.match(service, /submitted_by: userId/);
  assert.match(service, /\.eq\('submitted_by', userId\)/);
  assert.match(linksUi, /No learning links shared yet\./);
  assert.match(linksUi, /Be the first to share one\./);
  assert.match(linksUi, /link\.isMine/);
});
