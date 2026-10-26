import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { Header } from '../../components/navigation/Header';
import { Avatar } from '../../components/ui/Avatar';
import { EmptyState } from '../../components/ui/EmptyState';
import { CardSkeleton } from '../../components/ui/Skeleton';
import { CommunityPostCard } from '../../components/cards/CommunityPostCard';
import { PostComposerModal } from '../../components/modals/PostComposerModal';
import { PostCommentsModal } from '../../components/modals/PostCommentsModal';
import { CollaborateModal } from '../../components/modals/CollaborateModal';
import { AuthorProfileModal } from '../../components/modals/AuthorProfileModal';
import { useApp } from '../../context/AppContext';
import { CommunityPost, CommunityPostType } from '../../types';
import { DEMO_DISCOVERY_POSTS } from '../../services/demoDiscoveryData';

interface FilterCategory {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  type?: CommunityPostType;
}

const FEED_FILTERS: FilterCategory[] = [
  { id: 'all', label: 'All Activity', icon: 'grid-outline' },
  { id: 'idea', label: 'Ideas & Innovation', icon: 'bulb-outline', type: 'idea' },
  { id: 'service', label: 'Student Services', icon: 'construct-outline', type: 'service' },
  { id: 'story', label: 'Experiences & Stories', icon: 'book-outline', type: 'story' },
  { id: 'event_collab', label: 'Hackathons & Events', icon: 'trophy-outline', type: 'event_collab' },
  { id: 'project', label: 'Projects & Updates', icon: 'rocket-outline', type: 'project' },
  { id: 'question', label: 'Questions & Help', icon: 'help-circle-outline', type: 'question' },
];

