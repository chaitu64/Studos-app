import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Avatar } from '../ui/Avatar';
import { Colors, Spacing, Typography } from '../../constants/theme';
import type { DemoIdea } from '../../services/demoIdeasService';

type Props = { idea: DemoIdea; busy?: boolean; onSpark: () => void; onOpen: () => void };
const relativeTime = (value: string) => {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};

export function DemoIdeaCard({ idea, busy = false, onSpark, onOpen }: Props) {
  const meta = [idea.author.college, idea.author.branch, idea.author.studyYear ? `Year ${idea.author.studyYear}` : null].filter(Boolean).join(' · ');
  return <View style={styles.card}>
    <View style={styles.authorRow}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={idea.author.id ? `View ${idea.author.name}'s demo profile` : 'Student profile unavailable'} disabled={!idea.author.id} onPress={() => idea.author.id && router.push(`/student/demo/${idea.author.id}` as never)} style={styles.author}>
        <Avatar uri={idea.author.avatarUrl || ''} name={idea.author.name} size={42} />
        <View style={styles.authorCopy}><Text style={styles.authorName} numberOfLines={1}>{idea.author.name}</Text><Text style={styles.authorMeta} numberOfLines={2}>{meta || 'Student'}</Text><Text style={styles.time}>{relativeTime(idea.createdAt)}</Text></View>
      </TouchableOpacity>
      <View style={styles.ideaBadge}><Ionicons name="bulb" size={15} color={Colors.primary} /><Text style={styles.ideaBadgeText}>IDEA</Text></View>
    </View>
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Open idea ${idea.title}`} onPress={onOpen} activeOpacity={0.86} style={styles.content}>
      <Text style={styles.title}>{idea.title}</Text>
      <Text style={styles.description} numberOfLines={5}>{idea.description}</Text>
      {idea.description.length > 220 ? <Text style={styles.readMore}>Read the full idea <Ionicons name="arrow-forward" size={13} color={Colors.primary} /></Text> : null}
    </TouchableOpacity>
    <View style={styles.labels}>
      {idea.ideaType ? <Text style={[styles.chip, styles.typeChip]}>{idea.ideaType}</Text> : null}
      {idea.category ? <Text style={styles.chip}>{idea.category}</Text> : null}
      {idea.stage ? <Text style={[styles.chip, styles.stageChip]}>{idea.stage}</Text> : null}
    </View>
    {idea.tags.length ? <View style={styles.tags}>{idea.tags.slice(0, 3).map((tag) => <Text key={tag} style={styles.tag}>#{tag.replace(/^#/, '')}</Text>)}</View> : null}
    {idea.skillsNeeded.length ? <View style={styles.tags}>{idea.skillsNeeded.slice(0, 3).map((skill) => <Text key={skill} style={styles.skill}>Needs {skill}</Text>)}</View> : null}
    <View style={styles.collaboration}><View style={[styles.dot, idea.collaborationOpen ? styles.openDot : styles.closedDot]} /><Text style={styles.collaborationText}>{idea.collaborationOpen ? 'Open to collaboration' : 'Team not accepting requests'}</Text></View>
    <View style={styles.actions}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={idea.sparkCount == null ? 'Spark count unavailable' : `${idea.isSparkedByViewer ? 'Remove Spark' : 'Spark this idea'}, ${idea.sparkCount} Sparks`} accessibilityState={{ selected: idea.isSparkedByViewer, disabled: busy || idea.sparkCount == null }} disabled={busy || idea.sparkCount == null} onPress={onSpark} style={[styles.action, idea.isSparkedByViewer && styles.sparked]}>
        {busy ? <ActivityIndicator size="small" color={Colors.primary} /> : <Ionicons name={idea.isSparkedByViewer ? 'flash' : 'flash-outline'} size={19} color={Colors.primary} />}
        <Text style={styles.actionText}>{idea.sparkCount ?? '—'} <Text style={styles.actionMuted}>Sparks</Text></Text>
      </TouchableOpacity>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Open ${idea.commentCount ?? 'unavailable'} comments`} onPress={onOpen} style={styles.action}><Ionicons name="chatbubble-outline" size={18} color={Colors.textMuted} /><Text style={styles.actionText}>{idea.commentCount ?? '—'} <Text style={styles.actionMuted}>Comments</Text></Text></TouchableOpacity>
      <View style={styles.collaborators}><Ionicons name="people-outline" size={17} color={Colors.textMuted} /><Text style={styles.collaboratorCount}>{idea.collaboratorCount ?? '—'}</Text></View>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: 20, padding: 16, marginBottom: Spacing.md },
  authorRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }, author: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 }, authorCopy: { flex: 1, minWidth: 0 }, authorName: { color: Colors.textPrimary, fontWeight: Typography.bold, fontSize: 14, lineHeight: 19 }, authorMeta: { color: Colors.textMuted, fontSize: 11, lineHeight: 15, marginTop: 2 }, time: { color: Colors.textSubtle, fontSize: 11, marginTop: 2 },
  ideaBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 20, backgroundColor: Colors.primarySubtle }, ideaBadgeText: { color: Colors.primary, fontSize: 10, letterSpacing: .5, fontWeight: Typography.bold },
  content: { paddingTop: 14 }, title: { color: Colors.textPrimary, fontSize: 20, lineHeight: 27, fontWeight: Typography.bold }, description: { color: Colors.textSecondary, fontSize: 14, lineHeight: 21, marginTop: 7 }, readMore: { color: Colors.primary, fontSize: 12, fontWeight: Typography.semiBold, marginTop: 6 },
  labels: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 12 }, chip: { overflow: 'hidden', color: Colors.textSecondary, backgroundColor: Colors.surfaceHighlight, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20, fontSize: 11, lineHeight: 15 }, typeChip: { color: Colors.primary, backgroundColor: Colors.primarySubtle }, stageChip: { color: Colors.textMuted, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border }, tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 }, tag: { color: Colors.accentCyan, fontSize: 12, lineHeight: 18, fontWeight: Typography.medium },
  skill: { color: Colors.textSecondary, backgroundColor: Colors.surface, borderColor: Colors.border, borderWidth: 1, overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 16, fontSize: 10 }, collaboration: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 12 }, dot: { width: 7, height: 7, borderRadius: 4 }, openDot: { backgroundColor: Colors.success }, closedDot: { backgroundColor: Colors.textSubtle }, collaborationText: { color: Colors.textSecondary, fontSize: 12 },
  actions: { flexDirection: 'row', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border, marginTop: 14, paddingTop: 8, gap: 3 }, action: { flex: 1, minWidth: 0, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 3, borderRadius: 10 }, sparked: { backgroundColor: Colors.primarySubtle }, actionText: { color: Colors.textPrimary, fontSize: 12, fontWeight: Typography.semiBold }, actionMuted: { color: Colors.textMuted, fontSize: 11, fontWeight: Typography.regular }, collaborators: { minWidth: 42, height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }, collaboratorCount: { color: Colors.textMuted, fontSize: 11 },
});

