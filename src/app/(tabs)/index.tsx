import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../components/navigation/Header';
import { CompactPostComposer } from '../../components/home/CompactPostComposer';
import { StudyHubSection } from '../../components/home/StudyHubSection';
import { AskCommunitySection, BuiltByStudentsSection, CommunityChatSection, SkillsServicesSection, StudentSpotlightSection } from '../../components/home/DiscoverySections';
import { CommunityPostCard } from '../../components/cards/CommunityPostCard';
import { PostComposerModal } from '../../components/modals/PostComposerModal';
import { AuthorProfileModal } from '../../components/modals/AuthorProfileModal';
import { useApp } from '../../context/AppContext';
import { StudentSpotlight } from '../../services/homeDiscoveryData';
import { listStudyHubPdfPage, saveResource } from '../../services/resourceApi';
import { postService } from '../../services/postService';
import { studentDirectoryService } from '../../services/studentDirectoryService';
import { supabaseConfigured } from '../../services/supabase';
import { CommunityPost, CommunityPostType, StudyResource, StudyResourceType } from '../../types';
import { Colors, Spacing, Typography } from '../../constants/theme';

const PAGE_SIZE = 5;
type HomeListItem =
  | { kind: 'post'; post: CommunityPost }
  | { kind: 'students' }
  | { kind: 'services' }
  | { kind: 'projects' }
  | { kind: 'study' }
  | { kind: 'questions' }
  | { kind: 'chat' }
  | { kind: 'empty' };
const filters: { id: string; label: string; types?: CommunityPostType[] }[] = [
  { id: 'all', label: 'All' }, { id: 'stories', label: 'Stories', types: ['story'] },
  { id: 'achievement', label: 'Achievements', types: ['achievement'] }, { id: 'ideas', label: 'Ideas', types: ['idea'] },
  { id: 'hackathons', label: 'Hackathons', types: ['story'] }, { id: 'help', label: 'Help', types: ['question'] }, { id: 'team', label: 'Team Up', types: ['event_collab'] },
];

const mergeUnique = (current: CommunityPost[], incoming: CommunityPost[]) => {
  const map = new Map(current.map((item) => [item.id, item]));
  incoming.forEach((item) => map.set(item.id, { ...map.get(item.id), ...item }));
  return [...map.values()];
};

