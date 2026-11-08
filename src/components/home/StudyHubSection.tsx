import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { ResourceCard } from './ResourceCard';
import { Colors, Spacing, Typography } from '../../constants/theme';
import { StudyResource, StudyResourceType } from '../../types';
import { SearchField } from '../ui/SearchField';
import { SectionHeader } from '../ui/SectionHeader';

const filters: { label: string; value: StudyResourceType | 'all' }[] = [
  { label: 'All', value: 'all' }, { label: 'Notes', value: 'notes' }, { label: 'Previous Papers', value: 'previous_paper' },
  { label: 'Important Questions', value: 'important_questions' }, { label: 'Lab Manuals', value: 'lab_manual' }, { label: 'Study Guides', value: 'study_guide' },
];

type Props = { resources: StudyResource[]; loading?: boolean; loadingMore?: boolean; hasMore?: boolean; error?: string; selected: StudyResourceType | 'all'; onSelect: (value: StudyResourceType | 'all') => void; onOpen: (resource: StudyResource) => void; onBookmark: (resource: StudyResource) => void; onFiltersChange?: (filters: BrowseFilters) => void; onLoadMore?: () => void; onRetry?: () => void };

type BrowseFilters = { search: string; semester: string; subject: string; regulation: string; studyYear?: number };

export function StudyHubSection({ resources, loading = false, loadingMore = false, hasMore = false, error = '', selected, onSelect, onOpen, onBookmark, onFiltersChange, onLoadMore, onRetry }: Props) {
  const [search, setSearch] = React.useState('');
  const [semester, setSemester] = React.useState('');
  const [subject, setSubject] = React.useState('');
  const [studyYear, setStudyYear] = React.useState('');
  const [regulation, setRegulation] = React.useState('');
  const [searchQuery, setSearchQuery] = React.useState(search);
  const debounce = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  React.useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => setSearchQuery(search.trim()), 300);
    return () => { if (debounce.current) clearTimeout(debounce.current); };
  }, [search]);
  React.useEffect(() => {
    onFiltersChange?.({ search: searchQuery, semester, subject, regulation, studyYear: /^\d+$/.test(studyYear) ? Number(studyYear) : undefined });
  }, [searchQuery, semester, subject, regulation, studyYear, onFiltersChange]);
  const filtered = resources.filter((item) =>
    (selected === 'all' || item.type === selected) &&
    `${item.pdfFileName || item.fileName} ${item.subject} ${item.title}`.toLowerCase().includes(searchQuery.toLowerCase()) &&
    (!semester || item.semester?.toLowerCase().includes(semester.toLowerCase())) &&
    (!studyYear || item.studyYear?.includes(studyYear)) &&
    (!subject || item.subject.toLowerCase().includes(subject.toLowerCase())) &&
    (!regulation || item.regulation?.toLowerCase().includes(regulation.toLowerCase()))
  );
  return <View style={styles.section}>
    <SectionHeader title="Study hub" subtitle="Course PDFs and notes, shared by students." actionLabel="View library" onAction={() => router.push('/academic-library')} />
    <View style={styles.filters}>{filters.map((item) => <TouchableOpacity key={item.value} accessibilityRole="button" accessibilityLabel={item.label} accessibilityState={{ selected: selected === item.value }} onPress={() => onSelect(item.value)} style={[styles.filter, selected === item.value && styles.filterActive]}><Text style={[styles.filterText, selected === item.value && styles.filterTextActive]}>{item.label}</Text></TouchableOpacity>)}</View>
    {loading ? <View style={styles.empty}><ActivityIndicator color={Colors.primary}/><Text style={styles.emptyText}>Loading Study Hub…</Text></View> : null}
    {!loading && resources.length ? <View style={styles.searchFilters}>
      <SearchField accessibilityLabel="Search individual PDFs" placeholder="Search filename, subject, or title" value={search} onChangeText={setSearch} />
      <View style={styles.filterRow}><TextInput accessibilityLabel="Filter by study year" placeholder="Study year" placeholderTextColor={Colors.textSubtle} value={studyYear} onChangeText={setStudyYear} keyboardType="number-pad" style={styles.facetInput} /><TextInput accessibilityLabel="Filter by semester" placeholder="Semester" placeholderTextColor={Colors.textSubtle} value={semester} onChangeText={setSemester} style={styles.facetInput} /><TextInput accessibilityLabel="Filter by subject" placeholder="Subject" placeholderTextColor={Colors.textSubtle} value={subject} onChangeText={setSubject} style={[styles.facetInput, styles.subjectInput]} /><TextInput accessibilityLabel="Filter by regulation" placeholder="Regulation" placeholderTextColor={Colors.textSubtle} value={regulation} onChangeText={setRegulation} style={[styles.facetInput, styles.subjectInput]} /></View>
    </View> : null}
    {!loading && error && resources.length ? <View style={styles.inlineError}><Text style={styles.emptyText}>{error}</Text><TouchableOpacity accessibilityRole="button" onPress={onRetry}><Text style={styles.shareText}>Retry</Text></TouchableOpacity></View> : null}
    {!loading && filtered.length ? <View style={styles.cards}>{filtered.map((item) => <ResourceCard key={item.id} resource={item} compact onOpen={() => onOpen(item)} onBookmark={() => onBookmark(item)} />)}</View> : null}
    {!loading && !filtered.length ? <View style={styles.empty}><Text style={styles.emptyText}>{error || (resources.length ? 'No resources match these filters.' : 'No resources shared yet. Be the first to help your classmates.')}</Text>{error ? <TouchableOpacity accessibilityRole="button" onPress={onRetry} style={styles.shareButton}><Text style={styles.shareText}>Retry</Text></TouchableOpacity> : <TouchableOpacity accessibilityRole="button" onPress={() => router.push('/share-resource')} style={styles.shareButton}><Text style={styles.shareText}>Share a study PDF</Text></TouchableOpacity>}</View> : null}
    {!loading && filtered.length && hasMore ? <TouchableOpacity accessibilityRole="button" onPress={onLoadMore} style={styles.loadMore}>{loadingMore ? <ActivityIndicator color={Colors.primary} /> : <Text style={styles.shareText}>Load more resources</Text>}</TouchableOpacity> : null}
  </View>;
}

