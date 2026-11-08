import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '../ui/Avatar';
import { BorderRadius, Colors, Typography } from '../../constants/theme';
import { StudyResource } from '../../types';

type Props = { resource: StudyResource; onOpen: () => void; onBookmark?: () => void; compact?: boolean };

const label = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

export const ResourceCard = React.memo(function ResourceCard({ resource, onOpen, onBookmark, compact = false }: Props) {
  const fileName = resource.pdfFileName || resource.fileName;
  const academicMeta = [
    resource.studyYear ? `Year ${resource.studyYear}` : null,
    resource.semester ? `Semester ${resource.semester}` : null,
    resource.regulation || null,
  ].filter(Boolean);
  const size = resource.fileSizeMb != null ? `${resource.fileSizeMb.toFixed(1)} MB` : null;

  return (
    <View style={[styles.card, compact && styles.compactCard]}>
      <View style={styles.topRow}>
        <View style={styles.fileIcon}><Ionicons name="document-text" size={21} color={Colors.primary} /></View>
        <View style={styles.copy}>
          <Text style={styles.title} numberOfLines={2}>{fileName}</Text>
          <Text style={styles.subject} numberOfLines={1}>{resource.subject}</Text>
        </View>
        {onBookmark ? <TouchableOpacity accessibilityRole="button" accessibilityLabel={resource.isBookmarked ? 'Remove saved PDF' : 'Save PDF'} accessibilityState={{ selected: Boolean(resource.isBookmarked) }} onPress={onBookmark} style={styles.saveButton}>
          <Ionicons name={resource.isBookmarked ? 'bookmark' : 'bookmark-outline'} size={20} color={resource.isBookmarked ? Colors.primary : Colors.textMuted} />
        </TouchableOpacity> : null}
      </View>

      <View style={styles.metadata}>
        {academicMeta.map((item) => <View key={item} style={styles.metaPill}><Text style={styles.metaText} numberOfLines={1}>{item}</Text></View>)}
        <View style={[styles.metaPill, styles.categoryPill]}><Text style={[styles.metaText, styles.categoryText]} numberOfLines={1}>{label(resource.type)}</Text></View>
        {size ? <Text style={styles.fileSize}>{size}</Text> : null}
      </View>

      <View style={styles.footer}>
        <View style={styles.uploader}>
          <Avatar uri={resource.uploader.avatar} name={resource.uploader.name} size={28} />
          <Text style={styles.uploaderName} numberOfLines={1}>{resource.uploader.name}</Text>
        </View>
        <TouchableOpacity accessibilityRole="button" onPress={onOpen} activeOpacity={0.8} style={styles.previewButton}>
          <Ionicons name="eye-outline" size={17} color={Colors.textOnPrimary} />
          <Text style={styles.previewText}>Preview</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: { width: 292, backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, borderWidth: 1, borderColor: Colors.cardBorder, padding: 16, marginRight: 12 },
  compactCard: { width: '100%', marginRight: 0, marginBottom: 12, borderRadius: BorderRadius.lg },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  fileIcon: { width: 46, height: 50, borderRadius: 14, backgroundColor: Colors.primarySubtle, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0, paddingTop: 1, gap: 5 },
  title: { color: Colors.textPrimary, fontSize: 15, lineHeight: 21, fontWeight: Typography.semiBold },
  subject: { color: Colors.textSecondary, fontSize: 13, lineHeight: 18 },
  saveButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginTop: -7, marginRight: -8, borderRadius: 12 },
  metadata: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 7, marginTop: 15, minHeight: 26 },
  metaPill: { maxWidth: '100%', backgroundColor: Colors.surfaceHighlight, borderRadius: BorderRadius.full, paddingHorizontal: 10, paddingVertical: 6 },
  metaText: { color: Colors.textSecondary, fontSize: 11, lineHeight: 15, fontWeight: Typography.medium },
  categoryPill: { backgroundColor: Colors.primarySubtle }, categoryText: { color: Colors.primary },
  fileSize: { color: Colors.textMuted, fontSize: 11, lineHeight: 16, marginLeft: 2 },
  footer: { borderTopWidth: 1, borderTopColor: Colors.divider, paddingTop: 12, marginTop: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  uploader: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8 },
  uploaderName: { flex: 1, color: Colors.textMuted, fontSize: 12, lineHeight: 17, fontWeight: Typography.medium },
  previewButton: { minHeight: 44, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 13, backgroundColor: Colors.primary },
  previewText: { color: Colors.textOnPrimary, fontSize: 13, fontWeight: Typography.semiBold },
});