export default function HomeScreen() {
  const { user, studentServices, conversations, projects, dataError, addCommunityPost, refreshAll } = useApp();
  const [posts, setPosts] = useState<CommunityPost[]>([]); const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true); const [loading, setLoading] = useState(true); const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false); const [error, setError] = useState<string | null>(null); const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [resourceFilter, setResourceFilter] = useState<StudyResourceType | 'all'>('all'); const [resources, setResources] = useState<StudyResource[]>([]); const [resourcesLoading, setResourcesLoading] = useState(true); const [resourcesLoadingMore, setResourcesLoadingMore] = useState(false); const [resourcesHasMore, setResourcesHasMore] = useState(false); const [resourcesError, setResourcesError] = useState(''); const [resourceOffset, setResourceOffset] = useState(0);
  const [resourceQuery, setResourceQuery] = useState<{ search?: string; college?: string; branch?: string; studyYear?: number; semester?: string; subject?: string; regulation?: string }>({});
  const [resourceReload, setResourceReload] = useState(0); const resourceRequest = useRef(false); const resourceVersion = useRef(0);
  const [composerVisible, setComposerVisible] = useState(false); const [composerType, setComposerType] = useState<CommunityPostType>('story');
  const [directoryStudents, setDirectoryStudents] = useState<StudentSpotlight[]>([]); const [directoryLoading, setDirectoryLoading] = useState(true); const [directoryError, setDirectoryError] = useState('');
  const [selectedAuthor, setSelectedAuthor] = useState<CommunityPost['author'] | null>(null);
  const requestInFlight = useRef(false); const endReachedDuringMomentum = useRef(false); const mounted = useRef(true);

  useEffect(() => () => { mounted.current = false; }, []);

  const loadPage = useCallback(async (nextPage: number, replace = false) => {
    if (requestInFlight.current) return;
    requestInFlight.current = true; setError(null);
    if (nextPage > 1) setLoadingMore(true); else if (!replace) setLoading(true);
    try {
      if (!supabaseConfigured) throw new Error('Configure Supabase and sign in to load posts.');
      const real = await postService.feed(nextPage, PAGE_SIZE);
      if (!mounted.current) return;
      const incoming = real.posts;
      setPosts((current) => replace ? incoming : mergeUnique(current, incoming));
      setPage(nextPage); setHasMore(real.hasMore);
    } catch {
      if (mounted.current) setError(nextPage === 1 ? 'Couldn’t load the community feed. Try again.' : 'Couldn’t load more posts. Try again.');
    } finally {
      requestInFlight.current = false; if (mounted.current) { setLoading(false); setLoadingMore(false); setRefreshing(false); }
    }
  }, []);

  useEffect(() => { void Promise.resolve().then(() => loadPage(1, true)); }, [loadPage]);
  useEffect(() => { let active = true; void studentDirectoryService.list({ limit: 500 }).then((page) => { if (!active) return; const featured = [...page.students.filter((student) => !student.isDemo).slice(0, 5), ...page.students.filter((student) => student.isDemo).slice(0, 3)]; setDirectoryStudents(featured.map((student) => ({ id: student.id, identity: student.identity, isDemo: student.isDemo, name: student.name, avatar: student.avatar, branchYear: [student.branch, student.college].filter(Boolean).join(' · '), role: student.branch || student.degree || 'Student', intro: student.shortBio, skills: student.skills.slice(0, 3), currentWork: student.interests.slice(0, 2).join(' · ') }))); }).catch(() => { if (active) setDirectoryError('Student profiles could not load. Retry from Students.'); }).finally(() => { if (active) setDirectoryLoading(false); }); return () => { active = false; }; }, []);
  useEffect(() => {
    const version = ++resourceVersion.current;
    resourceRequest.current = false;
    void Promise.resolve().then(async () => {
      if (version !== resourceVersion.current) return;
      setResources([]); setResourceOffset(0); setResourcesLoading(true); setResourcesError('');
      try {
        const page = await listStudyHubPdfPage({ ...resourceQuery, category: resourceFilter, offset: 0, limit: 24 });
        if (version === resourceVersion.current) { setResources(page.items); setResourceOffset(page.rawCount || 0); setResourcesHasMore(page.hasMore); }
      } catch (cause) {
        if (version === resourceVersion.current) { setResources([]); setResourcesHasMore(false); setResourcesError(cause instanceof Error ? cause.message : 'Could not load Study Hub.'); }
      } finally {
        if (version === resourceVersion.current) setResourcesLoading(false);
      }
    });
  }, [resourceQuery, resourceFilter, resourceReload]);
  const loadMoreResources = useCallback(async () => {
    if (resourceRequest.current || !resourcesHasMore) return;
    resourceRequest.current = true; setResourcesLoadingMore(true);
    try {
      const page = await listStudyHubPdfPage({ ...resourceQuery, category: resourceFilter, offset: resourceOffset, limit: 24 });
      setResources((current) => {
        const knownFileIds = new Set(current.map((item) => item.driveFileId).filter(Boolean));
        const additions = page.items.filter((item) => item.driveFileId && !knownFileIds.has(item.driveFileId));
        return [...current, ...additions];
      });
      setResourceOffset((current) => current + (page.rawCount || 0));
      setResourcesHasMore(page.hasMore);
    } catch (cause) { setResourcesError(cause instanceof Error ? cause.message : 'Could not load more resources.'); }
    finally { resourceRequest.current = false; setResourcesLoadingMore(false); }
  }, [resourceFilter, resourceQuery, resourceOffset, resourcesHasMore]);
  const refresh = useCallback(() => { setRefreshing(true); setHasMore(true); loadPage(1, true); }, [loadPage]);
  const loadMore = useCallback(() => { if (!endReachedDuringMomentum.current || loadingMore || !hasMore || requestInFlight.current) return; endReachedDuringMomentum.current = false; loadPage(page + 1); }, [hasMore, loadPage, loadingMore, page]);
  const selectedTypes = filters.find((item) => item.id === selectedFilter)?.types;
  const filteredPosts = useMemo(() => posts.filter((post) => {
    const matchesType = selectedFilter === 'hackathons'
      ? post.category === 'Hackathon' || post.tags?.includes('Hackathon')
      : selectedTypes ? selectedTypes.includes(post.type) : !post.document;
    const matchesSearch = !searchQuery.trim() || `${post.title} ${post.content} ${post.category || ''} ${(post.tags || []).join(' ')}`.toLowerCase().includes(searchQuery.trim().toLowerCase());
    return matchesType && matchesSearch;
  }), [posts, selectedFilter, selectedTypes, searchQuery]);
  const allResources = resources;
  const visibleResources = useMemo(() => allResources.filter((resource) => resourceFilter === 'all' || resource.type === resourceFilter), [allResources, resourceFilter]);
  const spotlightStudents = directoryStudents;
  const serviceOfferings = studentServices;
  const projectFeatures = useMemo(() => projects.map((project) => ({ id: project.id, title: project.title, summary: project.description, author: project.contributors[0]?.name || 'Student', branchYear: '', image: project.thumbnail || undefined, technologies: project.technologies || [], seeking: '' })), [projects]);
  const questionPreviews = useMemo(() => {
    const real = posts.filter((post) => post.type === 'question').map((post) => ({
      id: post.id, author: post.author.name, branchYear: post.author.college || '', title: post.title,
      replies: post.commentsCount ?? 0, topic: post.tags?.[0] || 'Community',
    }));
    return real;
  }, [posts]);
  const homeConversations = useMemo(() => supabaseConfigured
    ? conversations.filter((conversation) => !conversation.id.startsWith('conv_'))
    : conversations,
  [conversations]);
  const feedItems = useMemo<HomeListItem[]>(() => {
    const storyItems = filteredPosts.map((post) => ({ kind: 'post' as const, post }));
    const firstBatch = storyItems.slice(0, PAGE_SIZE);
    const laterBatches = storyItems.slice(PAGE_SIZE);
    const earlyStories = firstBatch.slice(0, 2);
    const remainingFirstBatch = firstBatch.slice(2);
    return [
      ...(firstBatch.length ? earlyStories : [{ kind: 'empty' as const }]),
      ...(firstBatch.length > 1 ? [{ kind: 'students' as const }, { kind: 'services' as const }] : []),
      ...remainingFirstBatch,
      { kind: 'study' as const }, { kind: 'projects' as const }, { kind: 'questions' as const }, { kind: 'chat' as const },
      ...laterBatches,
    ];
  }, [filteredPosts]);

  const openComposer = (type: CommunityPostType) => { setComposerType(type); setComposerVisible(true); };
  const submitPost = async (value: Parameters<typeof addCommunityPost>[0]) => {
    const created = await addCommunityPost(value);
    setPosts((current) => mergeUnique([created], current));
    return created;
  };
  const openPost = (post: CommunityPost) => {
    if (post.document) router.push({ pathname: '/resource/[id]', params: { id: post.document.id } } as never);
    else if (post.ideaId) router.push(`/ideahub/${post.ideaId}` as never); else if (post.projectId) router.push(`/projects/${post.projectId}` as never); else router.push({ pathname: '/post/[id]', params: { id: post.id } });
  };
  const openAuthor = (id: string) => { const author = posts.find((post) => post.author.id === id)?.author; if (author?.identity) router.push(`/student/${author.identity.type}/${author.identity.id}` as never); else if (id === user.id) router.push('/(tabs)/profile' as never); else if (author) setSelectedAuthor(author); };

  const listHeader = <>
    <CompactPostComposer user={user} onOpen={openComposer} />
    <View style={styles.feedHeader}><Text style={styles.feedTitle}>Campus Stories</Text><Text style={styles.feedSubtitle}>Experiences, ideas, and moments shared by students.</Text></View>
    <TextInput accessibilityLabel="Search community posts" value={searchQuery} onChangeText={setSearchQuery} placeholder="Search posts, tags, topics" placeholderTextColor="#777F90" style={styles.searchInput} />
    <FlatList horizontal data={filters} keyExtractor={(item) => item.id} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters} renderItem={({ item }) => <TouchableOpacity onPress={() => setSelectedFilter(item.id)} style={[styles.filter, selectedFilter === item.id && styles.filterActive]}><Text style={[styles.filterText, selectedFilter === item.id && styles.filterTextActive]}>{item.label}</Text></TouchableOpacity>} />
    {dataError ? <View style={styles.state}><Text style={styles.stateText}>{dataError}</Text><TouchableOpacity style={styles.retry} onPress={() => { void refreshAll(); void loadPage(1, true); }}><Text style={styles.retryText}>Try again</Text></TouchableOpacity></View> : null}
    {loading ? <View style={styles.initialLoading}><ActivityIndicator color={Colors.primary} /><Text style={styles.loadingText}>Loading your campus feed...</Text></View> : null}
    {!loading && error && posts.length === 0 ? <View style={styles.state}><Ionicons name="cloud-offline-outline" size={28} color={Colors.textMuted} /><Text style={styles.stateText}>{error}</Text><TouchableOpacity style={styles.retry} onPress={() => loadPage(1, true)}><Text style={styles.retryText}>Try again</Text></TouchableOpacity></View> : null}
  </>;

  const paginationFooter = loadingMore ? <View style={styles.footer}><ActivityIndicator size="small" color={Colors.primary} /><Text style={styles.footerText}>Loading more stories...</Text></View> : error && posts.length > 0 ? <View style={styles.footer}><Text style={styles.footerText}>Couldn’t load more stories.</Text><TouchableOpacity onPress={() => loadPage(page + 1)}><Text style={styles.retryText}>Try again</Text></TouchableOpacity></View> : !hasMore && posts.length > 0 ? <View style={styles.footer}><Ionicons name="checkmark-circle-outline" size={18} color={Colors.textMuted} /><Text style={styles.footerText}>You’re all caught up.</Text></View> : null;
  return <SafeAreaView style={styles.safeArea} edges={['top']}><Header hideGreeting />
    <FlatList data={loading ? [] : feedItems} keyExtractor={(item) => item.kind === 'post' ? item.post.id : `home-section-${item.kind}`} renderItem={({ item }) => {
      if (item.kind === 'students') return <StudentSpotlightSection students={spotlightStudents} loading={directoryLoading} error={directoryError} />;
      if (item.kind === 'services') return <SkillsServicesSection services={serviceOfferings.slice(0, 6)} />;
      if (item.kind === 'projects') return <BuiltByStudentsSection projects={projectFeatures.slice(0, 6)} />;
      if (item.kind === 'study') return <StudyHubSection resources={visibleResources} loading={resourcesLoading} loadingMore={resourcesLoadingMore} hasMore={resourcesHasMore} error={resourcesError} selected={resourceFilter} onSelect={setResourceFilter} onFiltersChange={setResourceQuery} onLoadMore={() => void loadMoreResources()} onRetry={() => setResourceReload((value) => value + 1)} onOpen={(resource) => router.push({ pathname: '/resource/[id]', params: { id: resource.id } } as never)} onBookmark={async (resource) => { const saved = !resource.isBookmarked; try { await saveResource(resource.id, saved); setResources((current) => current.map((entry) => entry.id === resource.id ? { ...entry, isBookmarked: saved } : entry)); } catch { setError('Could not save this resource. Sign in and try again.'); } }} />;
      if (item.kind === 'questions') return <AskCommunitySection questions={questionPreviews.slice(0, 5)} onAsk={() => openComposer('question')} />;
      if (item.kind === 'chat') return <CommunityChatSection conversations={homeConversations} />;
      if (item.kind === 'empty') return <View style={styles.state}><Text style={styles.stateText}>Nothing here yet. Share something with your campus community.</Text></View>;
      const post = item.post;
      return <CommunityPostCard post={post} onCardPress={() => openPost(post)} onAuthorPress={openAuthor} />;
    }}
      ListHeaderComponent={listHeader} ListFooterComponent={paginationFooter || undefined}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.primary} colors={[Colors.primary]} />} onEndReached={loadMore} onEndReachedThreshold={0.45} onMomentumScrollBegin={() => { endReachedDuringMomentum.current = true; }} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} initialNumToRender={5} maxToRenderPerBatch={5} windowSize={7} removeClippedSubviews />
    <PostComposerModal key={composerType} visible={composerVisible} initialType={composerType} onClose={() => setComposerVisible(false)} onSubmit={submitPost} />
    <AuthorProfileModal visible={Boolean(selectedAuthor)} author={selectedAuthor} onClose={() => setSelectedAuthor(null)} />
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background }, content: { paddingBottom: 28 }, feedHeader: { paddingHorizontal: Spacing.screenPadding, marginTop: 22, marginBottom: 4 }, feedTitle: { color: Colors.textPrimary, fontSize: 22, lineHeight: 29, fontWeight: Typography.bold, letterSpacing: -0.3 }, feedSubtitle: { color: Colors.textMuted, fontSize: 14, lineHeight: 21, marginTop: 5 },
  filters: { paddingHorizontal: Spacing.screenPadding, gap: 8, paddingVertical: 12 }, filter: { minHeight: 44, justifyContent: 'center', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 999, paddingHorizontal: 15 }, filterActive: { backgroundColor: Colors.primary, borderColor: Colors.primary }, filterText: { color: Colors.textMuted, fontSize: 13, fontWeight: Typography.semiBold }, filterTextActive: { color: Colors.textOnPrimary },
  initialLoading: { padding: 30, alignItems: 'center', gap: 10 }, loadingText: { color: Colors.textMuted, fontSize: 13 }, state: { marginHorizontal: 16, padding: 22, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: 16, alignItems: 'center', gap: 10 }, stateText: { color: Colors.textMuted, fontSize: 13, lineHeight: 19, textAlign: 'center' }, retry: { minHeight: 44, justifyContent: 'center', backgroundColor: Colors.primary, borderRadius: 10, paddingHorizontal: 16 }, retryText: { color: Colors.textOnPrimary, fontSize: 12, fontWeight: Typography.bold }, footer: { minHeight: 64, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }, footerText: { color: Colors.textMuted, fontSize: 12 }, searchInput: { marginHorizontal: Spacing.screenPadding, minHeight: 48, borderRadius: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface, color: Colors.textPrimary, fontSize: 14, marginBottom: 8 },
});
