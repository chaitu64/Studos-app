import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Avatar } from '../ui/Avatar';
import { Colors, Spacing, Typography, BorderRadius } from '../../constants/theme';
import type { DemoIdea } from '../../services/demoIdeasService';

type Props = {
  idea: DemoIdea;
  sparkBusy?: boolean;
  saveBusy?: boolean;
  onSpark: () => void;
  onSave?: () => void;
  onOpen: () => void;
};

const relativeTime = (value: string) => {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};

export const HomeDemoIdeaCard: React.FC<Props> = React.memo(function HomeDemoIdeaCard({
  idea,
  sparkBusy = false,
  saveBusy = false,
  onSpark,
  onSave,
  onOpen,
}) {
  const metaParts = [
    idea.author.college,
    idea.author.branch,
    idea.author.studyYear ? `Year ${idea.author.studyYear}` : null,
  ].filter(Boolean);
  const authorMeta = metaParts.join(' · ');

  const handleAuthorPress = () => {
    if (idea.author.id) {
      router.push(`/student/demo/${idea.author.id}` as never);
    }
  };

  return (
    <View style={styles.card}>
      {/* 1. AUTHOR HEADER */}
      <View style={styles.authorRow}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={idea.author.id ? `View ${idea.author.name}'s profile` : 'Student profile'}
          disabled={!idea.author.id}
          onPress={handleAuthorPress}
          style={styles.author}
          activeOpacity={0.8}
        >
          <Avatar uri={idea.author.avatarUrl || ''} name={idea.author.name} size={42} />
          <View style={styles.authorCopy}>
            <Text style={styles.authorName} numberOfLines={1}>{idea.author.name}</Text>
            {authorMeta ? (
              <Text style={styles.authorMeta} numberOfLines={1}>{authorMeta}</Text>
            ) : null}
            <Text style={styles.time}>{relativeTime(idea.createdAt)}</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.ideaBadge}>
          <Ionicons name="bulb-outline" size={14} color={Colors.primary} />
          <Text style={styles.ideaBadgeText}>IDEA</Text>
        </View>
      </View>

      {/* 2. IDEA CONTENT */}
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`View full proposal: ${idea.title}`}
        onPress={onOpen}
        activeOpacity={0.85}
        style={styles.content}
      >
        <Text style={styles.title}>{idea.title}</Text>
        <Text style={styles.description} numberOfLines={4}>
          {idea.description}
        </Text>
        {idea.description.length > 180 ? (
          <Text style={styles.readMore}>
            Read full proposal <Ionicons name="arrow-forward" size={12} color={Colors.primary} />
          </Text>
        ) : null}
      </TouchableOpacity>

      {/* METADATA CHIPS: Type, Category, Stage */}
      <View style={styles.labels}>
        {idea.ideaType ? (
          <View style={[styles.chip, styles.typeChip]}>
            <Text style={styles.typeChipText}>{idea.ideaType}</Text>
          </View>
        ) : null}
        {idea.category ? (
          <View style={styles.chip}>
            <Text style={styles.chipText}>{idea.category}</Text>
          </View>
        ) : null}
        {idea.stage ? (
          <View style={[styles.chip, styles.stageChip]}>
            <Text style={styles.stageChipText}>{idea.stage}</Text>
          </View>
        ) : null}
      </View>

      {/* TAGS (Up to 3) */}
      {idea.tags.length ? (
        <View style={styles.tags}>
          {idea.tags.slice(0, 3).map((tag) => (
            <Text key={tag} style={styles.tag}>
              #{tag.replace(/^#/, '')}
            </Text>
          ))}
        </View>
      ) : null}

      {/* 3. COLLABORATION INDICATOR */}
      {idea.collaborationOpen ? (
        <View style={styles.collaboration}>
          <View style={styles.openDot} />
          <Text style={styles.collaborationText}>Open to collaboration</Text>
        </View>
      ) : null}

      {/* 4. ENGAGEMENT BAR */}
      <View style={styles.actions}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`${idea.isSparkedByViewer ? 'Remove Spark' : 'Spark this idea'}, ${idea.sparkCount ?? 0} Sparks`}
          accessibilityState={{ selected: idea.isSparkedByViewer, disabled: sparkBusy }}
          disabled={sparkBusy}
          onPress={onSpark}
          style={[styles.action, idea.isSparkedByViewer && styles.actionSparked]}
          activeOpacity={0.7}
        >
          {sparkBusy ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <Ionicons
              name={idea.isSparkedByViewer ? 'flash' : 'flash-outline'}
              size={18}
              color={idea.isSparkedByViewer ? Colors.primary : Colors.textMuted}
            />
          )}
          <Text style={[styles.actionText, idea.isSparkedByViewer && styles.actionTextSparked]}>
            {idea.sparkCount ?? 0} <Text style={styles.actionMuted}>Sparks</Text>
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`Open comments, ${idea.commentCount ?? 0} comments`}
          onPress={onOpen}
          style={styles.action}
          activeOpacity={0.7}
        >
          <Ionicons name="chatbubble-outline" size={17} color={Colors.textMuted} />
          <Text style={styles.actionText}>
            {idea.commentCount ?? 0} <Text style={styles.actionMuted}>Comments</Text>
          </Text>
        </TouchableOpacity>

        <View style={styles.collaborators}>
          <Ionicons name="people-outline" size={17} color={Colors.textMuted} />
          <Text style={styles.collaboratorCount}>
            {idea.collaboratorCount ?? 0}
          </Text>
        </View>

        {onSave && idea.bookmarkAvailable !== false ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={idea.isSavedByViewer ? 'Remove bookmark' : 'Bookmark this idea'}
            disabled={saveBusy}
            onPress={onSave}
            style={styles.saveAction}
            activeOpacity={0.7}
          >
            {saveBusy ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Ionicons
                name={idea.isSavedByViewer ? 'bookmark' : 'bookmark-outline'}
                size={18}
                color={idea.isSavedByViewer ? Colors.primary : Colors.textMuted}
              />
            )}
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.xl,
    padding: 16,
    marginBottom: Spacing.md,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  author: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  authorCopy: {
    flex: 1,
    minWidth: 0,
  },
  authorName: {
    color: Colors.textPrimary,
    fontWeight: Typography.bold,
    fontSize: 14,
    lineHeight: 19,
  },
  authorMeta: {
    color: Colors.textMuted,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
  time: {
    color: Colors.textSubtle,
    fontSize: 11,
    marginTop: 2,
  },
  ideaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primarySubtle,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  ideaBadgeText: {
    color: Colors.primary,
    fontSize: 10,
    letterSpacing: 0.6,
    fontWeight: Typography.bold,
  },
  content: {
    paddingTop: 12,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 18,
    lineHeight: 25,
    fontWeight: Typography.bold,
  },
  description: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 6,
  },
  readMore: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: Typography.semiBold,
    marginTop: 6,
  },
  labels: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
  },
  chip: {
    backgroundColor: Colors.surfaceHighlight,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  chipText: {
    color: Colors.textSecondary,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: Typography.medium,
  },
  typeChip: {
    backgroundColor: Colors.primarySubtle,
  },
  typeChipText: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: Typography.semiBold,
  },
  stageChip: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  stageChipText: {
    color: Colors.textMuted,
    fontSize: 11,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  tag: {
    color: Colors.accentCyan,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: Typography.medium,
  },
  collaboration: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  openDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.success,
  },
  collaborationText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: Typography.medium,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    marginTop: 14,
    paddingTop: 10,
    gap: 4,
  },
  action: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 4,
    borderRadius: BorderRadius.md,
  },
  actionSparked: {
    backgroundColor: Colors.primarySubtle,
  },
  actionText: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: Typography.semiBold,
  },
  actionTextSparked: {
    color: Colors.primary,
  },
  actionMuted: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: Typography.regular,
  },
  collaborators: {
    minWidth: 44,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  collaboratorCount: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: Typography.medium,
  },
  saveAction: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.md,
  },
});

