import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const route = readFileSync(new URL('../src/app/resource/[id].tsx', import.meta.url), 'utf8');
const preview = readFileSync(new URL('../src/components/home/DrivePdfPreview.tsx', import.meta.url), 'utf8');
const linksAction = readFileSync(new URL('../src/components/resources/LearningResourcesAction.tsx', import.meta.url), 'utf8');
const linksService = readFileSync(new URL('../src/services/studyResourceLinksService.ts', import.meta.url), 'utf8');
const list = readFileSync(new URL('../src/app/academic-library/index.tsx', import.meta.url), 'utf8');
const card = readFileSync(new URL('../src/components/home/ResourceCard.tsx', import.meta.url), 'utf8');

test('Study Hub PDF selection opens an immersive reader with compact floating controls', () => {
  assert.match(list, /router\.push\(\{ pathname: '\/resource\/\[id\]', params: \{ id: item\.id \} \}/);
  assert.match(card, /onPress=\{onOpen\}/);
  assert.match(route, /resource\.resourceKind === 'pdf' \? <View style=\{styles\.readerArea\}/);
  assert.match(route, /readerMode onOpenExternal/);
  const pdfStart = route.indexOf("resource.resourceKind === 'pdf' ? <View style={styles.readerArea}");
  const pdfEnd = route.indexOf('</View> : <ScrollView contentContainerStyle={styles.content}>', pdfStart);
  assert.ok(pdfStart >= 0 && pdfEnd > pdfStart);
  assert.doesNotMatch(route.slice(pdfStart, pdfEnd), /PDF Details|Read PDF|Document information|identityCard|CommunityLearningLinks/);
  assert.match(route, /accessibilityLabel="Back" onPress=\{\(\) => safeBack\(\)\}/);
  assert.match(linksAction, /accessibilityLabel=\{`Learning resources,/);
  assert.match(linksAction, /<Ionicons name="add" size=\{22\}/);
  assert.doesNotMatch(route, /More PDF options|PDF options|DOCUMENT DETAILS|Share document link/);
});

test('PDF reader has loading timeout, retry, external fallback, and no extra full-screen CTA', () => {
  assert.match(preview, /setTimeout\(\(\) => setStatus\('error'\), 20000\)/);
  assert.match(preview, /onError=\{\(\) => setStatus\('error'\)\}/);
  assert.match(preview, /Open externally/);
  assert.match(preview, /onOpenExternal/);
  assert.match(preview, /readerMode \? frame\(height\) : null/);
  assert.doesNotMatch(preview, /Read PDF/);
});

test('compact plus sheet offers existing YouTube and ChatGPT links with validated descriptions', () => {
  assert.match(linksAction, /Learning resources/);
  assert.match(linksAction, /Add YouTube Link/);
  assert.match(linksAction, /Add ChatGPT Link/);
  assert.match(linksAction, /DESCRIPTION \(OPTIONAL\)/);
  assert.match(linksAction, /normalizeResourceLinkUrl\(type, url\)/);
  assert.match(linksAction, /studyResourceLinksService\.add\(resource\.id, type, title, normalized\)/);
  assert.match(linksAction, /link\.contributorName/);
  assert.match(linksAction, /resource\.youtubeLink/);
  assert.match(linksAction, /Linking\.openURL\(normalizeResourceLinkUrl/);
  assert.match(linksService, /from\('study_resource_links'\)/);
  assert.match(linksService, /submitted_by: userId/);
  assert.match(linksService, /\.eq\('submitted_by', userId\)/);
});
