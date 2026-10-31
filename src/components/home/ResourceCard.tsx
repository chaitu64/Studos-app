import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '../ui/Avatar';
import { BorderRadius, Colors, Typography } from '../../constants/theme';
import { StudyResource } from '../../types';

type Props = { resource: StudyResource; onOpen: () => void; onBookmark: () => void };

export const ResourceCard = React.memo(function ResourceCard({ resource, onOpen, onBookmark }: Props) {
  return (
    <View style={styles.card}>
      <TouchableOpacity accessibilityRole="button" onPress={onOpen} activeOpacity={0.88}>
        <View style={styles.preview}>
          {resource.thumbnailStatus === 'completed' && (resource.thumbnailAsset || resource.thumbnailUrl) ? <Image source={resource.thumbnailAsset || { uri: resource.thumbnailUrl }} style={styles.thumbnail} resizeMode="contain" /> : <View style={styles.placeholder}><Ionicons name={resource.thumbnailStatus === 'failed' ? 'alert-circle-outline' : 'document-text-outline'} size={32} color={Colors.textMuted} /><Text style={styles.placeholderText}>{resource.thumbnailStatus === 'failed' ? 'Preview unavailable' : 'Generating preview...'}</Text></View>}
          <View style={styles.pdfBadge}><Ionicons name="document-text" size={13} color="#FFF" /><Text style={styles.pdfText}>PDF</Text></View>
          <View style={styles.pages}><Text style={styles.pagesText}>{resource.pageCount} pages</Text></View>
        </View>
        <View style={styles.body}>
          <Text style={styles.title} numberOfLines={2}>{resource.title}</Text>
          <Text style={styles.subject}>{resource.subject} · {resource.academicYear}</Text>
          <Text style={styles.description} numberOfLines={2}>{resource.description}</Text>
          {resource.aiSummary ? (
            <View style={styles.summary}>
              <View style={styles.summaryTitleRow}><Ionicons name="sparkles" size={12} color="#FF7A7A" /><Text style={styles.summaryTitle}>AI summary {resource.summaryIsPreview ? '· Preview' : ''}</Text></View>
              <Text style={styles.summaryText} numberOfLines={3}>{resource.aiSummary}</Text>
            </View>
          ) : <View style={styles.summary}><View style={styles.summaryTitleRow}><Ionicons name="sparkles" size={12} color="#FF7A7A" /><Text style={styles.summaryTitle}>AI summary</Text></View><Text style={styles.summaryText}>{resource.summaryStatus === 'pending' || resource.summaryStatus === 'processing' ? 'Summary is being generated...' : 'Summary currently unavailable.'}</Text></View>}
          <View style={styles.topics}>{resource.topics.slice(0, 3).map((topic) => <Text key={topic} style={styles.topic}>{topic}</Text>)}</View>
        </View>
      </TouchableOpacity>
      <View style={styles.footer}>
        <View style={styles.uploader}><Avatar uri={resource.uploader.avatar} name={resource.uploader.name} size={26} /><View><Text style={styles.uploaderName}>{resource.uploader.name}</Text><Text style={styles.uploadedAt}>{resource.uploadedAt}</Text></View></View>
        <View style={styles.footerActions}>
          <TouchableOpacity accessibilityLabel="Bookmark resource" onPress={onBookmark}><Ionicons name={resource.isBookmarked ? 'bookmark' : 'bookmark-outline'} size={19} color={resource.isBookmarked ? Colors.primary : Colors.textMuted} /></TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" style={styles.openButton} onPress={onOpen}><Text style={styles.openText}>View PDF</Text><Ionicons name="arrow-forward" size={14} color="#FFF" /></TouchableOpacity>
        </View>
      </View>
      {resource.demo ? <Text style={styles.demo}>ILLUSTRATIVE PREVIEW · DEVELOPMENT DATA</Text> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  card: { width: 286, backgroundColor: '#121624', borderRadius: 16, borderWidth: 1, borderColor: '#252C3D', overflow: 'hidden', marginRight: 12 },
  preview: { height: 178, backgroundColor: '#0D1018', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
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
