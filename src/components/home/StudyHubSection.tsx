import React from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ResourceCard } from './ResourceCard';
import { Colors, Spacing, Typography } from '../../constants/theme';
import { StudyResource, StudyResourceType } from '../../types';

const filters: { label: string; value: StudyResourceType | 'all' }[] = [
  { label: 'All', value: 'all' }, { label: 'Notes', value: 'notes' }, { label: 'Previous Papers', value: 'previous_paper' },
  { label: 'Important Questions', value: 'important_questions' }, { label: 'Lab Manuals', value: 'lab_manual' }, { label: 'Study Guides', value: 'study_guide' },
];

type Props = { resources: StudyResource[]; loading?: boolean; loadingMore?: boolean; hasMore?: boolean; error?: string; selected: StudyResourceType | 'all'; onSelect: (value: StudyResourceType | 'all') => void; onOpen: (resource: StudyResource) => void; onBookmark: (resource: StudyResource) => void; onFiltersChange?: (filters: BrowseFilters) => void; onLoadMore?: () => void; onRetry?: () => void };

type BrowseFilters = { search: string; semester: string; subject: string; studyYear?: number };

export function StudyHubSection({ resources, loading = false, loadingMore = false, hasMore = false, error = '', selected, onSelect, onOpen, onBookmark, onFiltersChange, onLoadMore, onRetry }: Props) {
  const [search, setSearch] = React.useState('');
  const [semester, setSemester] = React.useState('');
  const [subject, setSubject] = React.useState('');
  const [studyYear, setStudyYear] = React.useState('');
  const [searchQuery, setSearchQuery] = React.useState(search);
  const debounce = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  React.useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => setSearchQuery(search.trim()), 300);
    return () => { if (debounce.current) clearTimeout(debounce.current); };
  }, [search]);
  React.useEffect(() => {
    onFiltersChange?.({ search: searchQuery, semester, subject, studyYear: /^\d+$/.test(studyYear) ? Number(studyYear) : undefined });
  }, [searchQuery, semester, subject, studyYear, onFiltersChange]);
  const filtered = resources.filter((item) =>
    (selected === 'all' || item.type === selected) &&
    `${item.pdfFileName || item.fileName} ${item.subject} ${item.title}`.toLowerCase().includes(searchQuery.toLowerCase()) &&
    (!semester || item.semester?.toLowerCase().includes(semester.toLowerCase())) &&
    (!studyYear || item.studyYear?.includes(studyYear)) &&
    (!subject || item.subject.toLowerCase().includes(subject.toLowerCase()))
  );
  return <View style={styles.section}>
    <View style={styles.header}><View style={styles.headerCopy}><Text style={styles.title}>Study Hub</Text><Text style={styles.subtitle}>Notes and resources shared by students, for students.</Text></View><TouchableOpacity accessibilityRole="button" onPress={() => router.push('/academic-library')} style={styles.libraryButton}><Ionicons name="library-outline" size={16} color="#FFF"/><Text style={styles.libraryButtonText}>VVIT Library</Text></TouchableOpacity></View>
    <FlatList horizontal data={filters} keyExtractor={(item) => item.value} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters} renderItem={({ item }) => <TouchableOpacity onPress={() => onSelect(item.value)} style={[styles.filter, selected === item.value && styles.filterActive]}><Text style={[styles.filterText, selected === item.value && styles.filterTextActive]}>{item.label}</Text></TouchableOpacity>} />
    {loading ? <View style={styles.empty}><ActivityIndicator color={Colors.primary}/><Text style={styles.emptyText}>Loading Study Hub…</Text></View> : null}
    {!loading && resources.length ? <View style={styles.searchFilters}>
      <TextInput accessibilityLabel="Search individual PDFs" placeholder="Search filename, subject, or title" placeholderTextColor="#777F90" value={search} onChangeText={setSearch} style={styles.searchInput} />
      <View style={styles.filterRow}><TextInput accessibilityLabel="Filter by study year" placeholder="Study year" placeholderTextColor="#777F90" value={studyYear} onChangeText={setStudyYear} keyboardType="number-pad" style={styles.facetInput} /><TextInput accessibilityLabel="Filter by semester" placeholder="Semester" placeholderTextColor="#777F90" value={semester} onChangeText={setSemester} style={styles.facetInput} /></View>
      <TextInput accessibilityLabel="Filter by subject" placeholder="Subject" placeholderTextColor="#777F90" value={subject} onChangeText={setSubject} style={styles.searchInput} />
    </View> : null}
    {!loading && error && resources.length ? <View style={styles.inlineError}><Text style={styles.emptyText}>{error}</Text><TouchableOpacity accessibilityRole="button" onPress={onRetry}><Text style={styles.shareText}>Retry</Text></TouchableOpacity></View> : null}
    {!loading && filtered.length ? <FlatList horizontal data={filtered} keyExtractor={(item) => item.id} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cards} renderItem={({ item }) => <ResourceCard resource={item} onOpen={() => onOpen(item)} onBookmark={() => onBookmark(item)} />} /> : null}
    {!loading && !filtered.length ? <View style={styles.empty}><Text style={styles.emptyText}>{error || (resources.length ? 'No resources match these filters.' : 'No resources shared yet. Be the first to help your classmates.')}</Text>{error ? <TouchableOpacity accessibilityRole="button" onPress={onRetry} style={styles.shareButton}><Text style={styles.shareText}>Retry</Text></TouchableOpacity> : <TouchableOpacity accessibilityRole="button" onPress={() => router.push('/share-resource')} style={styles.shareButton}><Text style={styles.shareText}>Share a study PDF</Text></TouchableOpacity>}</View> : null}
    {!loading && filtered.length && hasMore ? <TouchableOpacity accessibilityRole="button" onPress={onLoadMore} style={styles.loadMore}>{loadingMore ? <ActivityIndicator color={Colors.primary} /> : <Text style={styles.shareText}>Load more resources</Text>}</TouchableOpacity> : null}
  </View>;
}

