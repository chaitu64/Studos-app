import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Idea } from '../../types';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Avatar } from '../ui/Avatar';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';

export interface IdeaCardProps {
  idea: Idea;
  showFullDetails?: boolean;
}

export const IdeaCard: React.FC<IdeaCardProps> = ({ idea, showFullDetails = false }) => {

  const handlePress = () => {
    router.push(`/ideahub/${idea.id}` as any);
  };

  const getStageVariant = (stage: Idea['stage']) => {
    switch (stage) {
      case 'Concept':
        return 'amber';
      case 'Research':
        return 'cyan';
      case 'Prototype':
        return 'purple';
      case 'MVP':
        return 'green';
      case 'Launched':
        return 'primary';
      default:
        return 'neutral';
    }
  };

  return (
    <Card variant="default" style={styles.card} onPress={handlePress}>
      {/* Top Header: Creator info & Stage */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.creatorRow} onPress={() => idea.creator.identity && router.push(`/student/${idea.creator.identity.type}/${idea.creator.identity.id}` as any)}>
          <Avatar uri={idea.creator.avatar} name={idea.creator.name} size={36} />
          <View style={styles.creatorInfo}>
            <Text style={styles.creatorName} numberOfLines={1}>{idea.creator.name}</Text>
            <Text style={styles.creatorCollege} numberOfLines={1}>
              {idea.creator.college} • {idea.creator.role}
            </Text>
          </View>
        </TouchableOpacity>

        <Badge label={idea.stage} variant={getStageVariant(idea.stage)} size="sm" />
      </View>

      {/* Title & Tagline */}
      <Text style={styles.title} numberOfLines={showFullDetails ? undefined : 2}>
        {idea.title}
      </Text>
      <Text style={styles.tagline} numberOfLines={showFullDetails ? undefined : 2}>
        {idea.tagline}
      </Text>

      {/* Category & Team Need Status */}
      <View style={styles.metaRow}>
        <Badge label={idea.category} variant="outline" size="sm" />
        <View style={styles.teamStatus}>
          <Ionicons name="people-outline" size={14} color={Colors.textMuted} />
          <Text style={styles.teamStatusText}>
            Team: {idea.currentTeamSize}/{idea.teamSizeNeeded}
          </Text>
        </View>
      </View>

      {/* Required Skills */}
      <View style={styles.skillsRow}>
        {idea.requiredSkills.slice(0, 3).map((skill) => (
          <View key={skill} style={styles.skillTag}>
            <Text style={styles.skillText}>{skill}</Text>
          </View>
        ))}
        {idea.requiredSkills.length > 3 ? (
          <View style={styles.skillTag}>
            <Text style={styles.skillText}>+{idea.requiredSkills.length - 3}</Text>
          </View>
        ) : null}
      </View>

      {/* Divider */}
      <View style={styles.divider} />

    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  creatorInfo: {
    marginLeft: 10,
    flex: 1,
    minWidth: 0,
  },
  creatorName: {
    fontSize: Typography.body,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  creatorCollege: {
    fontSize: Typography.caption,
    color: Colors.textMuted,
  },
  title: {
    fontSize: Typography.headline,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    lineHeight: 22,
    marginBottom: 6,
  },
  tagline: {
    fontSize: Typography.body,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  teamStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  teamStatusText: {
    fontSize: Typography.footnote,
    color: Colors.textMuted,
    marginLeft: 4,
    fontWeight: Typography.medium,
  },
  skillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  skillTag: {
    backgroundColor: Colors.surfaceHighlight,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: BorderRadius.xs,
  },
  skillText: {
    fontSize: Typography.caption,
    color: Colors.textMuted,
    fontWeight: Typography.medium,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginBottom: 10,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: BorderRadius.sm,
  },
  actionBtnUpvoted: {
    backgroundColor: Colors.primarySubtle,
  },
  actionText: {
    fontSize: Typography.footnote,
    color: Colors.textMuted,
    marginLeft: 6,
    fontWeight: Typography.medium,
  },
  bookmarkBtn: {
    padding: 6,
  },
});