const styles = StyleSheet.create({
  section: { marginTop: 28 },
  filters: { paddingHorizontal: Spacing.screenPadding, gap: 8, paddingVertical: 12, flexDirection: 'row', flexWrap: 'wrap' },
  filter: { minHeight: 44, justifyContent: 'center', borderWidth: 1, borderColor: Colors.border, borderRadius: 999, paddingHorizontal: 14, backgroundColor: Colors.surface },
  filterActive: { backgroundColor: Colors.primarySubtle, borderColor: Colors.primary },
  filterText: { color: Colors.textMuted, fontSize: 12, fontWeight: Typography.semiBold },
  filterTextActive: { color: Colors.primary },
  cards: { paddingHorizontal: Spacing.screenPadding },
  empty: { marginHorizontal: Spacing.screenPadding, padding: 24, borderWidth: 1, borderColor: Colors.border, borderRadius: 16, backgroundColor: Colors.surface, alignItems: 'center', gap: 12 },
  emptyText: { color: Colors.textMuted, textAlign: 'center', fontSize: 13, lineHeight: 19 },
  searchFilters: { marginHorizontal: Spacing.screenPadding, gap: 8, marginBottom: 12 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  facetInput: { flex: 1, minWidth: 88, color: Colors.textPrimary, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, minHeight: 44, paddingHorizontal: 11, fontSize: 13 },
  subjectInput: { flexBasis: '100%' },
  shareButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary, borderRadius: 10, paddingHorizontal: 16 },
  shareText: { color: Colors.textOnPrimary, fontSize: 13, fontWeight: '700' },
  loadMore: { margin: 16, minHeight: 44, padding: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 12 },
  inlineError: { marginHorizontal: Spacing.screenPadding, padding: 14, backgroundColor: Colors.errorSubtle, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
});
