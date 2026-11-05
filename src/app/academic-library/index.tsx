import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StudyResource, StudyResourceType } from '../../types';
import { listStudyHubPdfPage, saveResource } from '../../services/resourceApi';
import { ResourceCard } from '../../components/home/ResourceCard';

const PAGE_SIZE = 24;
const CATEGORIES: { label: string; value: StudyResourceType | 'all' }[] = [
  { label: 'All', value: 'all' }, { label: 'Notes', value: 'notes' },
  { label: 'Previous papers', value: 'previous_paper' }, { label: 'Important questions', value: 'important_questions' },
  { label: 'Lab manuals', value: 'lab_manual' }, { label: 'Study guides', value: 'study_guide' },
];

type Filters = { search?: string; subject?: string; studyYear?: number; semester?: string; category?: string };

export default function AcademicLibraryScreen() {
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
    category,
  }), [debouncedSearch, subject, studyYear, semester, category]);

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

  return <SafeAreaView style={styles.safe} edges={['top']}>
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <ResourceCard resource={item} onOpen={() => router.push({ pathname: '/resource/[id]', params: { id: item.id } } as never)} onBookmark={() => { void saveResource(item.id, !item.isBookmarked).then(() => setItems((rows) => rows.map((row) => row.id === item.id ? { ...row, isBookmarked: !item.isBookmarked } : row))).catch((cause) => setError(cause instanceof Error ? cause.message : 'Could not update saved resources.')); }} />}
      contentContainerStyle={styles.content}
      ListHeaderComponent={<View>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={styles.back}><Ionicons name="arrow-back" size={21} color="#FFF" /></TouchableOpacity>
        <Text style={styles.title}>Study Hub</Text>
        <Text style={styles.subtitle}>PDFs and study resources from the STUDOS database.</Text>
        <TextInput accessibilityLabel="Search study resources" value={search} onChangeText={setSearch} placeholder="Search title, filename, or subject" placeholderTextColor="#858D9E" style={styles.input} />
        <View style={styles.filtersRow}>
          <TextInput accessibilityLabel="Filter by study year" value={studyYear} onChangeText={setStudyYear} placeholder="Year" keyboardType="number-pad" placeholderTextColor="#858D9E" style={styles.smallInput} />
          <TextInput accessibilityLabel="Filter by semester" value={semester} onChangeText={setSemester} placeholder="Semester" placeholderTextColor="#858D9E" style={styles.smallInput} />
          <TextInput accessibilityLabel="Filter by full subject name" value={subject} onChangeText={setSubject} placeholder="Subject" placeholderTextColor="#858D9E" style={[styles.smallInput, styles.subjectInput]} />
        </View>
        <FlatList horizontal data={CATEGORIES} keyExtractor={(item) => item.value} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow} renderItem={({ item }) => <TouchableOpacity onPress={() => setCategory(item.value)} style={[styles.category, category === item.value && styles.categorySelected]}><Text style={[styles.categoryText, category === item.value && styles.categoryTextSelected]}>{item.label}</Text></TouchableOpacity>} />
        {visibleSubjects.length ? <Text style={styles.subjectHints}>Subjects in these results: {visibleSubjects.join('  ·  ')}</Text> : null}
        <Text style={styles.count}>{loading ? 'Loading resources…' : `${items.length} loaded${total ? ` of ${total}` : ''}`}</Text>
      </View>}
      ListEmptyComponent={loading ? <View style={styles.state}><ActivityIndicator color="#FF6B63" /><Text style={styles.stateText}>Loading study resources…</Text></View> : error ? <View style={styles.state}><Ionicons name="cloud-offline-outline" size={30} color="#858D9E" /><Text style={styles.stateText}>{error}</Text><TouchableOpacity style={styles.retryButton} onPress={() => setRetry((value) => value + 1)}><Text style={styles.retryText}>Retry</Text></TouchableOpacity></View> : <View style={styles.state}><Text style={styles.stateText}>No study resources match these filters.</Text></View>}
      ListFooterComponent={loadingMore ? <ActivityIndicator color="#FF6B63" style={{ padding: 20 }} /> : hasMore ? <TouchableOpacity onPress={() => void loadMore()} style={styles.loadMore}><Text style={styles.retryText}>Load more resources</Text></TouchableOpacity> : undefined}
      onEndReached={() => void loadMore()}
      onEndReachedThreshold={0.45}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#FF6B63" colors={['#FF6B63']} />}
    />
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#090B0F' }, content: { paddingHorizontal: 16, paddingBottom: 30 },
  back: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#171D2D', alignItems: 'center', justifyContent: 'center', marginVertical: 14 },
  title: { color: '#FFF', fontSize: 30, fontWeight: '900' }, subtitle: { color: '#A5ACBA', fontSize: 13, marginTop: 5, marginBottom: 18 },
  input: { color: '#FFF', backgroundColor: '#121624', borderWidth: 1, borderColor: '#303749', borderRadius: 10, minHeight: 44, paddingHorizontal: 12, marginBottom: 9 },
  filtersRow: { flexDirection: 'row', gap: 8 }, smallInput: { color: '#FFF', backgroundColor: '#121624', borderWidth: 1, borderColor: '#303749', borderRadius: 9, minHeight: 40, paddingHorizontal: 10, flex: 0.65 }, subjectInput: { flex: 1.7 },
  categoryRow: { gap: 7, paddingVertical: 12 }, category: { borderWidth: 1, borderColor: '#303749', borderRadius: 99, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: '#121624' }, categorySelected: { backgroundColor: '#E5433B', borderColor: '#E5433B' }, categoryText: { color: '#A5ACBA', fontSize: 11, fontWeight: '700' }, categoryTextSelected: { color: '#FFF' },
  subjectHints: { color: '#929AAA', fontSize: 11, lineHeight: 17, marginBottom: 6 }, count: { color: '#929AAA', fontSize: 11, marginBottom: 12 }, state: { alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 36, paddingHorizontal: 24 }, stateText: { color: '#A5ACBA', fontSize: 13, textAlign: 'center', lineHeight: 20 }, retryButton: { backgroundColor: '#E5433B', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 9 }, retryText: { color: '#FFF', fontWeight: '800', fontSize: 12 }, loadMore: { backgroundColor: '#171D2D', padding: 14, alignItems: 'center', borderRadius: 9, marginTop: 10 },
});
