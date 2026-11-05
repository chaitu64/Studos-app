import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '../ui/Avatar';
import { BorderRadius, Colors, Typography } from '../../constants/theme';
import { StudyResource } from '../../types';

type Props = { resource: StudyResource; onOpen: () => void; onBookmark: () => void; compact?: boolean };

export const ResourceCard = React.memo(function ResourceCard({ resource, onOpen, onBookmark, compact = false }: Props) {
  if (compact) return (
    <View style={styles.listCard}>
      <TouchableOpacity accessibilityRole="button" onPress={onOpen} style={styles.listMain} activeOpacity={0.84}>
        <View style={styles.listIcon}><Ionicons name="document-text" size={22} color={Colors.primary} /></View>
        <View style={styles.listCopy}>
          <Text style={styles.listTitle} numberOfLines={2}>{resource.pdfFileName || resource.fileName}</Text>
          <Text style={styles.listSubject} numberOfLines={1}>{resource.subject}</Text>
          <Text style={styles.listMeta} numberOfLines={2}>{[resource.studyYear ? `Year ${resource.studyYear}` : null, resource.semester ? `Semester ${resource.semester}` : null, resource.type.replaceAll('_', ' '), resource.fileSizeMb != null ? `${resource.fileSizeMb.toFixed(1)} MB` : null].filter(Boolean).join(' · ')}</Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={resource.isBookmarked ? 'Remove bookmark' : 'Bookmark resource'} onPress={onBookmark} style={styles.listBookmark}>
        <Ionicons name={resource.isBookmarked ? 'bookmark' : 'bookmark-outline'} size={20} color={resource.isBookmarked ? Colors.primary : Colors.textMuted} />
      </TouchableOpacity>
    </View>
  );
  return (
    <View style={styles.card}>
      <TouchableOpacity accessibilityRole="button" onPress={onOpen} activeOpacity={0.88}>
        <View style={styles.preview}>
          <View style={styles.placeholder}><Ionicons name="document-text-outline" size={38} color={Colors.primary} /><Text style={styles.placeholderText}>PDF document</Text></View>
          <View style={styles.pdfBadge}><Ionicons name="document-text" size={13} color="#FFF" /><Text style={styles.pdfText}>PDF</Text></View>
        </View>
        <View style={styles.body}>
          <Text accessibilityLabel="PDF filename" style={styles.title} numberOfLines={2}>{resource.pdfFileName || resource.fileName}</Text>
          <Text style={styles.subject} numberOfLines={2}>{resource.subject}</Text>
          <Text style={styles.description} numberOfLines={1}>{[resource.title && resource.title !== resource.pdfFileName ? resource.title : null, resource.studyYear ? `Year ${resource.studyYear}` : null, resource.semester ? `Semester ${resource.semester}` : null].filter(Boolean).join(' · ')}</Text>
          <View style={styles.topics}><Text style={styles.topic}>{resource.type.replaceAll('_', ' ')}</Text>{resource.regulation ? <Text style={styles.topic}>{resource.regulation}</Text> : null}{resource.fileSizeMb != null ? <Text style={styles.topic}>{resource.fileSizeMb.toFixed(2)} MB</Text> : null}</View>
        </View>
      </TouchableOpacity>
      <View style={styles.footer}>
        <View style={styles.uploader}><Avatar uri={resource.uploader.avatar} name={resource.uploader.name} size={26} /><View><Text style={styles.uploaderName}>{resource.uploader.name}</Text>{resource.createdAt ? <Text style={styles.uploadedAt}>{new Date(resource.createdAt).toLocaleDateString()}</Text> : null}</View></View>
        <View style={styles.footerActions}>
          <TouchableOpacity accessibilityLabel="Bookmark resource" onPress={onBookmark}><Ionicons name={resource.isBookmarked ? 'bookmark' : 'bookmark-outline'} size={19} color={resource.isBookmarked ? Colors.primary : Colors.textMuted} /></TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" style={styles.openButton} onPress={onOpen}><Text style={styles.openText}>Details</Text><Ionicons name="arrow-forward" size={14} color="#FFF" /></TouchableOpacity>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  listCard: { width: '100%', flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, borderRadius: 14, borderWidth: 1, borderColor: Colors.cardBorder, padding: 12, marginBottom: 10, gap: 8 },
  listMain: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 12 },
  listIcon: { width: 44, height: 48, borderRadius: 11, backgroundColor: Colors.primarySubtle, alignItems: 'center', justifyContent: 'center' },
  listCopy: { flex: 1, minWidth: 0, gap: 3 },
  listTitle: { color: Colors.textPrimary, fontSize: 14, lineHeight: 19, fontWeight: Typography.semiBold },
  listSubject: { color: Colors.textSecondary, fontSize: 13, lineHeight: 18 },
  listMeta: { color: Colors.textMuted, fontSize: 11, lineHeight: 16, textTransform: 'capitalize' },
  listBookmark: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  card: { width: 272, backgroundColor: '#121624', borderRadius: 16, borderWidth: 1, borderColor: '#252C3D', overflow: 'hidden', marginRight: 12 },
  preview: { height: 132, backgroundColor: '#0D1018', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  thumbnail: { width: '100%', height: '100%', backgroundColor: '#E8E9EC' },
  placeholder: { alignItems: 'center', gap: 8 }, placeholderText: { color: Colors.textMuted, fontSize: 10 },
  pdfBadge: { position: 'absolute', left: 12, top: 12, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Colors.primary, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 7 },
  pdfText: { color: '#FFF', fontSize: 10, fontWeight: '800' },
  pages: { position: 'absolute', right: 10, bottom: 10, backgroundColor: 'rgba(9,10,15,0.8)', paddingHorizontal: 7, paddingVertical: 4, borderRadius: 6 },
  pagesText: { color: '#FFF', fontSize: 10, fontWeight: Typography.semiBold },
  body: { padding: 13 }, title: { color: '#FFF', fontSize: 16, lineHeight: 21, fontWeight: Typography.bold },
  subject: { color: Colors.textMuted, fontSize: 11, marginTop: 4 }, description: { color: Colors.textSecondary, fontSize: 12, lineHeight: 17, marginTop: 9 },
  summary: { backgroundColor: '#171D2D', borderRadius: 10, padding: 10, marginTop: 10, borderLeftWidth: 2, borderLeftColor: Colors.primary },
  summaryTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 5 }, summaryTitle: { color: '#FF9B9B', fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  summaryText: { color: Colors.textSecondary, fontSize: 11, lineHeight: 16, marginTop: 5 }, topics: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 10 },
  topic: { color: Colors.textMuted, fontSize: 10, backgroundColor: '#171D2D', paddingHorizontal: 7, paddingVertical: 4, borderRadius: BorderRadius.full },
  footer: { borderTopWidth: 1, borderTopColor: '#252C3D', padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  uploader: { flexDirection: 'row', alignItems: 'center', gap: 7 }, uploaderName: { color: Colors.textPrimary, fontSize: 11, fontWeight: Typography.semiBold }, uploadedAt: { color: Colors.textSubtle, fontSize: 9, marginTop: 1 },
  footerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 }, openButton: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primary, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8 }, openText: { color: '#FFF', fontSize: 10, fontWeight: '800' },
  demo: { color: '#C58F44', fontSize: 8, fontWeight: '800', letterSpacing: 0.45, paddingHorizontal: 12, paddingBottom: 10 },
});
