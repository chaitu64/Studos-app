import React from 'react';
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BorderRadius, Colors, Typography } from '../../constants/theme';
import { StudyResource } from '../../types';

type Props = { resource: StudyResource; onOpen: () => void; onBookmark?: () => void; compact?: boolean };

export const ResourceCard = React.memo(function ResourceCard({ resource, onOpen, onBookmark, compact = false }: Props) {
  const fileName = resource.pdfFileName || resource.fileName;
  const academicMeta = [
    resource.college ? `College: ${resource.college}` : null,
    resource.regulation || null,
  ].filter(Boolean);
  const size = resource.fileSizeMb != null ? `${resource.fileSizeMb.toFixed(1)} MB` : null;

  return (
    <View style={[styles.card, compact && styles.compactCard]}>
      <View style={styles.topRow}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Open ${fileName}, ${resource.subject}`} onPress={onOpen} style={({ pressed }) => [styles.openArea, pressed && styles.pressed]}>
          <View style={styles.fileIcon}><Ionicons name="document-text" size={21} color={Colors.primary} /></View>
          <View style={styles.copy}>
            <Text style={styles.title} numberOfLines={2}>{fileName}</Text>
            <Text style={styles.subject} numberOfLines={1}>{resource.subject}</Text>
          </View>
        </Pressable>
        {onBookmark ? <TouchableOpacity accessibilityRole="button" accessibilityLabel={resource.isBookmarked ? 'Remove saved PDF' : 'Save PDF'} accessibilityState={{ selected: Boolean(resource.isBookmarked) }} onPress={onBookmark} style={styles.saveButton}>
          <Ionicons name={resource.isBookmarked ? 'bookmark' : 'bookmark-outline'} size={20} color={resource.isBookmarked ? Colors.primary : Colors.textMuted} />
        </TouchableOpacity> : null}
      </View>

      <View style={styles.metadata}>
        {academicMeta.map((item) => <View key={item} style={styles.metaPill}><Text style={styles.metaText} numberOfLines={1}>{item}</Text></View>)}
        {size ? <Text style={styles.fileSize}>{size}</Text> : null}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: { width: 292, backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, borderWidth: 1, borderColor: Colors.cardBorder, padding: 16, marginRight: 12 },
  compactCard: { width: '100%', marginRight: 0, marginBottom: 8, borderRadius: BorderRadius.md, padding: 12 },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  openArea: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  fileIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: Colors.primarySubtle, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0, paddingTop: 1, gap: 5 },
  title: { color: Colors.textPrimary, fontSize: 15, lineHeight: 21, fontWeight: Typography.semiBold },
  subject: { color: Colors.textSecondary, fontSize: 13, lineHeight: 18 },
  saveButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  metadata: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 10, minHeight: 24 },
  metaPill: { maxWidth: '100%', flexShrink: 1, backgroundColor: Colors.surfaceHighlight, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  metaText: { color: Colors.textSecondary, fontSize: 11, lineHeight: 15, fontWeight: Typography.medium, flexShrink: 1 },
  categoryPill: { backgroundColor: Colors.primarySubtle }, categoryText: { color: Colors.primary },
  fileSize: { color: Colors.textMuted, fontSize: 11, lineHeight: 16, marginLeft: 2 },
  pressed: { opacity: 0.86 },
});