const styles = StyleSheet.create({
  section: { marginTop: 26 }, header: { paddingHorizontal: Spacing.screenPadding, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, headerCopy: { flex: 1 }, title: { color: '#FFF', fontSize: 20, fontWeight: Typography.bold, letterSpacing: -0.4 }, subtitle: { color: Colors.textMuted, fontSize: 12, marginTop: 4 }, libraryButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 9, borderRadius: 10, backgroundColor: Colors.primary }, libraryButtonText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
  filters: { paddingHorizontal: Spacing.screenPadding, gap: 8, paddingVertical: 14 }, filter: { borderWidth: 1, borderColor: '#252C3D', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: '#121624' }, filterActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { color: Colors.textMuted, fontSize: 11, fontWeight: Typography.semiBold }, filterTextActive: { color: '#FFF' }, cards: { paddingHorizontal: Spacing.screenPadding }, empty: { marginHorizontal: Spacing.screenPadding, padding: 24, borderWidth: 1, borderColor: '#252C3D', borderRadius: 14, backgroundColor: '#121624', alignItems: 'center', gap: 12 }, emptyText: { color: Colors.textMuted, textAlign: 'center', fontSize: 12 },
  searchFilters: { marginHorizontal: Spacing.screenPadding, gap: 8, marginBottom: 10 }, searchInput: { color: '#FFF', backgroundColor: '#121624', borderWidth: 1, borderColor: '#252C3D', borderRadius: 9, minHeight: 42, paddingHorizontal: 11, fontSize: 12 }, filterRow: { flexDirection: 'row', gap: 8 }, facetInput: { flex: 1, color: '#FFF', backgroundColor: '#121624', borderWidth: 1, borderColor: '#252C3D', borderRadius: 9, minHeight: 40, paddingHorizontal: 10, fontSize: 11 }, shareButton: { backgroundColor: Colors.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 9 }, shareText: { color: '#FFF', fontSize: 12, fontWeight: '700' }, loadMore: { margin: 16, padding: 12, alignItems: 'center', backgroundColor: '#121624', borderWidth: 1, borderColor: '#252C3D', borderRadius: 10 }, inlineError: { marginHorizontal: Spacing.screenPadding, padding: 12, backgroundColor: '#211717', borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
});