export default function HomeScreen() {
  const {
    user,
    communityPosts,
    refreshCommunityPosts,
    addCommunityPost,
    toggleLikePost,
    toggleSavePost,
    addPostComment,
    applyToCollaborate,
  } = useApp();

  const [refreshing, setRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');

  // Modals state
  const [composerVisible, setComposerVisible] = useState(false);
  const [composerInitialType, setComposerInitialType] = useState<CommunityPostType>('idea');

  const [activeCommentPost, setActiveCommentPost] = useState<CommunityPost | null>(null);
  const [activeCollabPost, setActiveCollabPost] = useState<CommunityPost | null>(null);
  const [selectedAuthor, setSelectedAuthor] = useState<{
    id: string;
    name: string;
    avatar: string;
    college?: string;
    role?: string;
    isVerified?: boolean;
  } | null>(null);

  // Initial load of real community feed
  const loadFeed = useCallback(async () => {
    try {
      setErrorMessage(null);
      await refreshCommunityPosts();
    } catch {
      setErrorMessage('Unable to load student community feed. Please check your connection and retry.');
    } finally {
      setInitialLoading(false);
    }
  }, [refreshCommunityPosts]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFeed();
    setRefreshing(false);
  };

  // Open Composer with specific type from quick action
  const handleOpenComposer = (type: CommunityPostType) => {
    setComposerInitialType(type);
    setComposerVisible(true);
  };

  // Filter posts based on selected category tab
  const filteredPosts = useMemo(() => {
    const feedPosts = [...DEMO_DISCOVERY_POSTS, ...communityPosts];
    if (selectedFilter === 'all') {
      return feedPosts;
    }
    return feedPosts.filter((post) => post.type === selectedFilter);
  }, [communityPosts, selectedFilter]);

  // Suggested discovery: real active collaboration requests
  const activeCollabRequests = useMemo(() => {
    return communityPosts.filter(
      (p) =>
        (p.type === 'idea' && p.rolesNeeded && p.rolesNeeded.length > 0) ||
        (p.type === 'event_collab' && Boolean(p.eventRoleNeeded))
    );
  }, [communityPosts]);

  // Author press handling
  const handleAuthorPress = (authorId: string) => {
    if (authorId === user.id) {
      router.push('/(tabs)/profile' as any);
      return;
    }
    const foundPost = communityPosts.find((p) => p.author.id === authorId);
    if (foundPost) {
      setSelectedAuthor(foundPost.author);
    }
  };

  // Card press handling
  const handleCardPress = (post: CommunityPost) => {
    if (post.type === 'idea' && post.ideaId) {
      router.push(`/ideahub/${post.ideaId}` as any);
    } else if (post.type === 'project' && post.projectId) {
      router.push(`/projects/${post.projectId}` as any);
    } else if (post.type === 'event_collab' && post.teamId) {
      router.push(`/teams/${post.teamId}` as any);
    } else {
      setActiveCommentPost(post);
    }
  };

  const firstName = user?.name ? user.name.trim().split(' ')[0] : 'Student';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Top Header with Wordmark, Search, Notifications, Avatar */}
      <Header hideGreeting={true} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
      >
        {/* WELCOME SECTION: Personalized Greeting & Subtle Mission */}
        <View style={styles.welcomeSection}>
          <Text style={styles.greetingTitle}>Welcome back, {firstName}</Text>
          <Text style={styles.greetingSubtitle}>
            Connect with student builders, share ideas, offer services, and collaborate on real projects.
          </Text>
        </View>

        {/* CREATE-POST COMPOSER BAR & QUICK ACTIONS */}
        <View style={styles.composerCard}>
          <View style={styles.composerHeaderRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push('/(tabs)/profile' as any)}
            >
              <Avatar uri={user.avatar} name={user.name} size={38} isVerified={user.isVerified} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.composerInputTrigger}
              activeOpacity={0.8}
              onPress={() => handleOpenComposer('idea')}
            >
              <Text style={styles.composerPlaceholder}>
                What are you working on or looking for?
              </Text>
              <Ionicons name="create-outline" size={18} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          {/* 6 Quick Post Actions */}
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity
              style={styles.quickActionItem}
              activeOpacity={0.7}
              onPress={() => handleOpenComposer('idea')}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: Colors.accentAmberSubtle }]}>
                <Ionicons name="bulb-outline" size={16} color={Colors.accentAmber} />
              </View>
              <Text style={styles.quickActionLabel}>Share an Idea</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionItem}
              activeOpacity={0.7}
              onPress={() => handleOpenComposer('service')}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: Colors.accentCyanSubtle }]}>
                <Ionicons name="construct-outline" size={16} color={Colors.accentCyan} />
              </View>
              <Text style={styles.quickActionLabel}>Offer a Service</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionItem}
              activeOpacity={0.7}
              onPress={() => handleOpenComposer('story')}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: Colors.accentPurpleSubtle }]}>
                <Ionicons name="book-outline" size={16} color={Colors.accentPurple} />
              </View>
              <Text style={styles.quickActionLabel}>Share a Story</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionItem}
              activeOpacity={0.7}
              onPress={() => handleOpenComposer('event_collab')}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: Colors.primarySubtle }]}>
                <Ionicons name="trophy-outline" size={16} color={Colors.primary} />
              </View>
              <Text style={styles.quickActionLabel}>Organize an Event</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionItem}
              activeOpacity={0.7}
              onPress={() => handleOpenComposer('project')}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: Colors.accentGreenSubtle }]}>
                <Ionicons name="rocket-outline" size={16} color={Colors.accentGreen} />
              </View>
              <Text style={styles.quickActionLabel}>Showcase a Project</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionItem}
              activeOpacity={0.7}
              onPress={() => handleOpenComposer('question')}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: Colors.infoSubtle }]}>
                <Ionicons name="help-circle-outline" size={16} color={Colors.info} />
              </View>
              <Text style={styles.quickActionLabel}>Ask Community</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* OPTIONAL SUGGESTED DISCOVERY: Only shown when genuine active collaboration requests exist */}
        {activeCollabRequests.length > 0 && selectedFilter === 'all' ? (
          <View style={styles.discoverySection}>
            <View style={styles.discoveryHeader}>
              <View style={styles.discoveryTitleRow}>
                <View style={styles.pulseDot} />
                <Text style={styles.discoveryTitle}>ACTIVE COLLABORATION REQUESTS</Text>
              </View>
              <Text style={styles.discoveryCount}>{activeCollabRequests.length} Open</Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.discoveryScroll}
            >
              {activeCollabRequests.slice(0, 5).map((collab) => (
                <TouchableOpacity
                  key={`collab_${collab.id}`}
                  style={styles.collabSnippetCard}
                  activeOpacity={0.8}
                  onPress={() => handleCardPress(collab)}
                >
                  <View style={styles.collabSnippetTop}>
                    <Avatar uri={collab.author.avatar} name={collab.author.name} size={28} />
                    <Text style={styles.collabSnippetAuthor} numberOfLines={1}>
                      {collab.author.name}
                    </Text>
                  </View>
                  <Text style={styles.collabSnippetTitle} numberOfLines={2}>
                    {collab.title}
                  </Text>
                  <View style={styles.collabSnippetFooter}>
                    <Text style={styles.collabSnippetSeeking} numberOfLines={1}>
                      {collab.rolesNeeded?.join(', ') || collab.eventRoleNeeded || 'Collaborators'}
                    </Text>
                    <Ionicons name="arrow-forward-circle" size={16} color={Colors.primary} />
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* COMMUNITY FEED HEADER & CATEGORY FILTER TABS */}
        <View style={styles.feedHeaderSection}>
          <View style={styles.feedTitleRow}>
            <Text style={styles.feedTitle}>Community Activity</Text>
            <Text style={styles.feedSubtitle}>Live posts from students and innovators</Text>
          </View>

          {/* Horizontally Scrollable Category Filter Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            {FEED_FILTERS.map((f) => {
              const isSelected = selectedFilter === f.id;
              return (
                <TouchableOpacity
                  key={f.id}
                  style={[styles.filterChip, isSelected && styles.filterChipActive]}
                  onPress={() => setSelectedFilter(f.id)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={f.icon}
                    size={13}
                    color={isSelected ? '#FFF' : Colors.textMuted}
                  />
                  <Text
                    style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}
                  >
                    {f.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* FEED CONTENT STATES: Loading / Error / Empty / Real Posts */}
        <View style={styles.feedContent}>
          {initialLoading ? (
            <View style={styles.loadingContainer}>
              <CardSkeleton />
              <CardSkeleton />
            </View>
          ) : errorMessage ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={36} color={Colors.error} />
              <Text style={styles.errorText}>{errorMessage}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={loadFeed} activeOpacity={0.8}>
                <Ionicons name="refresh-outline" size={16} color="#FFF" />
                <Text style={styles.retryBtnText}>Retry Connection</Text>
              </TouchableOpacity>
            </View>
          ) : filteredPosts.length === 0 ? (
            <EmptyState
              icon={
                selectedFilter === 'idea'
                  ? 'bulb-outline'
                  : selectedFilter === 'service'
                  ? 'construct-outline'
                  : selectedFilter === 'story'
                  ? 'book-outline'
                  : selectedFilter === 'event_collab'
                  ? 'trophy-outline'
                  : selectedFilter === 'project'
                  ? 'rocket-outline'
                  : selectedFilter === 'question'
                  ? 'help-circle-outline'
                  : 'people-outline'
              }
              title={
                selectedFilter === 'all'
                  ? 'No Student Posts Shared Yet'
                  : `No ${FEED_FILTERS.find((f) => f.id === selectedFilter)?.label || 'Posts'} Yet`
              }
              description="Be the first student to share an idea, offer a service, post a story, or recruit collaborators for an initiative."
              actionTitle="Share your first post"
              onAction={() =>
                handleOpenComposer(
                  selectedFilter !== 'all' ? (selectedFilter as CommunityPostType) : 'idea'
                )
              }
            />
          ) : (
            filteredPosts.map((post) => (
              <CommunityPostCard
                key={post.id}
                post={post}
                onLike={post.id.startsWith('demo_') ? undefined : () => toggleLikePost(post.id)}
                onComment={post.id.startsWith('demo_') ? undefined : () => setActiveCommentPost(post)}
                onSave={post.id.startsWith('demo_') ? undefined : () => toggleSavePost(post.id)}
                onCollaborate={post.id.startsWith('demo_') ? undefined : () => setActiveCollabPost(post)}
                onAuthorPress={post.id.startsWith('demo_') ? undefined : handleAuthorPress}
                onCardPress={post.id.startsWith('demo_') ? undefined : handleCardPress}
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* Post Composer Modal */}
      <PostComposerModal
        visible={composerVisible}
        initialType={composerInitialType}
        onClose={() => setComposerVisible(false)}
        onSubmit={addCommunityPost}
      />

      {/* Post Comments Discussion Modal */}
      <PostCommentsModal
        visible={Boolean(activeCommentPost)}
        post={activeCommentPost}
        onClose={() => setActiveCommentPost(null)}
        onAddComment={addPostComment}
      />

      {/* Collaboration / Inquiry Modal */}
      <CollaborateModal
        visible={Boolean(activeCollabPost)}
        post={activeCollabPost}
        onClose={() => setActiveCollabPost(null)}
        onSubmit={applyToCollaborate}
      />

      {/* Student Author Profile Modal */}
      <AuthorProfileModal
        visible={Boolean(selectedAuthor)}
        author={selectedAuthor}
        onClose={() => setSelectedAuthor(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContainer: {
    paddingBottom: 40,
  },
  welcomeSection: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: 16,
    paddingBottom: 14,
  },
  greetingTitle: {
    fontSize: Typography.title2,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    letterSpacing: -0.4,
  },
  greetingSubtitle: {
    fontSize: Typography.subhead,
    color: Colors.textMuted,
    lineHeight: 19,
    marginTop: 4,
  },
  composerCard: {
    marginHorizontal: Spacing.screenPadding,
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 14,
    marginBottom: 20,
    ...Shadows.card,
  },
  composerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  composerInputTrigger: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  composerPlaceholder: {
    fontSize: Typography.body,
    color: Colors.textMuted,
    flex: 1,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 12,
  },
  quickActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.full,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 6,
  },
  quickActionIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    fontSize: 11,
    fontWeight: Typography.semiBold,
    color: Colors.textSecondary,
  },
  discoverySection: {
    marginBottom: 20,
  },
  discoveryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenPadding,
    marginBottom: 10,
  },
  discoveryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  discoveryTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 0.8,
  },
  discoveryCount: {
    fontSize: 11,
    fontWeight: Typography.bold,
    color: Colors.primary,
  },
  discoveryScroll: {
    paddingHorizontal: Spacing.screenPadding,
    gap: 10,
  },
  collabSnippetCard: {
    width: 200,
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    padding: 12,
  },
  collabSnippetTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  collabSnippetAuthor: {
    fontSize: 11,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    flex: 1,
  },
  collabSnippetTitle: {
    fontSize: 12,
    fontWeight: Typography.semiBold,
    color: Colors.textSecondary,
    lineHeight: 16,
    minHeight: 32,
    marginBottom: 8,
  },
  collabSnippetFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 6,
  },
  collabSnippetSeeking: {
    fontSize: 10,
    color: Colors.accentAmber,
    fontWeight: Typography.bold,
    maxWidth: 150,
  },
  feedHeaderSection: {
    marginBottom: 14,
  },
  feedTitleRow: {
    paddingHorizontal: Spacing.screenPadding,
    marginBottom: 10,
  },
  feedTitle: {
    fontSize: Typography.title3,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  feedSubtitle: {
    fontSize: Typography.caption,
    color: Colors.textMuted,
    marginTop: 2,
  },
  filterScroll: {
    paddingHorizontal: Spacing.screenPadding,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 5,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: Typography.medium,
    color: Colors.textSecondary,
  },
  filterChipTextActive: {
    color: '#FFF',
    fontWeight: Typography.bold,
  },
  feedContent: {
    paddingHorizontal: Spacing.screenPadding,
  },
  loadingContainer: {
    gap: 12,
  },
  errorBox: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.lg,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    marginVertical: 16,
    gap: 10,
  },
  errorText: {
    fontSize: Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: BorderRadius.sm,
    gap: 6,
    marginTop: 4,
  },
  retryBtnText: {
    fontSize: 12,
    fontWeight: Typography.bold,
    color: '#FFF',
  },
});
