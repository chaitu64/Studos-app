import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { safeBack } from '@/navigation/safeBack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '../../components/ui/Avatar';
import { BorderRadius, Colors, Spacing, Typography } from '../../constants/theme';
import { studentDirectoryService } from '../../services/studentDirectoryService';
import type { StudentDirectoryProfile } from '../../types';
import { SearchField } from '../../components/ui/SearchField';

export default function StudentsScreen() {
  const [students, setStudents] = useState<StudentDirectoryProfile[]>([]); const [query, setQuery] = useState(''); const [college, setCollege] = useState(''); const [branch, setBranch] = useState(''); const [studyYear, setStudyYear] = useState(''); const [offset, setOffset] = useState(0); const [hasMore, setHasMore] = useState(false); const [loading, setLoading] = useState(true); const [refreshing, setRefreshing] = useState(false); const [error, setError] = useState('');
  const load = useCallback(async (replace = true, pageOffset = 0) => { setLoading(replace); setError(''); try { const page = await studentDirectoryService.list({ search: query, college: college || undefined, branch: branch || undefined, studyYear: studyYear || undefined, offset: replace ? 0 : pageOffset, limit: 30 }); setStudents((current) => replace ? page.students : [...current, ...page.students]); setOffset((replace ? 0 : pageOffset) + page.students.length); setHasMore(page.hasMore); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load students.'); } finally { setLoading(false); setRefreshing(false); } }, [query, college, branch, studyYear]);
  useEffect(() => { const timer = setTimeout(() => { setOffset(0); void load(true); }, 250); return () => clearTimeout(timer); }, [load]);
  return <SafeAreaView style={styles.safe} edges={['top']}>
    <View style={styles.header}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" onPress={() => safeBack()} style={styles.back}><Ionicons name="arrow-back" size={20} color={Colors.textPrimary} /></TouchableOpacity>
      <View><Text style={styles.eyebrow}>STUDENT NETWORK</Text><Text style={styles.title}>Find students</Text></View>
    </View>
    <View style={styles.search}><SearchField accessibilityLabel="Search student profiles" value={query} onChangeText={setQuery} placeholder="Name, college, skills..." /></View>
    <View style={styles.filters}><TextInput accessibilityLabel="Filter by college" value={college} onChangeText={setCollege} placeholder="College" placeholderTextColor={Colors.textSubtle} style={styles.filterInput} /><TextInput accessibilityLabel="Filter by branch" value={branch} onChangeText={setBranch} placeholder="Branch" placeholderTextColor={Colors.textSubtle} style={styles.filterInput} /><TextInput accessibilityLabel="Filter by study year" value={studyYear} onChangeText={setStudyYear} placeholder="Study year" placeholderTextColor={Colors.textSubtle} style={[styles.filterInput, styles.yearInput]} /></View>
    {error ? <View style={styles.error}><Text style={styles.errorText}>{error}</Text><TouchableOpacity accessibilityRole="button" onPress={() => void load(true)} style={styles.retryButton}><Text style={styles.retry}>Try again</Text></TouchableOpacity></View> : null}
    <FlatList data={students} keyExtractor={(item) => `${item.identity.type}:${item.id}`} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(true); }} />} onEndReached={() => { if (!loading && hasMore) void load(false, offset); }} onEndReachedThreshold={0.5} ListEmptyComponent={!loading && !error ? <Text style={styles.empty}>No students match these filters yet.</Text> : loading ? <ActivityIndicator color={Colors.primary} style={{ marginTop: 30 }} /> : undefined} contentContainerStyle={styles.list} renderItem={({ item }) => <TouchableOpacity accessibilityRole="button" style={styles.card} onPress={() => router.push(`/student/${item.identity.type}/${item.id}` as never)}><Avatar uri={item.avatar} name={item.name} size={48} /><View style={styles.studentInfo}><View style={styles.nameLine}><Text numberOfLines={2} style={styles.name}>{item.name}</Text>{item.isDemo ? <Text style={styles.demo}>DEMO</Text> : null}</View><Text style={styles.meta} numberOfLines={2}>{[item.branch, item.college].filter(Boolean).join(' · ') || 'Student'}</Text><Text numberOfLines={2} style={styles.skills}>{item.skills.slice(0, 4).join(' · ')}</Text></View><Ionicons name="chevron-forward" size={18} color={Colors.textMuted} /></TouchableOpacity>} />
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { minHeight: 72, flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.screenPadding, gap: 12 },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: BorderRadius.md, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  eyebrow: { color: Colors.primary, fontSize: 10, lineHeight: 15, fontWeight: Typography.bold, letterSpacing: 0.8 },
  title: { color: Colors.textPrimary, fontSize: 23, lineHeight: 29, fontWeight: Typography.bold },
  search: { marginHorizontal: Spacing.screenPadding, marginBottom: 10 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: Spacing.screenPadding, marginBottom: 8 },
  filterInput: { flex: 1, minWidth: 128, backgroundColor: Colors.surface, borderColor: Colors.border, borderWidth: 1, borderRadius: BorderRadius.md, paddingHorizontal: 12, minHeight: 44, fontSize: 13, color: Colors.textPrimary },
  yearInput: { flexBasis: '100%' },
  list: { padding: Spacing.screenPadding, paddingTop: 8, paddingBottom: 40, gap: 10 },
  card: { minHeight: 80, flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 18, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder, gap: 12 },
  studentInfo: { flex: 1, minWidth: 0 },
  nameLine: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 7 },
  name: { flexShrink: 1, fontWeight: Typography.bold, color: Colors.textPrimary, fontSize: 15, lineHeight: 20 },
  demo: { color: Colors.accentPurple, fontWeight: Typography.bold, fontSize: 10, lineHeight: 15, backgroundColor: Colors.accentPurpleSubtle, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7 },
  meta: { color: Colors.textMuted, fontSize: 12, lineHeight: 17, marginTop: 4 },
  skills: { color: Colors.textSubtle, fontSize: 12, lineHeight: 17, marginTop: 5 },
  empty: { textAlign: 'center', marginTop: 40, color: Colors.textMuted, fontSize: 14, lineHeight: 20, paddingHorizontal: 20 },
  error: { margin: Spacing.screenPadding, padding: 16, backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, gap: 10 },
  errorText: { color: Colors.textSecondary, fontSize: 13, lineHeight: 19 },
  retryButton: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
  retry: { color: Colors.primary, fontWeight: Typography.bold, fontSize: 13 },
});
