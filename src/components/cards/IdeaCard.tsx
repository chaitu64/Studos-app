import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '../ui/Avatar';
import { Colors, Spacing, Typography } from '../../constants/theme';
import { useApp } from '../../context/AppContext';
import { sharedContentService } from '../../services/sharedContentService';
import { supabaseConfigured } from '../../services/supabase';
import type { Idea } from '../../types';

interface IdeaCardProps { idea: Idea; onOpen?: (idea: Idea) => void; }
type Engagement = { sparkCount: number; commentCount: number; isSparkedByViewer: boolean; isSavedByViewer: boolean; bookmarkAvailable?: boolean };

function relativeTime(value: string) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return '';
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1_440) return `${Math.floor(minutes / 60)}h`;
  if (minutes < 43_200) return `${Math.floor(minutes / 1_440)}d`;
  return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export const IdeaCard = React.memo(function IdeaCard({ idea, onOpen }: IdeaCardProps) {
  const { toggleUpvoteIdea, toggleBookmarkIdea } = useApp();
  const [engagement, setEngagement] = useState<Engagement | null>(null);
  const [busy, setBusy] = useState<'spark' | 'save' | ''>('');
  const open = () => onOpen ? onOpen(idea) : router.push(`/ideahub/${idea.id}` as never);
  const refreshEngagement = useCallback(async () => {
    if (!supabaseConfigured) return;
    try { setEngagement(await sharedContentService.ideaEngagement(idea.id)); }
    catch { setEngagement(null); }
  }, [idea.id]);
  useEffect(() => { void Promise.resolve().then(refreshEngagement); }, [refreshEngagement]);

  const share = async () => {
    try { await Share.share({ title: idea.title, message: `${idea.title}\n\n${idea.tagline || idea.problemStatement}` }); }
    catch { Alert.alert('Could not share idea', 'Please try again.'); }
  };
  const report = () => Alert.alert('Report this idea?', 'Send a private report to STUDOS moderation.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Report', style: 'destructive', onPress: () => { void sharedContentService.reportIdea(idea.id, 'inappropriate').then(() => Alert.alert('Report sent', 'Thank you for helping keep STUDOS useful.')).catch((cause) => Alert.alert('Report not sent', cause instanceof Error ? cause.message : 'Please try again.')); } },
  ]);
  const more = () => Alert.alert('Idea options', idea.title, [
    { text: 'Share idea', onPress: () => { void share(); } },
    { text: 'Report idea', style: 'destructive', onPress: report },
    { text: 'Cancel', style: 'cancel' },
  ]);
  const spark = async () => {
    if (busy) return;
    const current = engagement || { sparkCount: idea.upvotes || 0, commentCount: idea.commentsCount || 0, isSparkedByViewer: Boolean(idea.isUpvoted), isSavedByViewer: Boolean(idea.isBookmarked) };
    const prior = engagement;
    setBusy('spark'); setEngagement({ ...current, isSparkedByViewer: !current.isSparkedByViewer, sparkCount: Math.max(0, current.sparkCount + (current.isSparkedByViewer ? -1 : 1)) });
    try { await toggleUpvoteIdea(idea.id); await refreshEngagement(); }
    catch (cause) { setEngagement(prior); Alert.alert('Spark not updated', cause instanceof Error ? cause.message : 'Please try again.'); }
    finally { setBusy(''); }
  };
  const save = async () => {
    if (busy) return;
    const current = engagement || { sparkCount: idea.upvotes || 0, commentCount: idea.commentsCount || 0, isSparkedByViewer: Boolean(idea.isUpvoted), isSavedByViewer: Boolean(idea.isBookmarked) };
    const prior = engagement;
    setBusy('save'); setEngagement({ ...current, isSavedByViewer: !current.isSavedByViewer });
    try { await toggleBookmarkIdea(idea.id); await refreshEngagement(); }
    catch (cause) { setEngagement(prior); Alert.alert('Idea not saved', cause instanceof Error ? cause.message : 'Please try again.'); }
    finally { setBusy(''); }
  };
  const isSparked = engagement?.isSparkedByViewer ?? Boolean(idea.isUpvoted);
  const isSaved = engagement?.isSavedByViewer ?? Boolean(idea.isBookmarked);
  const sparkCount = engagement?.sparkCount ?? idea.upvotes;
  const commentCount = engagement?.commentCount ?? idea.commentsCount;
  const preview = [idea.problemStatement, idea.proposedSolution ? `\n\n${idea.proposedSolution}` : ''].filter(Boolean).join('');
  const previewText = preview || idea.tagline;
  const authorIdentity = idea.creator.identity;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={`View ${idea.creator.name}'s student profile`} onPress={() => { if (authorIdentity) router.push(`/student/${authorIdentity.type}/${authorIdentity.id}` as never); }} style={styles.author} disabled={!authorIdentity}>
          <Avatar uri={idea.creator.avatar} name={idea.creator.name} size={42} />
          <View style={styles.authorCopy}>
            <Text style={styles.authorName} numberOfLines={1}>{idea.creator.name}</Text>
            <Text style={styles.authorMeta} numberOfLines={2}>{[idea.creator.college, idea.creator.role, idea.creator.studyYear].filter(Boolean).join(' · ')}</Text>
            <Text style={styles.timestamp}>{relativeTime(idea.createdAt)}</Text>
          </View>
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <View style={styles.ideaMark}><Ionicons name="bulb-outline" size={17} color={Colors.primary} /><Text style={styles.ideaMarkText}>IDEA</Text></View>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="More idea actions" onPress={more} style={styles.more}><Ionicons name="ellipsis-horizontal" size={20} color={Colors.textMuted} /></TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Read idea: ${idea.title}`} activeOpacity={0.82} onPress={open} style={styles.content}>
        <Text style={styles.title}>{idea.title}</Text>
        {previewText ? <Text style={styles.preview} numberOfLines={5}>{previewText}</Text> : null}
        {previewText.length > 210 ? <Text style={styles.readMore}>Read full idea <Ionicons name="arrow-forward" size={13} color={Colors.primary} /></Text> : null}
      </TouchableOpacity>

      <View style={styles.labels}>
        {idea.ideaType ? <View style={styles.typeChip}><Text style={styles.typeText}>{idea.ideaType}</Text></View> : null}
        {idea.category ? <View style={styles.categoryChip}><Text style={styles.categoryText}>{idea.category}</Text></View> : null}
        {idea.stage ? <View style={styles.stageChip}><Text style={styles.stageText}>{idea.stage}</Text></View> : null}
      </View>

      {idea.tags.length || idea.requiredSkills.length ? <View style={styles.tags}>
        {[...idea.requiredSkills.slice(0, 3).map((tag) => `#${tag.replace(/^#/, '')}`), ...idea.tags.slice(0, Math.max(0, 3 - Math.min(idea.requiredSkills.length, 3))).map((tag) => `#${tag.replace(/^#/, '')}`)].map((tag, index) => <Text key={`${tag}-${index}`} style={styles.tag}>{tag}</Text>)}
      </View> : null}

      {idea.collaborationOpen === true ? <View style={styles.collaboration}><View style={styles.openDot} /><Text style={styles.collaborationText}>Open to collaboration</Text></View> : idea.collaborationOpen === false ? <Text style={styles.closedCollaboration}>Team not accepting requests</Text> : null}

      <View style={styles.engagement}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={`${isSparked ? 'Remove Spark' : 'Spark this idea'}${sparkCount === undefined ? '' : `, ${sparkCount}`}`} accessibilityState={{ selected: isSparked, disabled: busy === 'spark' }} onPress={() => { void spark(); }} style={[styles.action, isSparked && styles.actionActive]}>
          {busy === 'spark' ? <ActivityIndicator size="small" color={Colors.primary} /> : <Ionicons name={isSparked ? 'flash' : 'flash-outline'} size={19} color={Colors.primary} />}
          <Text style={[styles.actionText, isSparked && styles.actionActiveText]}>{sparkCount ?? '—'} <Text style={styles.actionCaption}>Sparks</Text></Text>
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Open discussion${commentCount === undefined ? '' : `, ${commentCount} comments`}`} onPress={open} style={styles.action}>
          <Ionicons name="chatbubble-outline" size={18} color={Colors.textMuted} /><Text style={styles.actionText}>{commentCount ?? '—'} <Text style={styles.actionCaption}>Comments</Text></Text>
        </TouchableOpacity>
        {idea.bookmarkAvailable !== false && engagement?.bookmarkAvailable !== false ? <TouchableOpacity accessibilityRole="button" accessibilityLabel={isSaved ? 'Remove saved idea' : 'Save idea'} accessibilityState={{ selected: isSaved, disabled: busy === 'save' }} disabled={busy === 'save'} onPress={() => { void save(); }} style={styles.saveButton}>
          {busy === 'save' ? <ActivityIndicator size="small" color={Colors.primary} /> : <Ionicons name={isSaved ? 'bookmark' : 'bookmark-outline'} size={19} color={isSaved ? Colors.primary : Colors.textMuted} />}
        </TouchableOpacity> : null}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: { backgroundColor: Colors.card, borderRadius: 18, borderWidth: 1, borderColor: Colors.cardBorder, marginBottom: Spacing.md, padding: 15 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }, author: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 }, authorCopy: { flex: 1, minWidth: 0 }, authorName: { color: Colors.textPrimary, fontSize: 14, lineHeight: 19, fontWeight: Typography.bold }, authorMeta: { color: Colors.textMuted, fontSize: 11, lineHeight: 15, marginTop: 2 }, timestamp: { color: Colors.textMuted, fontSize: 11, marginTop: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 1 }, ideaMark: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 999, backgroundColor: Colors.primarySubtle }, ideaMarkText: { fontSize: 10, color: Colors.primary, fontWeight: Typography.bold, letterSpacing: .4 }, more: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  content: { paddingTop: 14 }, title: { color: Colors.textPrimary, fontSize: 19, lineHeight: 26, fontWeight: Typography.bold }, preview: { color: Colors.textSecondary, fontSize: 14, lineHeight: 22, marginTop: 7 }, readMore: { flexDirection: 'row', alignItems: 'center', color: Colors.primary, fontSize: 12, fontWeight: Typography.semiBold, marginTop: 6 },
  labels: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 12 }, typeChip: { borderRadius: 999, backgroundColor: Colors.primarySubtle, paddingVertical: 5, paddingHorizontal: 9 }, typeText: { color: Colors.primary, fontSize: 11, fontWeight: Typography.semiBold }, categoryChip: { borderRadius: 999, backgroundColor: Colors.surfaceHighlight, paddingVertical: 5, paddingHorizontal: 9 }, categoryText: { color: Colors.textSecondary, fontSize: 11, fontWeight: Typography.medium }, stageChip: { borderWidth: 1, borderColor: Colors.border, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 9 }, stageText: { color: Colors.textMuted, fontSize: 11, fontWeight: Typography.medium },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 11 }, tag: { color: Colors.primary, fontSize: 12, lineHeight: 18, fontWeight: Typography.medium }, collaboration: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 12 }, openDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.success }, collaborationText: { color: Colors.textSecondary, fontSize: 12, fontWeight: Typography.medium }, closedCollaboration: { marginTop: 11, color: Colors.textMuted, fontSize: 12 },
  engagement: { flexDirection: 'row', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border, marginTop: 14, paddingTop: 8, gap: 5 }, action: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, minHeight: 44, paddingHorizontal: 5, borderRadius: 10 }, actionActive: { backgroundColor: Colors.primarySubtle }, actionText: { color: Colors.textPrimary, fontSize: 12, fontWeight: Typography.semiBold }, actionCaption: { color: Colors.textMuted, fontSize: 11, fontWeight: Typography.regular }, actionActiveText: { color: Colors.primary }, saveButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
});
