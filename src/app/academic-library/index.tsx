import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
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
import { useAuth } from '../../context/AuthContext';
import { resourceReaderRoute } from '../../navigation/resourceReader';

const PAGE_SIZE = 24;
type Filters = { search?: string; subject?: string; studyYear?: number; semester?: string; category?: string; regulation?: string };
type FilterDraft = { studyYear: string; semester: string; subject: string; regulation: string };
const EMPTY_DRAFT: FilterDraft = { studyYear: '', semester: '', subject: '', regulation: '' };

export default function AcademicLibraryScreen() {
  const { session } = useAuth();
  const pathname = usePathname();
  const [items, setItems] = useState<StudyResource[]>([]);
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
  const [searchOpen, setSearchOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draft, setDraft] = useState<FilterDraft>(EMPTY_DRAFT);
  const sequence = useRef(0);
  const [savingIds, setSavingIds] = useState<Set<string>>(() => new Set());

  const toggleBookmark = async (resource: StudyResource) => {
    if (savingIds.has(resource.id)) return;
    if (!resource.isBookmarked && !requireAuth()) return;
    const wasSaved = Boolean(resource.isBookmarked);
    setItems((rows) => rows.map((row) => row.id === resource.id ? { ...row, isBookmarked: !wasSaved } : row));
    setSavingIds((ids) => new Set(ids).add(resource.id));
    try {
      await saveResource(resource.id, !wasSaved);
    } catch (cause) {
      setItems((rows) => rows.map((row) => row.id === resource.id ? { ...row, isBookmarked: wasSaved } : row));
      Alert.alert('Could not update saved resources', cause instanceof Error ? cause.message : 'Please try again.');
    } finally {
      setSavingIds((ids) => { const next = new Set(ids); next.delete(resource.id); return next; });
    }
  };

  const requireAuth = () => {
    if (session?.user.id) return true;
    Alert.alert('Sign in to save PDFs', 'Your saved resources stay with your account.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign in', onPress: () => router.push('/login' as never) },
    ]);
    return false;
  };

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
        setItems(page.items); setOffset(page.rawCount || page.items.length); setHasMore(page.hasMore);
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
        setHasMore(page.hasMore);
      }
    } catch (cause) {
      if (current === sequence.current) setError(cause instanceof Error ? cause.message : 'Could not load more resources.');
    } finally {
      if (current === sequence.current) setLoadingMore(false);
    }
  }, [filters, offset, loading, loadingMore, hasMore, error]);

  const refresh = () => { setRefreshing(true); setRetry((value) => value + 1); };
  const activeFilterCount = [studyYear, semester, subject, regulation].filter((value) => value.trim()).length;
  const openFilterPanel = () => {
    setDraft({ studyYear, semester, subject, regulation });
    setFiltersOpen(true);
  };
  const applyFilterDraft = () => {
    setStudyYear(draft.studyYear.trim()); setSemester(draft.semester.trim());
    setSubject(draft.subject.trim()); setRegulation(draft.regulation.trim());
    setFiltersOpen(false);
  };
  const clearAll = () => setDraft({ ...EMPTY_DRAFT });

  const renderFilterField = (label: string, value: string, key: keyof FilterDraft, keyboardType?: 'number-pad') => (
    <View style={styles.fieldGroup} key={key}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.fieldInputRow}>
        <TextInput accessibilityLabel={label} value={value} onChangeText={(text) => setDraft((current) => ({ ...current, [key]: text }))} placeholder={`Any ${label.toLowerCase()}`} placeholderTextColor={Colors.textSubtle} keyboardType={keyboardType} style={styles.fieldInput} />
        {value ? <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Clear ${label}`} onPress={() => setDraft((current) => ({ ...current, [key]: '' }))} style={styles.clearField}><Ionicons name="close-circle" size={18} color={Colors.textMuted} /></TouchableOpacity> : null}
      </View>
    </View>
  );

  return <SafeAreaView style={styles.safe} edges={['top']}>
    <Header hideGreeting showSearch onSearchPress={() => setSearchOpen(true)} />
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <ResourceCard compact resource={item} onOpen={() => router.push(resourceReaderRoute(item))} onBookmark={() => { void toggleBookmark(item); }} />}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={<View>
        {pathname.includes('academic-library') ? <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" onPress={() => safeBack()} style={styles.back}><Ionicons name="arrow-back" size={21} color="#FFF" /></TouchableOpacity> : null}
        <View style={styles.categoryControls}>
          <View style={styles.categoryGroup}>
            {([{ label: 'All', value: 'all' }, { label: 'Study guides', value: 'study_guide' }] as const).map((entry) => <TouchableOpacity key={entry.value} accessibilityRole="button" accessibilityLabel={entry.label} accessibilityState={{ selected: category === entry.value }} onPress={() => setCategory(entry.value)} style={[styles.category, category === entry.value && styles.categorySelected]}><Text style={[styles.categoryText, category === entry.value && styles.categoryTextSelected]}>{entry.label}</Text></TouchableOpacity>)}
          </View>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={activeFilterCount ? `Filters, ${activeFilterCount} active` : 'Filters'} accessibilityState={{ expanded: filtersOpen }} onPress={openFilterPanel} style={[styles.filterButton, activeFilterCount > 0 && styles.filterButtonActive]}>
            <Ionicons name="options-outline" size={16} color={activeFilterCount ? Colors.primary : Colors.textSecondary} />
            <Text style={[styles.filterButtonText, activeFilterCount > 0 && styles.filterButtonTextActive]}>Filter</Text>
            {activeFilterCount > 0 ? <View style={styles.filterBadge}><Text style={styles.filterBadgeText}>{activeFilterCount}</Text></View> : null}
          </TouchableOpacity>
        </View>
        {error && items.length ? <View style={styles.inlineError}><Text accessibilityRole="alert" style={styles.stateText}>{error}</Text><TouchableOpacity accessibilityRole="button" onPress={() => setRetry((value) => value + 1)}><Text style={styles.retryText}>Retry</Text></TouchableOpacity></View> : null}
      </View>}
      ListEmptyComponent={loading ? <View style={styles.state}><ActivityIndicator color={Colors.primary} /><Text style={styles.stateText}>Loading study resources…</Text></View> : error ? <View style={styles.state}><Ionicons name="cloud-offline-outline" size={30} color={Colors.textMuted} /><Text accessibilityRole="alert" style={styles.stateText}>{error}</Text><TouchableOpacity accessibilityRole="button" style={styles.retryButton} onPress={() => setRetry((value) => value + 1)}><Text style={styles.retryText}>Retry</Text></TouchableOpacity></View> : <View style={styles.state}><Text style={styles.stateText}>No study resources match these filters.</Text><TouchableOpacity accessibilityRole="button" onPress={() => { setSearch(''); setStudyYear(''); setSemester(''); setSubject(''); setRegulation(''); setCategory('all'); }}><Text style={styles.retryText}>Clear filters</Text></TouchableOpacity></View>}
      ListFooterComponent={loadingMore ? <ActivityIndicator color={Colors.primary} style={{ padding: 20 }} /> : hasMore ? <TouchableOpacity accessibilityRole="button" onPress={() => void loadMore()} style={styles.loadMore}><Text style={styles.retryText}>Load more resources</Text></TouchableOpacity> : undefined}
      onEndReached={() => void loadMore()}
      onEndReachedThreshold={0.45}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.primary} colors={[Colors.primary]} />}
    />

    <Modal visible={searchOpen} transparent animationType="fade" onRequestClose={() => setSearchOpen(false)}>
      <View style={styles.modalScrim}>
        <View style={styles.searchPanel}>
          <View style={styles.panelHeader}><Text style={styles.panelTitle}>Search Study Hub</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel="Close search" onPress={() => setSearchOpen(false)} style={styles.closeButton}><Ionicons name="close" size={21} color={Colors.textSecondary} /></TouchableOpacity></View>
          <SearchField accessibilityLabel="Search PDFs by title, filename, or subject" value={search} onChangeText={setSearch} placeholder="Title, filename, or subject" />
          {search ? <TouchableOpacity accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setSearch('')} style={styles.clearSearch}><Text style={styles.clearSearchText}>Clear search</Text></TouchableOpacity> : null}
        </View>
      </View>
    </Modal>

    <Modal visible={filtersOpen} transparent animationType="slide" onRequestClose={() => setFiltersOpen(false)}>
      <KeyboardAvoidingView style={styles.sheetScrim} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close filters" style={StyleSheet.absoluteFill} onPress={() => setFiltersOpen(false)} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.panelHeader}><Text style={styles.panelTitle}>Filters</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel="Close filters" onPress={() => setFiltersOpen(false)} style={styles.closeButton}><Ionicons name="close" size={21} color={Colors.textSecondary} /></TouchableOpacity></View>
          <ScrollView style={styles.filterFields} keyboardShouldPersistTaps="handled">
            {renderFilterField('Study Year', draft.studyYear, 'studyYear', 'number-pad')}
            {renderFilterField('Semester', draft.semester, 'semester')}
            {renderFilterField('Subject', draft.subject, 'subject')}
            {renderFilterField('Regulation', draft.regulation, 'regulation')}
          </ScrollView>
          <View style={styles.sheetActions}>
            <TouchableOpacity accessibilityRole="button" onPress={clearAll} style={styles.resetButton}><Text style={styles.resetText}>Reset All</Text></TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" onPress={applyFilterDraft} style={styles.applyButton}><Text style={styles.applyText}>Apply Filters</Text></TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: Spacing.screenPadding, paddingBottom: 24 },
  back: { width: 40, height: 40, borderRadius: BorderRadius.md, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', marginTop: 4, marginBottom: 8 },
  categoryControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingVertical: 8 },
  categoryGroup: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  category: { minHeight: 36, justifyContent: 'center', borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.full, paddingHorizontal: 12, backgroundColor: Colors.surface },
  categorySelected: { backgroundColor: Colors.primarySubtle, borderColor: Colors.primary },
  categoryText: { color: Colors.textSecondary, fontSize: 12, fontWeight: Typography.medium },
  categoryTextSelected: { color: Colors.primary },
  filterButton: { minHeight: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.full, paddingHorizontal: 11, backgroundColor: Colors.surface },
  filterButtonActive: { borderColor: Colors.primaryBorder, backgroundColor: Colors.primarySubtle },
  filterButtonText: { color: Colors.textSecondary, fontSize: 12, fontWeight: Typography.medium },
  filterButtonTextActive: { color: Colors.primary },
  filterBadge: { minWidth: 16, height: 16, paddingHorizontal: 4, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary },
  filterBadgeText: { color: Colors.textOnPrimary, fontSize: 10, fontWeight: Typography.bold },
  inlineError: { borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.error, backgroundColor: Colors.errorSubtle, padding: 12, marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  state: { alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 36, paddingHorizontal: 24, backgroundColor: Colors.surface, borderRadius: 18, borderWidth: 1, borderColor: Colors.border },
  stateText: { color: Colors.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 21 },
  retryButton: { backgroundColor: Colors.primary, minHeight: 44, justifyContent: 'center', paddingHorizontal: 18, borderRadius: 11 },
  retryText: { color: Colors.textOnPrimary, fontWeight: Typography.bold, fontSize: 13 },
  loadMore: { backgroundColor: Colors.surface, minHeight: 48, padding: 14, alignItems: 'center', justifyContent: 'center', borderRadius: 12, marginTop: 10, borderWidth: 1, borderColor: Colors.border },
  modalScrim: { flex: 1, justifyContent: 'flex-start', paddingTop: 68, paddingHorizontal: Spacing.screenPadding, backgroundColor: 'rgba(4,6,10,0.72)' },
  searchPanel: { padding: 16, borderRadius: BorderRadius.lg, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, gap: 12 },
  panelHeader: { minHeight: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  panelTitle: { color: Colors.textPrimary, fontSize: Typography.title3, fontWeight: Typography.semiBold },
  closeButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: BorderRadius.md, backgroundColor: Colors.surfaceElevated },
  clearSearch: { alignSelf: 'flex-end', paddingVertical: 5, paddingHorizontal: 4 },
  clearSearchText: { color: Colors.primary, fontSize: Typography.caption, fontWeight: Typography.semiBold },
  sheetScrim: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(4,6,10,0.72)' },
  sheet: { maxHeight: '88%', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 24, borderTopLeftRadius: 22, borderTopRightRadius: 22, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  sheetHandle: { width: 38, height: 4, alignSelf: 'center', borderRadius: 2, marginBottom: 8, backgroundColor: Colors.borderLight },
  filterFields: { gap: 10, paddingTop: 10 },
  fieldGroup: { gap: 5 },
  fieldLabel: { color: Colors.textSecondary, fontSize: Typography.caption, fontWeight: Typography.semiBold },
  fieldInputRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, backgroundColor: Colors.surfaceElevated },
  fieldInput: { flex: 1, minWidth: 0, minHeight: 44, color: Colors.textPrimary, paddingHorizontal: 12, fontSize: Typography.subhead },
  clearField: { width: 40, height: 42, alignItems: 'center', justifyContent: 'center' },
  sheetActions: { flexDirection: 'row', gap: 10, paddingTop: 18 },
  resetButton: { minHeight: 48, flex: 1, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, backgroundColor: Colors.surfaceElevated },
  resetText: { color: Colors.textSecondary, fontSize: Typography.subhead, fontWeight: Typography.semiBold },
  applyButton: { minHeight: 48, flex: 1.5, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.primaryBorder, borderRadius: BorderRadius.md, backgroundColor: Colors.primary },
  applyText: { color: Colors.textOnPrimary, fontSize: Typography.subhead, fontWeight: Typography.semiBold },
});
