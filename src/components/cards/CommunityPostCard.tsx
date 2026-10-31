import React from 'react';
import { Dimensions, FlatList, Image, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '../ui/Avatar';
import { Colors, Typography } from '../../constants/theme';
import { CommunityPost } from '../../types';

export interface CommunityPostCardProps {
  post: CommunityPost; onLike?: (post: CommunityPost) => void; onComment?: (post: CommunityPost) => void;
  onSave?: (post: CommunityPost) => void; onCollaborate?: (post: CommunityPost) => void;
  onAuthorPress?: (authorId: string) => void; onCardPress?: (post: CommunityPost) => void;
}

const mediaWidth = Dimensions.get('window').width - 34;
const labels: Record<CommunityPost['type'], string> = { idea: 'Idea', service: 'Service', story: 'Campus life', event_collab: 'Team up', project: 'Project', question: 'Help', study_material: 'Study material', achievement: 'Achievement' };

export const CommunityPostCard = React.memo(function CommunityPostCard({ post, onLike, onComment, onSave, onCollaborate, onAuthorPress, onCardPress }: CommunityPostCardProps) {
  const isDemo = Boolean(post.demo || post.id.startsWith('preview_'));
  const share = () => Share.share({ title: post.title, message: `${post.title}\n\n${post.content}\n\nShared via StudOS` }).catch(() => undefined);
  return <View style={styles.card}>
    <View style={styles.header}>
      <TouchableOpacity style={styles.author} onPress={() => onAuthorPress?.(post.author.id)} disabled={!onAuthorPress}>
        <Avatar uri={post.author.avatar} name={post.author.name} size={40} />
        <View style={styles.authorCopy}><Text style={styles.name}>{post.author.name}</Text><Text style={styles.meta} numberOfLines={1}>{post.author.college || post.author.role} · {post.createdAt}</Text></View>
      </TouchableOpacity>
      <View style={styles.headerRight}><Text style={styles.category}>{labels[post.type]}</Text><TouchableOpacity accessibilityLabel="More options"><Ionicons name="ellipsis-horizontal" size={19} color={Colors.textMuted} /></TouchableOpacity></View>
    </View>
    <TouchableOpacity activeOpacity={0.9} onPress={() => onCardPress?.(post)} disabled={!onCardPress}>
      <Text style={styles.title}>{post.title}</Text><Text style={styles.content}>{post.content}</Text>
      {post.document ? <View style={styles.document}><View style={styles.docIcon}><Ionicons name="document-text" size={22} color="#FFF" /></View><View style={styles.docCopy}><Text style={styles.docName} numberOfLines={1}>{post.document.fileName}</Text><Text style={styles.docMeta}>{post.document.pageCount} pages · {post.document.subject}</Text></View><Ionicons name="chevron-forward" size={18} color={Colors.textMuted} /></View> : null}
      {post.images?.length ? <FlatList horizontal pagingEnabled data={post.images} keyExtractor={(_, index) => `${post.id}-media-${index}`} showsHorizontalScrollIndicator={false} style={styles.mediaList} renderItem={({ item, index }) => <View><Image source={{ uri: item }} style={[styles.image, { width: mediaWidth }]} /><View style={styles.counter}><Text style={styles.counterText}>{index + 1}/{post.images!.length}</Text></View></View>} /> : null}
      {(post.rolesNeeded?.length || post.eventRoleNeeded) ? <View style={styles.callout}><Ionicons name="people-outline" size={16} color="#FF7777" /><Text style={styles.calloutText}>Looking for {post.rolesNeeded?.join(', ') || post.eventRoleNeeded}</Text></View> : null}
      {post.tags?.length ? <View style={styles.tags}>{post.tags.slice(0, 4).map((tag) => <Text key={tag} style={styles.tag}>#{tag}</Text>)}</View> : null}
    </TouchableOpacity>
    {isDemo ? <View style={styles.demo}><Ionicons name="flask-outline" size={13} color="#D4A35A" /><Text style={styles.demoText}>{post.demoLabel || 'Preview data · Development only'}</Text></View> : null}
    <View style={styles.actions}>
      <TouchableOpacity style={styles.action} onPress={() => onLike?.(post)} disabled={!onLike}><Ionicons name={post.isLiked ? 'heart' : 'heart-outline'} size={20} color={post.isLiked ? Colors.primary : Colors.textMuted} /><Text style={styles.actionText}>{post.likesCount || ''}</Text></TouchableOpacity>
      <TouchableOpacity style={styles.action} onPress={() => onComment?.(post)} disabled={!onComment}><Ionicons name="chatbubble-outline" size={19} color={Colors.textMuted} /><Text style={styles.actionText}>{post.commentsCount || ''}</Text></TouchableOpacity>
      <TouchableOpacity style={styles.action} onPress={() => onSave?.(post)} disabled={!onSave}><Ionicons name={post.isSaved ? 'bookmark' : 'bookmark-outline'} size={19} color={post.isSaved ? Colors.primary : Colors.textMuted} /></TouchableOpacity>
      <TouchableOpacity style={styles.action} onPress={share}><Ionicons name="share-social-outline" size={19} color={Colors.textMuted} /></TouchableOpacity>
      {onCollaborate && (post.type === 'idea' || post.type === 'event_collab') ? <TouchableOpacity style={styles.teamButton} onPress={() => onCollaborate(post)}><Text style={styles.teamText}>{post.type === 'idea' ? 'Collaborate' : 'Join team'}</Text></TouchableOpacity> : null}
    </View>
  </View>;
});

const styles = StyleSheet.create({
  card: { backgroundColor: '#121624', borderRadius: 16, borderWidth: 1, borderColor: '#252C3D', marginHorizontal: 16, marginBottom: 12, padding: 15, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, author: { flexDirection: 'row', alignItems: 'center', flex: 1 }, authorCopy: { marginLeft: 10, flex: 1 }, name: { color: '#FFF', fontSize: 14, fontWeight: Typography.bold }, meta: { color: Colors.textMuted, fontSize: 10, marginTop: 2 }, headerRight: { flexDirection: 'row', alignItems: 'center', gap: 9 }, category: { color: '#FF7777', fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  title: { color: '#FFF', fontSize: 17, lineHeight: 23, fontWeight: Typography.bold, marginTop: 14 }, content: { color: Colors.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 6 },
  document: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#171D2D', borderWidth: 1, borderColor: '#252C3D', borderRadius: 12, padding: 10, marginTop: 12 }, docIcon: { width: 38, height: 42, borderRadius: 8, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' }, docCopy: { flex: 1, marginLeft: 10 }, docName: { color: '#FFF', fontSize: 12, fontWeight: Typography.semiBold }, docMeta: { color: Colors.textMuted, fontSize: 10, marginTop: 3 },
  mediaList: { marginHorizontal: -15, marginTop: 12 }, image: { height: 245, resizeMode: 'cover' }, counter: { position: 'absolute', right: 10, top: 10, backgroundColor: 'rgba(9,10,15,.72)', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 4 }, counterText: { color: '#FFF', fontSize: 9, fontWeight: Typography.bold },
  callout: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#171D2D', padding: 10, borderRadius: 10, marginTop: 10 }, calloutText: { color: Colors.textSecondary, fontSize: 11, flex: 1 }, tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 11 }, tag: { color: Colors.textMuted, fontSize: 11 }, demo: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 11 }, demoText: { color: '#D4A35A', fontSize: 9, fontWeight: Typography.semiBold },
  actions: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#252C3D', marginTop: 13, paddingTop: 12, gap: 18 }, action: { flexDirection: 'row', alignItems: 'center', gap: 5, minWidth: 19 }, actionText: { color: Colors.textMuted, fontSize: 11 }, teamButton: { marginLeft: 'auto', borderWidth: 1, borderColor: '#5B3037', backgroundColor: '#2A1B22', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }, teamText: { color: '#FF7777', fontSize: 10, fontWeight: '800' },
});
