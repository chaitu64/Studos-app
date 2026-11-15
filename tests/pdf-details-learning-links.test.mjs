import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const route = read('src/app/resource/[id].tsx');
const preview = read('src/components/home/DrivePdfPreview.tsx');
const linksAction = read('src/components/resources/LearningResourcesAction.tsx');
const linksService = read('src/services/studyResourceLinksService.ts');
const list = read('src/app/academic-library/index.tsx');
const saved = read('src/app/saved.tsx');
const search = read('src/app/search/index.tsx');
const home = read('src/app/(tabs)/index.tsx');
const card = read('src/components/home/ResourceCard.tsx');
const readerRoute = read('src/navigation/resourceReader.ts');
const resourceApi = read('src/services/resourceApi.ts');
const presentation = await import('../src/utils/resourcePresentation.ts');

test('Study Hub PDF taps pass loaded data directly to the full-screen reader route', () => {
  assert.match(list, /router\.push\(resourceReaderRoute\(item\)\)/);
  assert.match(readerRoute, /pathname: '\/resource\/\[id\]'/);
  assert.match(readerRoute, /pdfUrl: drive\.url/);
  assert.match(readerRoute, /driveFileId: resource\.driveFileId \|\| drive\.id/);
  assert.match(card, /onPress=\{onOpen\}/);
  assert.match(route, /resource\.resourceKind === 'pdf' \? <View style=\{styles\.readerArea\}/);
  assert.match(route, /DrivePdfPreview key=\{resource\.pdfUrl\}/);
});

test('PDF opens do not render the Resource details heading or Loading resource screen', () => {
  assert.match(route, /loading \|\| currentError \|\| resource\?\.resourceKind === 'pdf' \? null/);
  assert.doesNotMatch(route, /Loading resource\.\.\./);
  assert.match(route, /cachedResource/);
  assert.match(route, /resource = cachedResource \|\|/);
});

test('The viewer uses the passed Drive URL and preserves resource ID for learning links', () => {
  assert.match(route, /params\.pdfUrl/);
  assert.match(route, /id, type:/);
  assert.match(route, /pdfUrl: drive\.url/);
  assert.match(route, /<LearningResourcesAction resource=\{resource\}/);
  assert.match(readerRoute, /id: resource\.id/);
});

test('ID-only deep links resolve a resource inside the reader route', () => {
  assert.match(route, /useLocalSearchParams/);
  assert.match(route, /if \(!id\) return/);
  assert.match(route, /void fetchResource\(id\)/);
  assert.match(route, /Opening document\.\.\./);
});

test('Saved PDF navigation passes loaded PDF data into the reader', () => {
  assert.match(saved, /router\.push\(resourceReaderRoute\(resource\)\)/);
});

test('Global Search PDF navigation passes loaded PDF data into the reader', () => {
  assert.match(search, /router\.push\(resourceReaderRoute\(resource\)\)/);
});

test('Home and student portfolio resource entry points use direct reader navigation', () => {
  assert.match(home, /router\.push\(resourceReaderRoute\(entry\.data\.document\)\)/);
  assert.match(read('src/app/student/[type]/[id].tsx'), /resourceReaderRoute\(item\)/);
});

