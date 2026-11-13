import React, { useState } from 'react';
import { GestureResponderEvent, Image, Linking, Pressable, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '../ui/Avatar';
import { Colors, Typography } from '../../constants/theme';
import type { DemoIdea } from '../../services/demoIdeasService';
import type { StudentHelpRequest, StudentProblem } from '../../services/studentCommunityService';
import type { CommunityPost } from '../../types';
import { CommunityPollCard } from './CommunityPollCard';

export type HomeFeedEntry =
  | { kind: 'idea'; id: string; createdAt: string; data: DemoIdea }
  | { kind: 'problem'; id: string; createdAt: string; data: StudentProblem }
  | { kind: 'help'; id: string; createdAt: string; data: StudentHelpRequest }
  | { kind: 'post'; id: string; createdAt: string; data: CommunityPost };

type Props = {
  entry: HomeFeedEntry;
  busyAction?: string | null;
  onOpen: () => void;
  onAuthor: () => void;
  onSpark?: () => void;
  onSaveIdea?: () => void;
  onLike?: () => void;
  onSavePost?: () => void;
  onCollaborate?: () => void;
};

function relativeTime(value: string) {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return '';
  const elapsed = Math.max(0, Date.now() - timestamp);
  if (elapsed < 60_000) return 'now';
  if (elapsed < 3_600_000) return `${Math.floor(elapsed / 60_000)}m`;
  if (elapsed < 86_400_000) return `${Math.floor(elapsed / 3_600_000)}h`;
  const days = Math.floor(elapsed / 86_400_000);
  return days < 7 ? `${days}d` : new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function readableType(entry: HomeFeedEntry) {
  if (entry.kind === 'idea') return 'Idea';
  if (entry.kind === 'problem') return 'Problem';
  if (entry.kind === 'help') return 'Help Needed';
  const labels: Record<CommunityPost['type'], string> = { idea: 'Idea', service: 'Resource', story: 'General Post', event_collab: 'Help Needed', project: 'Build', question: 'Problem', study_material: 'Resource', poll: 'Survey', achievement: 'General Post' };
  return labels[entry.data.type] || 'General Post';
}

function categoryTone(entry: HomeFeedEntry) {
  const label = readableType(entry);
  if (label === 'Idea') return { color: '#A696E8', background: '#28233B' };
  if (label === 'Problem') return { color: '#E1B66E', background: '#302719' };
  if (label === 'Build') return { color: '#61B9C1', background: '#17292E' };
  if (label === 'Help Needed') return { color: Colors.primary, background: Colors.primarySubtle };
  if (label === 'Resource') return { color: '#86AEE8', background: '#1D293A' };
  if (label === 'Survey') return { color: '#A696E8', background: '#24233A' };
  return { color: Colors.textMuted, background: Colors.surfaceHighlight };
}

export const HomeFeedItem = React.memo(function HomeFeedItem({ entry, busyAction, onOpen, onAuthor, onSpark, onSaveIdea, onLike, onSavePost, onCollaborate }: Props) {
  const { width } = useWindowDimensions();
  const [expanded, setExpanded] = useState(false);
  const idea = entry.kind === 'idea' ? entry.data : null;
  const post = entry.kind === 'post' ? entry.data : null;
  const communityRecord = entry.kind === 'problem' || entry.kind === 'help' ? entry.data : null;
  const author = idea ? { name: idea.author.name, avatar: idea.author.avatarUrl || '', college: idea.author.college, branch: idea.author.branch }
    : post ? { name: post.author.name, avatar: post.author.avatar, college: post.author.college, branch: post.author.role }
      : communityRecord ? { name: communityRecord.author.name, avatar: communityRecord.author.avatar, college: communityRecord.author.college, branch: communityRecord.author.branch } : null;
  if (!author) return null;

  const title = idea?.title || post?.title || communityRecord?.title || '';
  const description = idea?.description || post?.content || communityRecord?.description || '';
  const longText = description.length > 220;
  const mediaWidth = Math.max(1, Math.min(width - 40, 788));
  const tags = idea?.tags || post?.tags || (entry.kind === 'problem' ? entry.data.tags : entry.kind === 'help' ? entry.data.skillsNeeded : []);
  const sample = Boolean(idea?.author.identity.type === 'demo' || communityRecord?.isDemo || post?.author.identity?.type === 'demo');
  const tone = categoryTone(entry);
  const openInline = () => setExpanded((value) => !value);

  const stop = (event: GestureResponderEvent) => event.stopPropagation();
  // The card contains its own buttons and links. Keep the container non-interactive
  // so React Native Web does not render invalid nested <button> elements.
  return <View style={styles.row}>
    <View style={styles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel={`View ${author.name}'s profile`} onPress={(event) => { stop(event); onAuthor(); }} style={styles.authorButton}>
        <View style={styles.avatarOutline}><Avatar uri={author.avatar} name={author.name} size={34}/></View>
        <View style={styles.authorCopy}>
          <Text style={styles.authorName} numberOfLines={1}>{author.name}</Text>
          <Text style={styles.authorMeta} numberOfLines={1}>{[author.college, author.branch, relativeTime(entry.createdAt)].filter(Boolean).join(' · ')}</Text>
        </View>
      </Pressable>
      <View style={styles.labels}><View style={[styles.typePill, { backgroundColor: tone.background }]}><View style={[styles.typeDot, { backgroundColor: tone.color }]}/><Text style={[styles.type, { color: tone.color }]} numberOfLines={1}>{readableType(entry)}</Text></View>{sample ? <Text style={styles.sampleLabel}>Sample</Text> : null}</View>
    </View>

    <View style={styles.content}>
      {title ? <Pressable accessibilityRole="button" accessibilityLabel={`Open ${title}`} onPress={onOpen}><Text style={styles.title} numberOfLines={2}>{title}</Text></Pressable> : null}
    </View>
    <Text accessibilityRole={longText ? 'button' : undefined} accessibilityLabel={longText ? `${expanded ? 'Collapse' : 'Read more'}: ${title}` : undefined} onPress={longText ? (event) => { stop(event); openInline(); } : undefined} style={styles.description} numberOfLines={expanded ? undefined : 4}>
      {description}{longText && !expanded ? <Text accessibilityRole="link" onPress={(event) => { stop(event); openInline(); }} style={styles.readMore}>  Read more</Text> : null}
      {longText && expanded ? <Text accessibilityRole="link" onPress={(event) => { stop(event); onOpen(); }} style={styles.readMore}>  Open details</Text> : null}
    </Text>

    {post?.document ? <Pressable accessibilityRole="button" accessibilityLabel="Open attached study resource" onPress={(event) => { stop(event); onOpen(); }} style={styles.attachment}><Ionicons name="document-text-outline" size={18} color={Colors.textMuted}/><View style={styles.attachmentCopy}><Text numberOfLines={1} style={styles.attachmentTitle}>{post.document.fileName}</Text><Text numberOfLines={1} style={styles.attachmentMeta}>{post.document.subject}</Text></View><Ionicons name="chevron-forward" size={17} color={Colors.textMuted}/></Pressable> : null}
    {post?.attachments?.map((url, index) => <Pressable key={`${url}:${index}`} accessibilityRole="link" accessibilityLabel={`Open attachment ${index + 1}`} onPress={(event) => { stop(event); try { const parsed = new URL(url); if (['https:', 'http:'].includes(parsed.protocol)) void Linking.openURL(parsed.toString()); } catch { /* Ignore invalid stored URLs. */ } }} style={styles.attachment}><Ionicons name="document-attach-outline" size={18} color={Colors.textMuted}/><View style={styles.attachmentCopy}><Text numberOfLines={1} style={styles.attachmentTitle}>Attachment {index + 1}</Text><Text numberOfLines={1} style={styles.attachmentMeta}>{url.split('?')[0].split('/').pop()}</Text></View><Ionicons name="open-outline" size={17} color={Colors.textMuted}/></Pressable>)}
    {post?.images?.length ? <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.media} contentContainerStyle={styles.mediaContent}>
      {post.images.map((uri, index) => <Image key={`${entry.id}:image:${index}`} source={{ uri }} accessibilityLabel={`Post image ${index + 1}`} style={[styles.image, { width: mediaWidth }]} />)}
    </ScrollView> : null}
    {post?.type === 'poll' && typeof post.metadata?.pollId === 'string' ? <CommunityPollCard pollId={post.metadata.pollId} onInteraction={stop}/> : null}
    {post ? [...new Set([...(post.links || []), post.githubUrl, post.demoUrl].filter((value): value is string => typeof value === 'string'))].slice(0, 4).map((url) => <Pressable key={url} accessibilityRole="link" accessibilityLabel={`Open link ${url}`} onPress={(event) => { stop(event); try { const parsed = new URL(url); if (['https:', 'http:'].includes(parsed.protocol)) void Linking.openURL(parsed.toString()); } catch { /* Ignore invalid stored URLs. */ } }} style={styles.resourceLink}><Ionicons name="link-outline" size={15} color={Colors.primary}/><Text numberOfLines={1} style={styles.resourceLinkText}>{url}</Text></Pressable>) : null}
    {tags?.length ? <View style={styles.tags}>{tags.slice(0, 3).map((tag, index) => <View key={`${entry.id}:tag:${index}`} style={styles.tag}><Text numberOfLines={1} style={styles.tagText}>#{tag.replace(/^#/, '')}</Text></View>)}</View> : null}

    {idea || post ? <View style={styles.actions}>
      {idea && onSpark && idea.sparkCount != null ? <Action label="Spark" icon={idea.isSparkedByViewer ? 'flash' : 'flash-outline'} value={idea.sparkCount} busy={busyAction === 'spark'} selected={idea.isSparkedByViewer} onPress={onSpark}/> : null}
      {post && onLike && post.likesAvailable !== false ? <Action label={post.isLiked ? 'Interested' : 'Interested'} icon={post.isLiked ? 'heart' : 'heart-outline'} value={post.likesCount} busy={busyAction === 'like'} selected={post.isLiked} onPress={onLike}/> : null}
      {idea ? <Action label="Discuss" icon="chatbubble-outline" onPress={onOpen}/> : null}
      {post && post.commentsAvailable !== false ? <Action label="Discuss" icon="chatbubble-outline" value={post.commentsCount} onPress={onOpen}/> : null}
      {idea && idea.bookmarkAvailable ? <Action label={idea.isSavedByViewer ? 'Saved' : 'Save'} icon={idea.isSavedByViewer ? 'bookmark' : 'bookmark-outline'} busy={busyAction === 'save'} selected={idea.isSavedByViewer} onPress={onSaveIdea}/> : null}
      {post && onSavePost && post.savesAvailable !== false ? <Action label={post.isSaved ? 'Saved' : 'Save'} icon={post.isSaved ? 'bookmark' : 'bookmark-outline'} busy={busyAction === 'save'} selected={post.isSaved} onPress={onSavePost}/> : null}
      {post ? <Action label="Share" icon="share-social-outline" onPress={() => { void Share.share({ title: post.title, message: `${post.title}\n\n${post.content}\n\nShared via STUDOS` }).catch(() => undefined); }}/> : null}
      {idea?.collaborationOpen ? <Action label="Collaborate" icon="people-outline" onPress={onOpen}/> : null}
      {post && onCollaborate && (post.type === 'idea' || post.type === 'event_collab') ? <Action label="Request" icon="people-outline" onPress={onCollaborate}/> : null}
    </View> : null}
  </View>;
});

function Action({ label, icon, value, busy, selected, onPress }: { label: string; icon: React.ComponentProps<typeof Ionicons>['name']; value?: number | null; busy?: boolean; selected?: boolean; onPress?: () => void }) {
  if (!onPress) return null;
  return <TouchableOpacity accessibilityRole="button" accessibilityLabel={`${label}${typeof value === 'number' ? `, ${value}` : ''}`} accessibilityState={{ selected, disabled: busy }} disabled={busy} onPress={(event) => { event.stopPropagation(); onPress(); }} style={styles.action}>
    <Ionicons name={icon} size={17} color={selected ? Colors.primary : Colors.textMuted}/>
    <Text style={[styles.actionText, selected && styles.actionSelected]}>{label}{typeof value === 'number' ? ` ${value}` : ''}</Text>
  </TouchableOpacity>;
}

const styles = StyleSheet.create({
  row: { width: '100%', maxWidth: 840, alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.divider, backgroundColor: Colors.background },
  rowPressed: { backgroundColor: Colors.surfaceHighlight },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatarOutline: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: Colors.cardBorderHover, alignItems: 'center', justifyContent: 'center' },
  authorButton: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 9, minHeight: 40 },
  authorCopy: { flex: 1, minWidth: 0 },
  authorName: { color: Colors.textPrimary, fontSize: 14, lineHeight: 19, fontWeight: Typography.semiBold },
  authorMeta: { color: Colors.textMuted, fontSize: 12, lineHeight: 16, marginTop: 2 },
  labels: { maxWidth: '43%', flexShrink: 0, alignItems: 'flex-end', gap: 3 },
  typePill: { maxWidth: '100%', minHeight: 25, paddingHorizontal: 8, borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 5 },
  typeDot: { width: 5, height: 5, borderRadius: 3 },
  type: { fontSize: 10, lineHeight: 14, fontWeight: Typography.semiBold, flexShrink: 1 },
  sampleLabel: { color: Colors.textSubtle, fontSize: 9, lineHeight: 12, paddingRight: 3 },
  content: { alignSelf: 'flex-start', maxWidth: '100%', marginTop: 6 },
  title: { color: Colors.textPrimary, fontSize: 16, lineHeight: 22, fontWeight: Typography.semiBold },
  description: { color: Colors.textSecondary, fontSize: 13, lineHeight: 20, marginTop: 3 },
  readMore: { color: Colors.primary, fontWeight: Typography.medium },
  attachment: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, marginTop: 12, paddingHorizontal: 12, borderRadius: 8, backgroundColor: Colors.surfaceElevated },
  attachmentCopy: { flex: 1, minWidth: 0 }, attachmentTitle: { color: Colors.textPrimary, fontSize: 13, lineHeight: 18, fontWeight: Typography.medium }, attachmentMeta: { color: Colors.textMuted, fontSize: 12, lineHeight: 16 },
  resourceLink: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36, paddingHorizontal: 2 }, resourceLinkText: { flex: 1, color: Colors.primary, fontSize: 12, lineHeight: 17 },
  media: { marginTop: 12, marginHorizontal: -16 }, mediaContent: { gap: 8, paddingHorizontal: 16 }, image: { aspectRatio: 1.45, maxHeight: 440, borderRadius: 8, backgroundColor: Colors.surfaceElevated },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 9 },
  tag: { maxWidth: '48%', backgroundColor: Colors.surfaceElevated, borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3 },
  tagText: { color: Colors.textMuted, fontSize: 10, lineHeight: 15 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 12 },
  action: { minHeight: 40, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 8 },
  actionText: { color: Colors.textMuted, fontSize: 12, lineHeight: 16 }, actionSelected: { color: Colors.primary },
});
