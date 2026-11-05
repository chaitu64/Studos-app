import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, BorderRadius, Spacing, Typography } from '../../constants/theme';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { CardSkeleton } from '../../components/ui/Skeleton';
import { Chip } from '../../components/ui/Chip';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  DiscoveryItem,
  DiscoveryPerson,
  DiscoverySwipeCard,
  DiscoverySwipeCardHandle,
} from '../../components/cards/DiscoverySwipeCard';
import { useApp } from '../../context/AppContext';
import { CommunityPost, StudentDirectoryProfile } from '../../types';
import { studentDirectoryService } from '../../services/studentDirectoryService';

type DiscoveryMode = 'people' | 'ideas' | 'services';

const MODES: { id: DiscoveryMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'people', label: 'People', icon: 'people-outline' },
  { id: 'ideas', label: 'Ideas & Teams', icon: 'bulb-outline' },
  { id: 'services', label: 'Services', icon: 'construct-outline' },
];

function unique(values: (string | undefined)[]): string[] {
  return [...new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))];
}

function getItemPost(item: DiscoveryItem): CommunityPost | undefined {
  return item.kind === 'person' ? item.person.sourcePost : item.post;
}

export default function SwipeScreen() {
  const {
    user,
    ideas,
    teams,
    communityPosts,
    refreshCommunityPosts,
    applyToCollaborate,
    applyToTeam,
    toggleSavePost,
    toggleBookmarkIdea,
  } = useApp();

  const [mode, setMode] = useState<DiscoveryMode>('people');
  const [filter, setFilter] = useState('All');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [detailsItem, setDetailsItem] = useState<DiscoveryItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [skippedIds, setSkippedIds] = useState<string[]>([]);
  const [actionedIds, setActionedIds] = useState<string[]>([]);
  const [directoryProfiles, setDirectoryProfiles] = useState<StudentDirectoryProfile[]>([]);
  const [peopleLoading, setPeopleLoading] = useState(true);
  const [peopleError, setPeopleError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const swipeCardRef = useRef<DiscoverySwipeCardHandle>(null);

  const loadPeople = useCallback(async () => {
    setPeopleLoading(true);
    setPeopleError(null);
    try {
      const page = await studentDirectoryService.list({ limit: 500 });
      setDirectoryProfiles(page.students.filter((profile) => profile.id !== user.id));
    } catch (error) {
      console.error('Unable to load student profiles:', error);
      setDirectoryProfiles([]);
      setPeopleError('Student profiles could not be loaded. Check your connection and try again.');
    } finally {
      setPeopleLoading(false);
    }
  }, [user.id]);

  const loadDiscovery = useCallback(async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      setErrorMessage(null);
      await Promise.all([refreshCommunityPosts(), loadPeople()]);
    } catch (error) {
      console.error('Unable to load discovery records:', error);
      setErrorMessage('Discovery could not be refreshed. Check your connection and try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [loadPeople, refreshCommunityPosts]);

  useEffect(() => {
    let active = true;
    const initialLoad = async () => {
      try {
        await refreshCommunityPosts();
        if (active) setErrorMessage(null);
      } catch (error) {
        console.error('Unable to load discovery records:', error);
        if (active) setErrorMessage('Discovery could not be loaded. Check your connection and try again.');
      } finally {
        if (active) setIsLoading(false);
      }
    };
    void initialLoad();
    return () => {
      active = false;
    };
  }, [refreshCommunityPosts]);

  useEffect(() => { void Promise.resolve().then(loadPeople); }, [loadPeople]);

  const discoverablePosts = useMemo(() => {
    const byIdeaId = new Map(ideas.map((idea) => [idea.id, idea]));

    return communityPosts.filter((post) => {
      if (
        !post.author.id ||
        post.author.id === 'unknown' ||
        post.author.id === user.id ||
        !post.author.name.trim() ||
        !post.title.trim()
      ) return false;

      const idea = byIdeaId.get(post.ideaId || post.id);
      if (idea && idea.visibility !== 'Public') return false;

      if (post.type === 'service') return true;
      if (mode === 'ideas') {
        return post.type === 'idea' || post.type === 'project' || post.type === 'event_collab';
      }
      return true;
    });
  }, [communityPosts, ideas, mode, user.id]);

  const people = useMemo<DiscoveryPerson[]>(() => {
    return directoryProfiles.map((profile) => ({
      id: `${profile.identity.type}:${profile.id}`,
      identity: profile.identity,
      profile,
      author: { id: profile.id, identity: profile.identity, name: profile.name, avatar: profile.avatar, college: profile.college, role: profile.branch || profile.degree || undefined },
      posts: [],
      skills: unique(profile.skills),
    }));
  }, [directoryProfiles]);

  const allItems = useMemo<DiscoveryItem[]>(() => {
    if (mode === 'people') {
      return people.map((person) => ({
        kind: 'person',
        id: `person:${person.id}`,
        person,
      }));
    }

    const posts = discoverablePosts.filter((post) =>
      mode === 'services'
        ? post.type === 'service'
        : post.type === 'idea' || post.type === 'project' || post.type === 'event_collab'
    );

    return posts.map((post) => ({ kind: 'post', id: post.id, post }));
  }, [discoverablePosts, mode, people]);

  const filterOptions = useMemo(() => {
    if (mode === 'people') {
      return unique(people.flatMap((person) => [
        person.author.role,
        ...person.skills,
        ...(person.profile?.interests || []),
      ]));
    }
    if (mode === 'services') {
      return unique(discoverablePosts
        .filter((post) => post.type === 'service')
        .flatMap((post) => [post.category, ...(post.skills || [])]));
    }
    return unique(discoverablePosts
      .filter((post) => post.type === 'idea' || post.type === 'project' || post.type === 'event_collab')
      .flatMap((post) => [
        post.category,
        ...(post.rolesNeeded || []),
        ...(post.skills || []),
        post.eventRoleNeeded,
      ]));
  }, [discoverablePosts, mode, people]);

  const visibleItems = useMemo(() => {
    const currentSkills = new Set(user.skills.map((skill) => skill.toLowerCase()));
    const matchesFilter = (item: DiscoveryItem) => {
      if (filter === 'All') return true;
      if (item.kind === 'person') {
        return item.person.author.role === filter || item.person.skills.includes(filter) || Boolean(item.person.profile?.interests.includes(filter));
      }
      const post = item.post;
      return post.category === filter ||
        post.skills?.includes(filter) ||
        post.technologies?.includes(filter) ||
        post.rolesNeeded?.some((role) => role === filter) ||
        post.eventRoleNeeded?.split(',').some((role) => role.trim() === filter);
    };
    const score = (item: DiscoveryItem) => {
      const skills = item.kind === 'person'
        ? item.person.skills
        : [...(item.post.skills || []), ...(item.post.technologies || []), ...(item.post.rolesNeeded || [])];
      return skills.reduce((count, skill) => count + (currentSkills.has(skill.toLowerCase()) ? 1 : 0), 0);
    };

    return allItems
      .filter((item) => {
        const post = getItemPost(item);
        return !skippedIds.includes(item.id) && !actionedIds.includes(item.id) && (!post || !actionedIds.includes(post.id)) && matchesFilter(item);
      })
      .sort((a, b) => score(b) - score(a));
  }, [actionedIds, allItems, filter, skippedIds, user.skills]);

  const currentItem = visibleItems[0];
  const currentPost = currentItem ? getItemPost(currentItem) : null;
  const actionLabel = mode === 'people'
    ? currentItem?.kind === 'person' && !currentItem.person.sourcePost ? 'View profile' : 'Invite to collaborate'
    : mode === 'services'
      ? 'Request service'
      : currentPost?.type === 'event_collab'
        ? 'Request to join'
        : 'Express interest';

  const setModeAndResetFilter = (nextMode: DiscoveryMode) => {
    setMode(nextMode);
    setFilter('All');
  };

  const skipCurrent = useCallback(() => {
    if (currentItem) {
      setSkippedIds((previous) => previous.includes(currentItem.id) ? previous : [...previous, currentItem.id]);
    }
  }, [currentItem]);

  const submitInterest = useCallback(async (item: DiscoveryItem) => {
    const post = getItemPost(item);
    if (!post) return;
    setPendingId(item.id);

    try {
      let confirmation: string;
      if (post.type === 'event_collab' && post.teamId) {
        const team = teams.find((entry) => entry.id === post.teamId);
        if (!team) {
          throw new Error('This team listing is no longer available.');
        }
        const openRole = team.openRoles.find((role) => !role.filled)?.role || user.primaryRole;
        const result = await applyToTeam(team.id, openRole || 'Developer');
        if (!result.success) throw new Error(result.message || 'The team request was not accepted.');
        confirmation = 'Your team application was recorded in this app.';
      } else {
        const note = mode === 'services'
          ? `${user.name} requested the service "${post.title}".`
          : mode === 'people'
            ? `${user.name} would like to connect about "${post.title}".`
            : `${user.name} is interested in contributing to "${post.title}".`;
        const result = await applyToCollaborate(post.id, note, user.primaryRole || user.branch || 'Student');
        if (!result.success) throw new Error(result.message || 'The collaboration request was not accepted.');
        confirmation = 'Your request was recorded in this app.';
      }

      setActionedIds((previous) => previous.includes(item.id) ? previous : [...previous, item.id]);
      setActionedIds((previous) => previous.includes(post.id) ? previous : [...previous, post.id]);
      Alert.alert('Request recorded', confirmation);
    } catch (error) {
      console.error('Unable to submit discovery request:', error);
      Alert.alert(
        'Request not sent',
        error instanceof Error ? error.message : 'The request could not be completed. Please try again.'
      );
    } finally {
      setPendingId(null);
    }
  }, [applyToCollaborate, applyToTeam, mode, teams, user.branch, user.name, user.primaryRole]);

  const confirmInterest = useCallback((item: DiscoveryItem) => {
    if (pendingId) return;
    if (item.kind === 'person' && !item.person.sourcePost) {
      const identity = item.person.identity;
      if (identity) router.push(`/student/${identity.type}/${identity.id}` as never);
      return;
    }
    const post = getItemPost(item);
    if (!post) return;
    const title = item.kind === 'person'
      ? `Invite ${item.person.author.name} to collaborate?`
      : mode === 'services'
        ? `Request "${post.title}"?`
        : post.type === 'event_collab'
          ? `Request to join "${post.title}"?`
          : `Express interest in "${post.title}"?`;
    Alert.alert(
      title,
      'This records a request in the current app. It does not confirm acceptance, hiring, payment, or membership.',
      [
        { text: 'Not now', style: 'cancel' },
        { text: item.kind === 'person' ? 'Send invitation' : mode === 'services' ? 'Request service' : 'Continue', onPress: () => { void submitInterest(item); } },
      ]
    );
  }, [mode, pendingId, submitInterest]);

  const saveCurrent = async () => {
    if (!currentItem || !currentPost) return;

    try {
      if (currentPost.id.startsWith('post_')) {
        await toggleSavePost(currentPost.id);
      } else if (ideas.some((idea) => idea.id === (currentPost.ideaId || currentPost.id))) {
        await toggleBookmarkIdea(currentPost.ideaId || currentPost.id);
      } else {
        return;
      }
    } catch (error) {
      console.error('Unable to save discovery item:', error);
      Alert.alert('Could not save', 'This item could not be saved. Please try again.');
    }
  };

  const canSaveCurrent = Boolean(
    currentPost &&
    (currentPost.id.startsWith('post_') || ideas.some((idea) => idea.id === (currentPost.ideaId || currentPost.id)))
  );
  const isCurrentSaved = Boolean(
    currentPost?.isSaved ||
    (currentPost && ideas.find((idea) => idea.id === (currentPost.ideaId || currentPost.id))?.isBookmarked)
  );

  const openExternalLink = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (error) {
      console.error('Unable to open discovery link:', error);
      Alert.alert('Link unavailable', 'This link could not be opened on your device.');
    }
  };

  const renderDetails = () => {
    if (!detailsItem) return null;
    if (detailsItem.kind === 'person') {
      const { person } = detailsItem;
      return (
        <>
          <View style={styles.detailAuthor}>
            <Avatar uri={person.author.avatar} name={person.author.name} size={48} isVerified={person.author.isVerified} />
            <View style={styles.detailAuthorText}>
              <Text style={styles.detailTitle}>{person.author.name}</Text>
              <Text style={styles.detailMuted}>{[person.author.role, person.author.college].filter(Boolean).join(' · ')}</Text>
            </View>
          </View>
          {person.profile?.shortBio ? <View style={styles.detailEntry}><Text style={styles.detailSectionTitle}>About</Text><Text style={styles.detailBody}>{person.profile.shortBio}</Text></View> : null}
          {person.profile ? <View style={styles.detailEntry}><Text style={styles.detailSectionTitle}>Study</Text><Text style={styles.detailBody}>{[person.profile.degree, person.profile.branch, person.profile.studyYear && `Year ${person.profile.studyYear}`, person.profile.gradYear && `Class of ${person.profile.gradYear}`].filter(Boolean).join(' · ')}</Text></View> : null}
          {person.posts.map((post) => (
            <View key={post.id} style={styles.detailEntry}>
              <Text style={styles.detailSectionTitle}>{post.title}</Text>
              <Text style={styles.detailBody}>{post.content}</Text>
              <Text style={styles.detailMuted}>{post.type.replace('_', ' ')} · {post.createdAt}</Text>
            </View>
          ))}
          {person.skills.length ? (
            <View style={styles.detailEntry}>
              <Text style={styles.detailSectionTitle}>Skills mentioned in shared posts</Text>
              <Text style={styles.detailBody}>{person.skills.join(' · ')}</Text>
            </View>
          ) : null}
          {person.profile?.interests.length ? <View style={styles.detailEntry}><Text style={styles.detailSectionTitle}>Interests</Text><Text style={styles.detailBody}>{person.profile.interests.join(' · ')}</Text></View> : null}
        </>
      );
    }

    const post = detailsItem.post;
    return (
      <>
        <View style={styles.detailAuthor}>
          <Avatar uri={post.author.avatar} name={post.author.name} size={44} isVerified={post.author.isVerified} />
          <View style={styles.detailAuthorText}>
            <Text style={styles.detailTitle}>{post.title}</Text>
            <Text style={styles.detailMuted}>Shared by {post.author.name}</Text>
          </View>
        </View>
        {post.category ? <Text style={styles.detailMuted}>{post.category}</Text> : null}
        <Text style={styles.detailBody}>
          {[post.problemStatement || post.content, post.proposedSolution]
            .filter(Boolean)
            .join('\n\n')}
        </Text>
        {post.skills?.length ? (
          <View style={styles.detailEntry}>
            <Text style={styles.detailSectionTitle}>Skills</Text>
            <Text style={styles.detailBody}>{post.skills.join(' · ')}</Text>
          </View>
        ) : null}
        {post.rolesNeeded?.length ? (
          <View style={styles.detailEntry}>
            <Text style={styles.detailSectionTitle}>Roles needed</Text>
            <Text style={styles.detailBody}>{post.rolesNeeded.join(' · ')}</Text>
          </View>
        ) : null}
        {post.servicePricing ? <Text style={styles.detailMuted}>Pricing: {post.servicePricing}</Text> : null}
        {post.serviceAvailability ? <Text style={styles.detailMuted}>Availability: {post.serviceAvailability}</Text> : null}
        {post.demoUrl ? (
          <Pressable accessibilityRole="link" onPress={() => { void openExternalLink(post.demoUrl!); }}>
            <Text style={styles.detailLink}>Open demo</Text>
          </Pressable>
        ) : null}
        {post.githubUrl ? (
          <Pressable accessibilityRole="link" onPress={() => { void openExternalLink(post.githubUrl!); }}>
            <Text style={styles.detailLink}>Open GitHub</Text>
          </Pressable>
        ) : null}
      </>
    );
  };

  const hasModeRecords = allItems.length > 0;
  const emptyTitle = mode === 'people'
    ? 'No students to discover yet'
    : mode === 'services'
      ? 'No student services yet'
      : 'No ideas or teams to join yet';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>Find Your People</Text>
          <Text style={styles.headerSubtitle}>Discover real and demo student profiles, ideas, and services.</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open discovery filters"
            onPress={() => setShowFilterModal(true)}
            style={styles.iconButton}
            hitSlop={8}
          >
            <Ionicons name="options-outline" size={19} color={Colors.textPrimary} />
            {filter !== 'All' ? <View style={styles.filterDot} /> : null}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Search students"
            onPress={() => router.push('/search' as never)}
            style={styles.iconButton}
            hitSlop={8}
          >
            <Ionicons name="search-outline" size={20} color={Colors.textPrimary} />
          </Pressable>
        </View>
      </View>

      <View style={styles.modeTabs}>
        {MODES.map((entry) => {
          const selected = mode === entry.id;
          return (
            <Pressable
              key={entry.id}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => setModeAndResetFilter(entry.id)}
              style={[styles.modeTab, selected && styles.modeTabSelected]}
            >
              <Ionicons name={entry.icon} size={16} color={selected ? Colors.primary : Colors.textMuted} />
              <Text style={[styles.modeText, selected && styles.modeTextSelected]} numberOfLines={1}>
                {entry.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {filterOptions.length > 0 ? (
        <View style={styles.filterChips}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            <Chip label="All" selected={filter === 'All'} onPress={() => setFilter('All')} />
            {filterOptions.slice(0, 8).map((option) => (
              <Chip key={option} label={option} selected={filter === option} onPress={() => setFilter(option)} />
            ))}
          </ScrollView>
        </View>
      ) : null}

      <View style={styles.arena}>
        {(mode === 'people' ? peopleLoading : isLoading) ? (
          <CardSkeleton />
        ) : (mode === 'people' ? peopleError : errorMessage) ? (
          <EmptyState
            icon="cloud-offline-outline"
            title="Couldn't load discovery"
            description={mode === 'people' ? peopleError || '' : errorMessage || ''}
            actionTitle="Retry"
            onAction={() => { void loadDiscovery(true); }}
            style={styles.emptyState}
          />
        ) : currentItem ? (
          <>
            {isRefreshing ? (
              <View style={styles.refreshing}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.refreshingText}>Refreshing discovery…</Text>
              </View>
            ) : null}
            {visibleItems[1] ? <View pointerEvents="none" style={styles.nextCardPreview}>
              <Text style={styles.nextCardEyebrow}>UP NEXT</Text>
              <Text style={styles.nextCardName}>{visibleItems[1].kind === 'person' ? visibleItems[1].person.author.name : visibleItems[1].post.title}</Text>
            </View> : null}
            <DiscoverySwipeCard
              key={currentItem.id}
              ref={swipeCardRef}
              item={currentItem}
              actionLabel={actionLabel}
              disabled={pendingId === currentItem.id}
              onSkip={skipCurrent}
              onInterest={() => confirmInterest(currentItem)}
              onDetails={() => setDetailsItem(currentItem)}
            />
            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Skip this item"
                onPress={() => swipeCardRef.current?.swipeLeft()}
                disabled={pendingId === currentItem.id}
                style={[styles.actionButton, styles.skipButton]}
                hitSlop={4}
              >
                <Ionicons name="close" size={22} color={Colors.textMuted} />
                <Text style={styles.actionButtonText}>Skip</Text>
              </Pressable>
              {canSaveCurrent ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Save this item"
                  onPress={() => { void saveCurrent(); }}
                  disabled={pendingId === currentItem.id}
                  style={[styles.actionButton, styles.saveButton]}
                  hitSlop={4}
                >
                  <Ionicons name={isCurrentSaved ? 'bookmark' : 'bookmark-outline'} size={19} color={Colors.accentAmber} />
                  <Text style={styles.actionButtonText}>{isCurrentSaved ? 'Saved' : 'Save'}</Text>
                </Pressable>
              ) : null}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={actionLabel}
                onPress={() => swipeCardRef.current?.swipeRight()}
                disabled={pendingId === currentItem.id}
                style={[styles.primaryAction, pendingId === currentItem.id && styles.disabledAction]}
              >
                {pendingId === currentItem.id ? (
                  <ActivityIndicator size="small" color={Colors.textOnPrimary} />
                ) : (
                  <Ionicons
                    name={mode === 'services' ? 'hand-left-outline' : mode === 'people' ? (currentItem.kind === 'person' && !currentItem.person.sourcePost ? 'person-outline' : 'chatbubble-ellipses-outline') : 'person-add-outline'}
                    size={17}
                    color={Colors.textOnPrimary}
                  />
                )}
                <Text style={styles.primaryActionText}>
                  {pendingId === currentItem.id ? 'Sending…' : actionLabel}
                </Text>
              </Pressable>
            </View>
          </>
        ) : (
          <EmptyState
            icon={hasModeRecords ? 'options-outline' : 'people-outline'}
            title={hasModeRecords ? 'No matching items' : emptyTitle}
            description={hasModeRecords
              ? 'Try another filter or clear the current filter to see more student-submitted records.'
              : mode === 'people' ? 'No student profiles are visible right now. Try refreshing or open Students from search.' : 'There are no matching student-submitted records to show right now.'}
            actionTitle={filter !== 'All' ? 'Clear filters' : isRefreshing ? 'Refreshing…' : 'Refresh'}
            onAction={() => {
              if (filter !== 'All') setFilter('All');
              else void loadDiscovery(true);
            }}
            style={styles.emptyState}
          />
        )}
      </View>

      <Modal
        visible={showFilterModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.filterSheet}>
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Discovery filters</Text>
                <Text style={styles.sheetSubtitle}>Only filters with submitted data are shown.</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close filters"
                onPress={() => setShowFilterModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={20} color={Colors.textPrimary} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.modalFilters}>
              <Chip label="All" selected={filter === 'All'} onPress={() => setFilter('All')} />
              {filterOptions.map((option) => (
                <Chip key={option} label={option} selected={filter === option} onPress={() => setFilter(option)} />
              ))}
            </ScrollView>
            <Button title="Done" variant="primary" onPress={() => setShowFilterModal(false)} />
          </View>
        </View>
      </Modal>

      <Modal
        visible={Boolean(detailsItem)}
        transparent
        animationType="slide"
        onRequestClose={() => setDetailsItem(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.detailSheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Details</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close details"
                onPress={() => setDetailsItem(null)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={20} color={Colors.textPrimary} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.detailContent} showsVerticalScrollIndicator={false}>
              {renderDetails()}
            </ScrollView>
            {detailsItem ? (
              <View style={styles.detailActions}>
                <Button
                  title={
                    detailsItem.kind === 'person' && !detailsItem.person.sourcePost
                      ? 'View full profile'
                      : detailsItem.kind === 'person'
                        ? 'Invite to collaborate'
                      : detailsItem.post.type === 'service'
                        ? 'Request service'
                        : detailsItem.post.type === 'event_collab'
                          ? 'Request to join'
                          : 'Express interest'
                  }
                  variant="primary"
                  onPress={() => {
                    const item = detailsItem;
                    setDetailsItem(null);
                    confirmInterest(item);
                  }}
                />
              </View>
            ) : null}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: 7,
    paddingBottom: 10,
    gap: 10,
  },
  headerCopy: {
    flex: 1,
  },
  headerTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.title2,
    fontWeight: Typography.bold,
  },
  headerSubtitle: {
    color: Colors.textMuted,
    fontSize: Typography.caption,
    lineHeight: 15,
    marginTop: 3,
    maxWidth: 290,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 7,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceElevated,
    borderColor: Colors.border,
    borderWidth: 1,
    position: 'relative',
  },
  filterDot: {
    position: 'absolute',
    right: 8,
    top: 8,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  modeTabs: {
    flexDirection: 'row',
    marginHorizontal: Spacing.screenPadding,
    padding: 4,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
  },
  modeTab: {
    minHeight: 48,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 4,
    borderRadius: BorderRadius.sm,
  },
  modeTabSelected: {
    backgroundColor: Colors.surfaceHighlight,
  },
  modeText: {
    color: Colors.textMuted,
    fontSize: Typography.caption,
    fontWeight: Typography.medium,
  },
  modeTextSelected: {
    color: Colors.textPrimary,
    fontWeight: Typography.semiBold,
  },
  filterChips: {
    marginTop: 10,
  },
  filterScroll: {
    paddingHorizontal: Spacing.screenPadding,
    gap: 7,
  },
  arena: {
    flex: 1,
    minHeight: 0,
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: 12,
    paddingBottom: 8,
    position: 'relative',
  },
  nextCardPreview: {
    position: 'absolute',
    left: Spacing.screenPadding + 8,
    right: Spacing.screenPadding + 8,
    top: 22,
    bottom: 22,
    padding: 18,
    justifyContent: 'flex-end',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceElevated,
    transform: [{ scale: 0.97 }],
  },
  nextCardEyebrow: { color: Colors.textMuted, fontSize: 9, fontWeight: Typography.bold, letterSpacing: 0.7 },
  nextCardName: { color: Colors.textSecondary, fontSize: Typography.body, fontWeight: Typography.semiBold, marginTop: 4 },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingTop: 8,
    paddingBottom: 6,
  },
  actionButton: {
    minHeight: 48,
    minWidth: 68,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderWidth: 1,
  },
  skipButton: {
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceElevated,
  },
  saveButton: {
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceElevated,
  },
  actionButtonText: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: Typography.medium,
  },
  primaryAction: {
    minHeight: 48,
    flex: 1,
    maxWidth: 260,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 13,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
  },
  primaryActionText: {
    color: Colors.textOnPrimary,
    fontSize: Typography.caption,
    fontWeight: Typography.bold,
  },
  disabledAction: {
    opacity: 0.65,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    marginVertical: 0,
  },
  refreshing: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: 8,
  },
  refreshingText: {
    color: Colors.textMuted,
    fontSize: Typography.caption,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: Colors.overlay,
  },
  filterSheet: {
    maxHeight: '78%',
    padding: Spacing.screenPadding,
    paddingBottom: 28,
    backgroundColor: Colors.card,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 14,
  },
  detailSheet: {
    maxHeight: '88%',
    backgroundColor: Colors.card,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sheetHeader: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingHorizontal: Spacing.screenPadding,
  },
  sheetTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.title3,
    fontWeight: Typography.bold,
  },
  sheetSubtitle: {
    color: Colors.textMuted,
    fontSize: Typography.caption,
    marginTop: 3,
  },
  closeButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceElevated,
  },
  modalFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 4,
  },
  detailContent: {
    padding: Spacing.screenPadding,
    paddingBottom: 22,
    gap: 12,
  },
  detailAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  detailAuthorText: {
    flex: 1,
  },
  detailTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.headline,
    fontWeight: Typography.bold,
  },
  detailMuted: {
    color: Colors.textMuted,
    fontSize: Typography.caption,
    lineHeight: 17,
    marginTop: 3,
  },
  detailLink: {
    minHeight: 44,
    color: Colors.primary,
    fontSize: Typography.body,
    fontWeight: Typography.semiBold,
    textDecorationLine: 'underline',
    textAlignVertical: 'center',
  },
  detailEntry: {
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 5,
  },
  detailSectionTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.body,
    fontWeight: Typography.semiBold,
  },
  detailBody: {
    color: Colors.textSecondary,
    fontSize: Typography.body,
    lineHeight: 21,
    marginTop: 8,
  },
  detailActions: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: 12,
    paddingBottom: 24,
  },
});