test('Learning link requests start independently after the reader has rendered', () => {
  assert.ok(route.indexOf('<DrivePdfPreview') < route.indexOf('<LearningResourcesAction'));
  assert.match(linksAction, /useEffect\(\(\) => \{ const timer = setTimeout\(\(\) => \{ void load\(\); \}, 0\)/);
  assert.match(linksAction, /studyResourceLinksService\.list\(resource\.id\)/);
});

test('Floating plus still shows and adds YouTube and ChatGPT links for the same resource ID', () => {
  assert.match(linksAction, /accessibilityLabel=\{`Learning resources,/);
  assert.match(linksAction, /<Ionicons name="add" size=\{22\}/);
  assert.match(linksAction, /Add YouTube Link/);
  assert.match(linksAction, /Add ChatGPT Link/);
  assert.match(linksAction, /studyResourceLinksService\.add\(resource\.id, type, title, normalized\)/);
  assert.match(linksService, /from\('study_resource_links'\)/);
});

test('PDF bookmark controls remain on the resource list and use the existing save action', () => {
  assert.match(list, /onBookmark=\{\(\) => \{ void toggleBookmark\(item\); \}\}/);
  assert.match(list, /await saveResource\(resource\.id, !wasSaved\)/);
  assert.match(card, /accessibilityLabel=\{resource\.isBookmarked \? 'Remove saved PDF' : 'Save PDF'\}/);
});

test('Study Hub compact PDFs render as full-width feed rows with dividers, not individual cards', () => {
  const compactStart = card.indexOf('if (compact) return (');
  const compactEnd = card.indexOf('\n\n  return (', compactStart);
  const compact = card.slice(compactStart, compactEnd);
  assert.ok(compactStart >= 0 && compactEnd > compactStart);
  assert.match(compact, /<View style=\{styles\.feedRow\}>/);
  assert.match(compact, /onPress=\{onOpen\}/);
  assert.match(compact, /styles\.feedOpen/);
  assert.match(compact, /onBookmark/);
  assert.ok(compact.indexOf('</Pressable>') < compact.indexOf('{onBookmark ?'), 'bookmark stays outside the PDF open target');
  assert.doesNotMatch(compact, /styles\.card|styles\.metaPill|College:/);
  assert.match(card, /feedRow: \{[^}]*borderBottomWidth: StyleSheet\.hairlineWidth/);
  assert.doesNotMatch(card.match(/feedRow: \{[^}]+/)?.[0] || '', /backgroundColor|borderRadius|elevation|shadow/);
  assert.match(list, /keyExtractor=\{\(item\) => item\.id\}/);
});

test('compact PDF rows keep filename, subject, and one-line metadata readable and responsive', () => {
  assert.match(card, /feedTitle\} numberOfLines=\{2\} ellipsizeMode="tail"/);
  assert.match(card, /feedSubject\} numberOfLines=\{2\} ellipsizeMode="tail"/);
  assert.match(card, /feedMeta\} numberOfLines=\{1\} ellipsizeMode="tail"/);
  assert.match(card, /accessibilityRole="button"[\s\S]*?onPress=\{onOpen\}/);
  assert.match(card, /feedOpen: \{ width: '100%', minWidth: 0/);
  assert.match(card, /feedSaveButton: \{ position: 'absolute'/);
  assert.match(card, /onHoverIn=\{\(\) => setIsHovered\(true\)\}/);
  assert.match(card, /onFocus=\{\(\) => setIsFocused\(true\)\}/);
});

test('compact PDF metadata uses the recognized VVIT alias without changing stored college names', () => {
  assert.equal(presentation.displayCollegeName('VVITU'), 'VVIT');
  assert.equal(presentation.displayCollegeName('Vasireddy Venkatadri Institute of Technology'), 'VVIT');
  assert.equal(presentation.displayCollegeName('Small Arts College'), 'Small Arts College');
  assert.equal(presentation.compactResourceMetadata('vvitu', 'R23', 30.8), 'VVIT · R23 · 30.8 MB');
  assert.equal(presentation.compactResourceMetadata('', '', null), '');
});

test('Drive preview errors have retry and external-open fallbacks', () => {
  assert.match(preview, /setTimeout\(\(\) => setStatus\('error'\), 20000\)/);
  assert.match(preview, /Retry preview/);
  assert.match(preview, /Open externally/);
  assert.match(route, /accessibilityLabel="Open PDF externally"/);
});

test('Native Android WebView and web iframe both render the same Drive preview URL', () => {
  assert.match(preview, /Platform\.OS === 'web' \?/);
  assert.match(preview, /src: previewUrl/);
  assert.match(preview, /<WebView/);
  assert.match(preview, /source=\{\{ uri: previewUrl \}\}/);
  assert.match(preview, /readerFrame/);
});

test('Already loaded PDF metadata avoids detail and profile follow-up requests', () => {
  assert.match(route, /if \(cachedResource\).*?return/s);
  const fetcher = resourceApi.slice(resourceApi.indexOf('async function fetchStudyHubPdf'), resourceApi.indexOf('export async function listStudyResourcePage'));
  assert.match(fetcher, /\.select\(columns\)/);
  assert.doesNotMatch(fetcher, /saved_resources|enrichResourceUploaders/);
});

test('Drive preview has one initial loading overlay and memoizes URL normalization', () => {
  assert.match(preview, /useMemo\(\(\) => \{ try \{ return normalizeDriveUrl\(url\);/);
  assert.doesNotMatch(preview, /startInLoadingState|renderLoading/);
  assert.match(preview, /onLoad=\{\(\) => setStatus\('frame-ready'\)\}/);
  assert.match(preview, /only confirms the iframe document responded/);
});
