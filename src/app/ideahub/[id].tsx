import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { useApp } from '../../context/AppContext';

export default function IdeaDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { ideas } = useApp();

  const idea = ideas.find((i) => i.id === id);


  if (!idea) {
    return (
      <View style={styles.notFoundContainer}>
        <Text style={styles.notFoundText}>Idea not found</Text>
        <Button title="Back to IdeaHub" variant="primary" onPress={() => router.back()} />
      </View>
    );
  }

  // Find similar ideas by category or skills
  const similarIdeas = ideas
    .filter((i) => i.id !== idea.id && (i.category === idea.category || i.stage === idea.stage))
    .slice(0, 2);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out this student project concept on StuDos: "${idea.title}" by ${idea.creator.name}!\nhttps://studos.network/idea/${idea.id}`,
      });
    } catch {
      // ignore
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Header Badges */}
        <View style={styles.topBadges}>
          <Badge label={idea.category} variant="primary" size="md" />
          <Badge label={`Stage: ${idea.stage}`} variant="purple" size="md" />
        </View>

        {/* Title & Tagline */}
        <Text style={styles.title}>{idea.title}</Text>
        <Text style={styles.tagline}>{idea.tagline}</Text>

        <Card variant="elevated" style={styles.creatorCard}>
          <Avatar uri={idea.creator.avatar} name={idea.creator.name} size={48} />
          <View style={styles.creatorInfo}>
            <Text style={styles.creatorName}>{idea.creator.name}</Text>
            <Text style={styles.creatorDetails}>{idea.creator.college} • {idea.creator.role}</Text>
          </View>
        </Card>
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.circleBtn} onPress={handleShare}>
            <Ionicons name="share-social-outline" size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>
        {/* Section: Problem Statement */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="alert-circle-outline" size={18} color={Colors.primary} />
            <Text style={styles.sectionTitle}>THE PROBLEM</Text>
          </View>
          <Text style={styles.bodyText}>{idea.problemStatement}</Text>
        </View>

        {/* Section: Proposed Solution */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="bulb-outline" size={18} color={Colors.accentCyan} />
            <Text style={styles.sectionTitle}>PROPOSED SOLUTION</Text>
          </View>
          <Text style={styles.bodyText}>{idea.proposedSolution}</Text>
        </View>

        {/* Section: Target Audience */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="people-outline" size={18} color={Colors.accentGreen} />
            <Text style={styles.sectionTitle}>TARGET AUDIENCE</Text>
          </View>
          <Text style={styles.bodyText}>{idea.targetAudience}</Text>
        </View>

        {/* Section: Required Skills */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>REQUIRED TECHNICAL SKILLS</Text>
          <View style={styles.chipsWrap}>
            {idea.requiredSkills.map((skill) => (
              <View key={skill} style={styles.skillPill}>
                <Text style={styles.skillText}>{skill}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Section: Roles Needed to Complete Team */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>COLLABORATORS SOUGHT</Text>
          <View style={styles.rolesWrap}>
            {idea.rolesNeeded.map((role) => (
              <View key={role} style={styles.roleBox}>
                <Ionicons name="person-add" size={14} color={Colors.primary} />
                <Text style={styles.roleBoxText}>{role}</Text>
              </View>
            ))}
          </View>

        </View>

        {/* Section: Project Roadmap */}
        {idea.roadmap && idea.roadmap.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>PROJECT ROADMAP & MILESTONES</Text>
            <View style={styles.roadmapList}>
              {idea.roadmap.map((step, idx) => (
                <View key={idx} style={styles.roadmapItem}>
                  <View
                    style={[
                      styles.roadmapDot,
                      step.completed ? styles.roadmapDotCompleted : undefined,
                    ]}
                  >
                    {step.completed ? (
                      <Ionicons name="checkmark" size={12} color="#FFF" />
                    ) : (
                      <Text style={styles.roadmapNumber}>{idx + 1}</Text>
                    )}
                  </View>
                  <View style={styles.roadmapTextWrap}>
                    <Text style={styles.roadmapPhase}>{step.phase}</Text>
                    <Text
                      style={[
                        styles.roadmapTitle,
                        step.completed ? styles.roadmapTitleCompleted : undefined,
                      ]}
                    >
                      {step.title}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Section: Similar Idea Recommendations */}
        {similarIdeas.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="git-merge-outline" size={18} color={Colors.accentPurple} />
              <Text style={styles.sectionTitle}>SIMILAR IDEAS IN THIS DOMAIN</Text>
            </View>
            <Text style={styles.similarHint}>
              StuDos recommends merging forces or co-building with related student projects:
            </Text>
            {similarIdeas.map((sim) => (
              <Card
                key={sim.id}
                variant="default"
                style={styles.similarCard}
                onPress={() => router.push(`/ideahub/${sim.id}` as any)}
              >
                <Text style={styles.similarTitle}>{sim.title}</Text>
                <Text style={styles.similarTagline} numberOfLines={1}>
                  {sim.tagline}
                </Text>
                <Text style={styles.similarCreator}>
                  By {sim.creator.name} • {sim.creator.college}
                </Text>
              </Card>
            ))}
          </View>
        ) : null}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContainer: {
    padding: Spacing.screenPadding,
    paddingBottom: 40,
  },
  notFoundContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    padding: 20,
  },
  notFoundText: {
    fontSize: Typography.headline,
    color: Colors.textMuted,
    marginBottom: 16,
  },
  topBadges: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  title: {
    fontSize: Typography.title1,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    lineHeight: 34,
    marginBottom: 8,
  },
  tagline: {
    fontSize: Typography.headline,
    color: Colors.textSecondary,
    lineHeight: 24,
    marginBottom: 16,
  },
  creatorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 16,
  },
  creatorInfo: {
    flex: 1,
    marginLeft: 12,
  },
  creatorName: {
    fontSize: Typography.body,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  creatorDetails: {
    fontSize: Typography.caption,
    color: Colors.textMuted,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  upvoteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.md,
  },
  upvoteBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  upvoteText: {
    fontSize: Typography.body,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    marginLeft: 8,
  },
  iconActions: {
    flexDirection: 'row',
    gap: 10,
  },
  circleBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 0.8,
    marginLeft: 6,
  },
  bodyText: {
    fontSize: Typography.body,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  skillPill: {
    backgroundColor: Colors.surfaceHighlight,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: BorderRadius.xs,
  },
  skillText: {
    fontSize: Typography.footnote,
    color: Colors.textPrimary,
  },
  rolesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  roleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primarySubtle,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.sm,
  },
  roleBoxText: {
    fontSize: Typography.subhead,
    color: Colors.textPrimary,
    fontWeight: Typography.semiBold,
    marginLeft: 6,
  },
  roadmapList: {
    marginTop: 12,
    gap: 12,
  },
  roadmapItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  roadmapDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.surfaceHighlight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  roadmapDotCompleted: {
    backgroundColor: Colors.success,
  },
  roadmapNumber: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: 'bold',
  },
  roadmapTextWrap: {
    flex: 1,
  },
  roadmapPhase: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.primary,
  },
  roadmapTitle: {
    fontSize: Typography.body,
    color: Colors.textPrimary,
    marginTop: 2,
  },
  roadmapTitleCompleted: {
    color: Colors.textMuted,
    textDecorationLine: 'line-through',
  },
  similarHint: {
    fontSize: Typography.caption,
    color: Colors.textMuted,
    marginVertical: 8,
  },
  similarCard: {
    padding: 12,
    marginTop: 8,
  },
  similarTitle: {
    fontSize: Typography.subhead,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  similarTagline: {
    fontSize: Typography.caption,
    color: Colors.textMuted,
    marginTop: 2,
  },
  similarCreator: {
    fontSize: 10,
    color: Colors.primary,
    marginTop: 4,
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    marginBottom: 16,
  },
  commentInput: {
    flex: 1,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 12,
    height: 40,
    color: Colors.textPrimary,
    fontSize: Typography.body,
  },
  commentsList: {
    gap: 12,
  },
  commentCard: {
    backgroundColor: Colors.surfaceElevated,
    padding: 12,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  commentAuthor: {
    marginLeft: 8,
  },
  commentName: {
    fontSize: Typography.subhead,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  commentRole: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  commentBody: {
    fontSize: Typography.footnote,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
});
