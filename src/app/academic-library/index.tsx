import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, usePathname } from 'expo-router';
import { safeBack } from '@/navigation/safeBack';
import { Ionicons } from '@expo/vector-icons';
import { StudyResource, StudyResourceType } from '../../types';
import { listStudyHubPdfPage, saveResource } from '../../services/resourceApi';
import { ResourceCard } from '../../components/home/ResourceCard';
import { SearchField } from '../../components/ui/SearchField';
import { BorderRadius, Colors, Spacing, Typography } from '../../constants/theme';
import { Header } from '../../components/navigation/Header';

const PAGE_SIZE = 24;
const CATEGORIES: { label: string; value: StudyResourceType | 'all' }[] = [
  { label: 'All', value: 'all' }, { label: 'Notes', value: 'notes' },
  { label: 'Previous papers', value: 'previous_paper' }, { label: 'Important questions', value: 'important_questions' },
  { label: 'Lab manuals', value: 'lab_manual' }, { label: 'Study guides', value: 'study_guide' },
];

type Filters = { search?: string; subject?: string; studyYear?: number; semester?: string; category?: string; regulation?: string };

export default function AcademicLibraryScreen() {
  const pathname = usePathname();
  const [items, setItems] = useState<StudyResource[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [subject, setSubject] = useState('');
  const [studyYear, setStudyYear] = useState('');
  const [semester, setSemester] = useState('');
  const [regulation, setRegulation] = useState('');
  const [category, setCategory] = useState<StudyResourceType | 'all'>('all');
  const sequence = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const filters: Filters = useMemo(() => ({
    search: debouncedSearch || undefined,
    subject: subject.trim() || undefined,
    studyYear: /^\d+$/.test(studyYear) ? Number(studyYear) : undefined,
    semester: semester.trim() || undefined,
    regulation: regulation.trim() || undefined,
    category,
  }), [debouncedSearch, subject, studyYear, semester, regulation, category]);

  useEffect(() => {
    const current = ++sequence.current;
    let active = true;
    void Promise.resolve().then(async () => {
      setLoading(true); setError(''); setItems([]); setOffset(0); setHasMore(false);
      try {
        const page = await listStudyHubPdfPage({ ...filters, offset: 0, limit: PAGE_SIZE });
        if (!active || current !== sequence.current) return;
        setItems(page.items); setTotal(page.total); setOffset(page.rawCount || page.items.length); setHasMore(page.hasMore);
      } catch (cause) {
        if (active && current === sequence.current) setError(cause instanceof Error ? cause.message : 'Could not load study resources. Check your connection and retry.');
      } finally {
        if (active && current === sequence.current) { setLoading(false); setRefreshing(false); }
      }
    });
    return () => { active = false; };
  }, [filters, retry]);

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || !hasMore || error) return;
    const current = sequence.current;
    setLoadingMore(true);
    try {
      const page = await listStudyHubPdfPage({ ...filters, offset, limit: PAGE_SIZE });
      if (current === sequence.current) {
        setItems((previous) => {
          const seen = new Set(previous.map((item) => item.id));
          return [...previous, ...page.items.filter((item) => !seen.has(item.id))];
        });
        setOffset((previous) => previous + (page.rawCount || page.items.length));
        setHasMore(page.hasMore); setTotal(page.total);
      }
    } catch (cause) {
      if (current === sequence.current) setError(cause instanceof Error ? cause.message : 'Could not load more resources.');
    } finally {
      if (current === sequence.current) setLoadingMore(false);
    }
  }, [filters, offset, loading, loadingMore, hasMore, error]);

  const refresh = () => { setRefreshing(true); setRetry((value) => value + 1); };
  const visibleSubjects = [...new Set(items.map((item) => item.subject).filter(Boolean))];
  const availableCategories = CATEGORIES.filter((entry) => entry.value === 'all' || items.some((item) => item.type === entry.value));

  return <SafeAreaView style={styles.safe} edges={['top']}>
    <Header title="Study Hub" subtitle="Your semester, organized." hideGreeting showSearch={false} />
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <ResourceCard compact resource={item} onOpen={() => router.push({ pathname: '/resource/[id]', params: { id: item.id } } as never)} onBookmark={() => { void saveResource(item.id, !item.isBookmarked).then(() => setItems((rows) => rows.map((row) => row.id === item.id ? { ...row, isBookmarked: !item.isBookmarked } : row))).catch((cause) => setError(cause instanceof Error ? cause.message : 'Could not update saved resources.')); }} />}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={<View>
        {pathname.includes('academic-library') ? <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" onPress={() => safeBack()} style={styles.back}><Ionicons name="arrow-back" size={21} color="#FFF" /></TouchableOpacity> : null}
        <Text style={styles.eyebrow}>STUDOS LIBRARY</Text>
        <SearchField accessibilityLabel="Search study resources" value={search} onChangeText={setSearch} placeholder="Search title, filename, or subject" />
        <View style={styles.filtersRow}>
          <TextInput accessibilityLabel="Filter by study year" value={studyYear} onChangeText={setStudyYear} placeholder="Study year" keyboardType="number-pad" placeholderTextColor={Colors.textSubtle} style={styles.smallInput} />
          <TextInput accessibilityLabel="Filter by semester" value={semester} onChangeText={setSemester} placeholder="Semester" placeholderTextColor={Colors.textSubtle} style={styles.smallInput} />
          <TextInput accessibilityLabel="Filter by full subject name" value={subject} onChangeText={setSubject} placeholder="Subject" placeholderTextColor={Colors.textSubtle} style={[styles.smallInput, styles.subjectInput]} />
          <TextInput accessibilityLabel="Filter by regulation" value={regulation} onChangeText={setRegulation} placeholder="Regulation" placeholderTextColor={Colors.textSubtle} style={[styles.smallInput, styles.subjectInput]} />
        </View>
        <FlatList horizontal data={availableCategories} keyExtractor={(item) => item.value} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow} renderItem={({ item }) => <TouchableOpacity accessibilityRole="button" accessibilityLabel={item.label} accessibilityState={{ selected: category === item.value }} onPress={() => setCategory(item.value)} style={[styles.category, category === item.value && styles.categorySelected]}><Text style={[styles.categoryText, category === item.value && styles.categoryTextSelected]}>{item.label}</Text></TouchableOpacity>} />
        {visibleSubjects.length ? <Text style={styles.subjectHints}>Subjects: {visibleSubjects.slice(0, 3).join(' · ')}{visibleSubjects.length > 3 ? ` +${visibleSubjects.length - 3} more` : ''}</Text> : null}
        <Text style={styles.count}>{loading ? 'Loading resources…' : `${items.length} loaded${total ? ` of ${total}` : ''}`}</Text>
        {error && items.length ? <View style={styles.inlineError}><Text accessibilityRole="alert" style={styles.stateText}>{error}</Text><TouchableOpacity accessibilityRole="button" onPress={() => setRetry((value) => value + 1)}><Text style={styles.retryText}>Retry</Text></TouchableOpacity></View> : null}
      </View>}
      ListEmptyComponent={loading ? <View style={styles.state}><ActivityIndicator color={Colors.primary} /><Text style={styles.stateText}>Loading study resources…</Text></View> : error ? <View style={styles.state}><Ionicons name="cloud-offline-outline" size={30} color={Colors.textMuted} /><Text accessibilityRole="alert" style={styles.stateText}>{error}</Text><TouchableOpacity accessibilityRole="button" style={styles.retryButton} onPress={() => setRetry((value) => value + 1)}><Text style={styles.retryText}>Retry</Text></TouchableOpacity></View> : <View style={styles.state}><Text style={styles.stateText}>No study resources match these filters.</Text><TouchableOpacity accessibilityRole="button" onPress={() => { setSearch(''); setStudyYear(''); setSemester(''); setSubject(''); setRegulation(''); setCategory('all'); }}><Text style={styles.retryText}>Clear filters</Text></TouchableOpacity></View>}
      ListFooterComponent={loadingMore ? <ActivityIndicator color={Colors.primary} style={{ padding: 20 }} /> : hasMore ? <TouchableOpacity accessibilityRole="button" onPress={() => void loadMore()} style={styles.loadMore}><Text style={styles.retryText}>Load more resources</Text></TouchableOpacity> : undefined}
      onEndReached={() => void loadMore()}
      onEndReachedThreshold={0.45}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.primary} colors={[Colors.primary]} />}
    />
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: Spacing.screenPadding, paddingBottom: 36 },
  back: { width: 44, height: 44, borderRadius: BorderRadius.md, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', marginTop: 8, marginBottom: 22 },
  eyebrow: { color: Colors.primary, fontSize: 11, lineHeight: 16, letterSpacing: 1, fontWeight: Typography.bold, marginBottom: 5 },
  title: { color: Colors.textPrimary, fontSize: 30, lineHeight: 38, fontWeight: Typography.bold, letterSpacing: -0.7 },
  subtitle: { color: Colors.textMuted, fontSize: 15, lineHeight: 22, marginTop: 6, marginBottom: 18 },
  filtersRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  smallInput: { color: Colors.textPrimary, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, minHeight: 46, paddingHorizontal: 12, flex: 1, minWidth: 88, fontSize: 13 },
  subjectInput: { flexBasis: '100%' },
  categoryRow: { gap: 8, paddingVertical: 15 },
  category: { minHeight: 44, justifyContent: 'center', borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.full, paddingHorizontal: 15, backgroundColor: Colors.surface },
  categorySelected: { backgroundColor: Colors.primarySubtle, borderColor: Colors.primary },
  categoryText: { color: Colors.textSecondary, fontSize: 12, fontWeight: Typography.semiBold },
  categoryTextSelected: { color: Colors.primary },
  inlineError: { borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.error, backgroundColor: Colors.errorSubtle, padding: 12, marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  subjectHints: { color: Colors.textMuted, fontSize: 12, lineHeight: 18, marginBottom: 8 },
  count: { color: Colors.textMuted, fontSize: 12, marginBottom: 12 },
  state: { alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 36, paddingHorizontal: 24, backgroundColor: Colors.surface, borderRadius: 18, borderWidth: 1, borderColor: Colors.border },
  stateText: { color: Colors.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 21 },
  retryButton: { backgroundColor: Colors.primary, minHeight: 44, justifyContent: 'center', paddingHorizontal: 18, borderRadius: 11 },
  retryText: { color: Colors.textOnPrimary, fontWeight: Typography.bold, fontSize: 13 },
  loadMore: { backgroundColor: Colors.surface, minHeight: 48, padding: 14, alignItems: 'center', justifyContent: 'center', borderRadius: 12, marginTop: 10, borderWidth: 1, borderColor: Colors.border },
});
