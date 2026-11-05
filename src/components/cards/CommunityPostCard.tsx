import React from 'react';
import { FlatList, Image, Share, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '../ui/Avatar';
import { Colors, Typography } from '../../constants/theme';
import { CommunityPost } from '../../types';

export interface CommunityPostCardProps {
  post: CommunityPost; onLike?: (post: CommunityPost) => void; onComment?: (post: CommunityPost) => void;
  onSave?: (post: CommunityPost) => void; onCollaborate?: (post: CommunityPost) => void;
  onAuthorPress?: (authorId: string) => void; onCardPress?: (post: CommunityPost) => void;
}

const labels: Record<CommunityPost['type'], string> = { idea: 'Idea', service: 'Service', story: 'Campus life', event_collab: 'Team up', project: 'Project', question: 'Help', study_material: 'Study material', achievement: 'Achievement' };

function formatPostDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const elapsed = Date.now() - date.getTime();
  if (elapsed >= 0 && elapsed < 60_000) return 'Just now';
  if (elapsed >= 0 && elapsed < 3_600_000) return `${Math.floor(elapsed / 60_000)}m`;
  if (elapsed >= 0 && elapsed < 86_400_000) return `${Math.floor(elapsed / 3_600_000)}h`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export const CommunityPostCard = React.memo(function CommunityPostCard({ post, onLike, onComment, onSave, onCollaborate, onAuthorPress, onCardPress }: CommunityPostCardProps) {
  const { width } = useWindowDimensions();
  const mediaWidth = Math.max(220, width - 34);
  const share = () => Share.share({ title: post.title, message: `${post.title}\n\n${post.content}\n\nShared via StudOS` }).catch(() => undefined);
  return <View style={styles.card}>
    <View style={styles.header}>
      <TouchableOpacity style={styles.author} onPress={() => onAuthorPress?.(post.author.id)} disabled={!onAuthorPress}>
        <Avatar uri={post.author.avatar} name={post.author.name} size={40} />
        <View style={styles.authorCopy}><Text style={styles.name} numberOfLines={1}>{post.author.name}</Text><Text style={styles.meta} numberOfLines={1}>{[post.author.college || post.author.role, formatPostDate(post.createdAt)].filter(Boolean).join(' · ')}</Text></View>
      </TouchableOpacity>
      <View style={styles.headerRight}><Text style={styles.category}>{labels[post.type]}</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel="More options" style={styles.moreButton}><Ionicons name="ellipsis-horizontal" size={19} color={Colors.textMuted} /></TouchableOpacity></View>
    </View>
    <TouchableOpacity activeOpacity={0.9} onPress={() => onCardPress?.(post)} disabled={!onCardPress}>
      <Text style={styles.title}>{post.title}</Text><Text style={styles.content}>{post.content}</Text>
      {post.document ? <View style={styles.document}><View style={styles.docIcon}><Ionicons name="document-text" size={22} color="#FFF" /></View><View style={styles.docCopy}><Text style={styles.docName} numberOfLines={1}>{post.document.fileName}</Text><Text style={styles.docMeta}>{post.document.pageCount} pages · {post.document.subject}</Text></View><Ionicons name="chevron-forward" size={18} color={Colors.textMuted} /></View> : null}
      {post.images?.length ? <FlatList horizontal pagingEnabled data={post.images} keyExtractor={(_, index) => `${post.id}-media-${index}`} showsHorizontalScrollIndicator={false} style={styles.mediaList} renderItem={({ item, index }) => <View><Image source={{ uri: item }} style={[styles.image, { width: mediaWidth }]} /><View style={styles.counter}><Text style={styles.counterText}>{index + 1}/{post.images!.length}</Text></View></View>} /> : null}
      {(post.rolesNeeded?.length || post.eventRoleNeeded) ? <View style={styles.callout}><Ionicons name="people-outline" size={16} color="#FF7777" /><Text style={styles.calloutText}>Looking for {post.rolesNeeded?.join(', ') || post.eventRoleNeeded}</Text></View> : null}
      {post.tags?.length ? <View style={styles.tags}>{post.tags.slice(0, 4).map((tag) => <Text key={tag} style={styles.tag}>#{tag}</Text>)}</View> : null}
    </TouchableOpacity>
    <View style={styles.actions}>
      {onLike ? <TouchableOpacity style={styles.action} onPress={() => onLike(post)}><Ionicons name={post.isLiked ? 'heart' : 'heart-outline'} size={20} color={post.isLiked ? Colors.primary : Colors.textMuted} /></TouchableOpacity> : null}
      {onComment ? <TouchableOpacity style={styles.action} onPress={() => onComment(post)}><Ionicons name="chatbubble-outline" size={19} color={Colors.textMuted} /></TouchableOpacity> : null}
      {onSave ? <TouchableOpacity style={styles.action} onPress={() => onSave(post)}><Ionicons name={post.isSaved ? 'bookmark' : 'bookmark-outline'} size={19} color={post.isSaved ? Colors.primary : Colors.textMuted} /></TouchableOpacity> : null}
      <TouchableOpacity style={styles.action} onPress={share}><Ionicons name="share-social-outline" size={19} color={Colors.textMuted} /></TouchableOpacity>
      {onCollaborate && (post.type === 'idea' || post.type === 'event_collab') ? <TouchableOpacity style={styles.teamButton} onPress={() => onCollaborate(post)}><Text style={styles.teamText}>{post.type === 'idea' ? 'Collaborate' : 'Join team'}</Text></TouchableOpacity> : null}
    </View>
  </View>;
});

const styles = StyleSheet.create({
  card: { backgroundColor: Colors.card, borderRadius: 20, borderWidth: 1, borderColor: Colors.cardBorder, marginHorizontal: 16, marginBottom: 16, padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, author: { flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 }, authorCopy: { marginLeft: 10, flex: 1, minWidth: 0 }, name: { color: Colors.textPrimary, fontSize: 15, lineHeight: 20, fontWeight: Typography.bold }, meta: { color: Colors.textMuted, fontSize: 12, lineHeight: 17, marginTop: 3 }, headerRight: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 }, category: { color: Colors.primary, backgroundColor: Colors.primarySubtle, fontSize: 11, lineHeight: 16, fontWeight: '700', overflow: 'hidden', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 }, moreButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { color: Colors.textPrimary, fontSize: 18, lineHeight: 25, fontWeight: Typography.bold, marginTop: 15 }, content: { color: Colors.textSecondary, fontSize: 15, lineHeight: 23, marginTop: 7 },
  document: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.border, borderRadius: 14, padding: 12, marginTop: 14 }, docIcon: { width: 42, height: 46, borderRadius: 10, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' }, docCopy: { flex: 1, minWidth: 0, marginLeft: 10 }, docName: { color: Colors.textPrimary, fontSize: 13, lineHeight: 18, fontWeight: Typography.semiBold }, docMeta: { color: Colors.textMuted, fontSize: 12, lineHeight: 16, marginTop: 3 },
  mediaList: { marginHorizontal: -15, marginTop: 12 }, image: { height: 245, resizeMode: 'cover' }, counter: { position: 'absolute', right: 10, top: 10, backgroundColor: 'rgba(9,10,15,.72)', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 4 }, counterText: { color: '#FFF', fontSize: 9, fontWeight: Typography.bold },
  callout: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#171D2D', padding: 10, borderRadius: 10, marginTop: 10 }, calloutText: { color: Colors.textSecondary, fontSize: 11, flex: 1 }, tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 11 }, tag: { color: Colors.textMuted, fontSize: 11 },
  actions: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: Colors.border, marginTop: 14, paddingTop: 8, gap: 6 }, action: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, flex: 1, minWidth: 40, minHeight: 44 }, actionText: { color: Colors.textMuted, fontSize: 12 }, teamButton: { marginLeft: 'auto', flexShrink: 0, minHeight: 44, justifyContent: 'center', borderWidth: 1, borderColor: Colors.primaryBorder, backgroundColor: Colors.primarySubtle, borderRadius: 12, paddingHorizontal: 12 }, teamText: { color: Colors.primary, fontSize: 12, fontWeight: '700' },
});
