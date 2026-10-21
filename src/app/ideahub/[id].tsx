import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
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
import { IdeaComment } from '../../types';

export default function IdeaDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { ideas, user, toggleUpvoteIdea, toggleBookmarkIdea } = useApp();

  const idea = ideas.find((i) => i.id === id);

  const [comments, setComments] = useState<IdeaComment[]>([
    {
      id: 'c1',
      userId: 'usr_1',
      userName: 'Maya Chen',
      userAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80',
      userRole: 'UI/UX Designer',
      content:
        'Have you tested latency for on-device Whisper models on older Android chips? Happy to help design the audio waveform recorder interface.',
      createdAt: '1 day ago',
      likes: 6,
    },
    {
      id: 'c2',
      userId: 'usr_2',
      userName: 'Marcus Vance',
      userAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
      userRole: 'Developer',
      content:
        'I benchmarked 4-bit AWQ on Snapdragon 8 Gen 2—you can get ~18 tokens/sec which is more than enough for triage. Let’s connect on GitHub.',
      createdAt: '18h ago',
      likes: 4,
    },
  ]);

  const [newComment, setNewComment] = useState('');
  const [hasRequestedJoin, setHasRequestedJoin] = useState(false);

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

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    const added: IdeaComment = {
      id: `c_${Date.now()}`,
      userId: user.id,
      userName: user.name,
      userAvatar: user.avatar,
      userRole: user.primaryRole,
      content: newComment.trim(),
      createdAt: 'Just now',
      likes: 0,
    };
    setComments([added, ...comments]);
    setNewComment('');
  };

  const handleRequestToJoin = () => {
    Alert.alert(
      'Request to Join Idea',
      `Send a collaboration request to ${idea.creator.name} as a ${user.primaryRole}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Request',
          onPress: () => {
            setHasRequestedJoin(true);
            Alert.alert(
              'Request Sent!',
              `We notified ${idea.creator.name}. A direct conversation will open when approved.`
            );
          },
        },
      ]
    );
  };

  const handleContactCreator = () => {
    router.push('/chat/conv_1' as any);
  };

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

        {/* Creator Info Card */}
        <Card variant="elevated" style={styles.creatorCard}>
          <Avatar uri={idea.creator.avatar} name={idea.creator.name} size={48} />
          <View style={styles.creatorInfo}>
            <Text style={styles.creatorName}>{idea.creator.name}</Text>
            <Text style={styles.creatorDetails}>
              {idea.creator.college} • {idea.creator.role}
            </Text>
          </View>
          <Button
            title="Chat"
            variant="outline"
            size="sm"
            icon={<Ionicons name="chatbubble-outline" size={14} color={Colors.primary} />}
            onPress={handleContactCreator}
          />
        </Card>

        {/* Action Row: Upvote, Bookmark, Share */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.upvoteBtn, idea.isUpvoted ? styles.upvoteBtnActive : undefined]}
            onPress={() => toggleUpvoteIdea(idea.id)}
          >
            <Ionicons
              name={idea.isUpvoted ? 'rocket' : 'rocket-outline'}
              size={18}
              color={idea.isUpvoted ? '#FFF' : Colors.textPrimary}
            />
            <Text
              style={[
                styles.upvoteText,
                idea.isUpvoted ? { color: '#FFF' } : undefined,
              ]}
            >
              {idea.upvotes} {idea.upvotes === 1 ? 'Upvote' : 'Upvotes'}
            </Text>
          </TouchableOpacity>

          <View style={styles.iconActions}>
            <TouchableOpacity
              style={styles.circleBtn}
              onPress={() => toggleBookmarkIdea(idea.id)}
            >
              <Ionicons
                name={idea.isBookmarked ? 'bookmark' : 'bookmark-outline'}
                size={18}
                color={idea.isBookmarked ? Colors.primary : Colors.textSecondary}
              />
            </TouchableOpacity>

            <TouchableOpacity style={styles.circleBtn} onPress={handleShare}>
              <Ionicons name="share-social-outline" size={18} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
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

          {/* Request to Join CTA */}
          <Button
            title={hasRequestedJoin ? '✓ Request Submitted' : 'Request to Join this Idea'}
            variant={hasRequestedJoin ? 'secondary' : 'primary'}
            size="lg"
            disabled={hasRequestedJoin}
            onPress={handleRequestToJoin}
            style={{ marginTop: 12 }}
          />
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

        {/* Section: Comments & Community Discussions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>COMMUNITY DISCUSSION ({comments.length})</Text>

          {/* Add Comment Input */}
          <View style={styles.commentInputRow}>
            <TextInput
              placeholder="Add feedback, ask a question, or suggest tech..."
              placeholderTextColor={Colors.textSubtle}
              value={newComment}
              onChangeText={setNewComment}
              style={styles.commentInput}
            />
            <Button
              title="Post"
              variant="primary"
              size="sm"
              disabled={!newComment.trim()}
              onPress={handleAddComment}
            />
          </View>

          {/* Comments List */}
          <View style={styles.commentsList}>
            {comments.map((c) => (
              <View key={c.id} style={styles.commentCard}>
                <View style={styles.commentHeader}>
                  <Avatar uri={c.userAvatar} name={c.userName} size={32} />
                  <View style={styles.commentAuthor}>
                    <Text style={styles.commentName}>{c.userName}</Text>
                    <Text style={styles.commentRole}>{c.userRole} • {c.createdAt}</Text>
                  </View>
                </View>
                <Text style={styles.commentBody}>{c.content}</Text>
              </View>
            ))}
          </View>
        </View>
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
