import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ResourceCard } from './ResourceCard';
import { Colors, Spacing, Typography } from '../../constants/theme';
import { StudyResource, StudyResourceType } from '../../types';

const filters: { label: string; value: StudyResourceType | 'all' }[] = [
  { label: 'All', value: 'all' }, { label: 'Notes', value: 'notes' }, { label: 'Previous Papers', value: 'previous_paper' },
  { label: 'Important Questions', value: 'important_questions' }, { label: 'Lab Manuals', value: 'lab_manual' }, { label: 'Study Guides', value: 'study_guide' },
];

type Props = { resources: StudyResource[]; selected: StudyResourceType | 'all'; onSelect: (value: StudyResourceType | 'all') => void; onOpen: (resource: StudyResource) => void; onBookmark: (resource: StudyResource) => void };

export function StudyHubSection({ resources, selected, onSelect, onOpen, onBookmark }: Props) {
  return <View style={styles.section}>
    <View style={styles.header}><View><Text style={styles.title}>Study Hub</Text><Text style={styles.subtitle}>Notes and resources shared by students, for students.</Text></View></View>
    <FlatList horizontal data={filters} keyExtractor={(item) => item.value} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters} renderItem={({ item }) => <TouchableOpacity onPress={() => onSelect(item.value)} style={[styles.filter, selected === item.value && styles.filterActive]}><Text style={[styles.filterText, selected === item.value && styles.filterTextActive]}>{item.label}</Text></TouchableOpacity>} />
    {resources.length ? <FlatList horizontal data={resources} keyExtractor={(item) => item.id} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cards} renderItem={({ item }) => <ResourceCard resource={item} onOpen={() => onOpen(item)} onBookmark={() => onBookmark(item)} />} /> : <View style={styles.empty}><Text style={styles.emptyText}>No resources shared yet. Be the first to help your classmates.</Text></View>}
  </View>;
}

const styles = StyleSheet.create({
  section: { marginTop: 26 }, header: { paddingHorizontal: Spacing.screenPadding }, title: { color: '#FFF', fontSize: 20, fontWeight: Typography.bold, letterSpacing: -0.4 }, subtitle: { color: Colors.textMuted, fontSize: 12, marginTop: 4 },
  filters: { paddingHorizontal: Spacing.screenPadding, gap: 8, paddingVertical: 14 }, filter: { borderWidth: 1, borderColor: '#252C3D', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: '#121624' }, filterActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { color: Colors.textMuted, fontSize: 11, fontWeight: Typography.semiBold }, filterTextActive: { color: '#FFF' }, cards: { paddingHorizontal: Spacing.screenPadding }, empty: { marginHorizontal: Spacing.screenPadding, padding: 24, borderWidth: 1, borderColor: '#252C3D', borderRadius: 14, backgroundColor: '#121624' }, emptyText: { color: Colors.textMuted, textAlign: 'center', fontSize: 12 },
});
