import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../components/navigation/Header';
import { CompactPostComposer } from '../../components/home/CompactPostComposer';
import { StudyHubSection } from '../../components/home/StudyHubSection';
import { AskCommunitySection, BuiltByStudentsSection, CommunityChatSection, SkillsServicesSection, StudentSpotlightSection } from '../../components/home/DiscoverySections';
import { CommunityPostCard } from '../../components/cards/CommunityPostCard';
import { PostComposerModal } from '../../components/modals/PostComposerModal';
import { PostCommentsModal } from '../../components/modals/PostCommentsModal';
import { CollaborateModal } from '../../components/modals/CollaborateModal';
import { AuthorProfileModal } from '../../components/modals/AuthorProfileModal';
import { useApp } from '../../context/AppContext';
import { dataService } from '../../services/dataService';
import { DEMO_STUDY_RESOURCES, getDemoHomePage } from '../../services/demoHomeData';
import { DEMO_COMMUNITY_QUESTIONS, DEMO_STUDENT_PROJECTS, DEMO_STUDENT_SERVICES, DEMO_STUDENT_SPOTLIGHTS, StudentSpotlight } from '../../services/homeDiscoveryData';
import { fetchResource, PdfUpload, uploadPdfResource } from '../../services/resourceApi';
import { CommunityPost, CommunityPostType, StudyResource, StudyResourceType } from '../../types';
import { Colors, Spacing, Typography } from '../../constants/theme';

const PAGE_SIZE = 5;
type HomeListItem =
  | { kind: 'post'; post: CommunityPost }
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
  const { user, conversations, addCommunityPost, toggleLikePost, toggleSavePost, addPostComment, applyToCollaborate } = useApp();
  const [posts, setPosts] = useState<CommunityPost[]>([]); const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true); const [loading, setLoading] = useState(true); const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false); const [error, setError] = useState<string | null>(null); const [selectedFilter, setSelectedFilter] = useState('all');
  const [resourceFilter, setResourceFilter] = useState<StudyResourceType | 'all'>('all'); const [resources, setResources] = useState<StudyResource[]>(__DEV__ ? DEMO_STUDY_RESOURCES : []);
  const [composerVisible, setComposerVisible] = useState(false); const [composerType, setComposerType] = useState<CommunityPostType>('story');
  const [activeCommentPost, setActiveCommentPost] = useState<CommunityPost | null>(null); const [activeCollabPost, setActiveCollabPost] = useState<CommunityPost | null>(null);
  const [selectedAuthor, setSelectedAuthor] = useState<CommunityPost['author'] | null>(null);
  const requestInFlight = useRef(false); const endReachedDuringMomentum = useRef(false); const mounted = useRef(true);

  useEffect(() => () => { mounted.current = false; }, []);

  const loadPage = useCallback(async (nextPage: number, replace = false) => {
    if (requestInFlight.current) return;
    requestInFlight.current = true; setError(null);
    if (nextPage > 1) setLoadingMore(true); else if (!replace) setLoading(true);
    try {
      const real = await dataService.getCommunityPosts({ page: nextPage, perPage: PAGE_SIZE });
      const demo = __DEV__ ? getDemoHomePage(nextPage, PAGE_SIZE) : { items: [], hasMore: false };
      if (!mounted.current) return;
      const incoming = mergeUnique(real.posts, demo.items);
      setPosts((current) => replace ? incoming : mergeUnique(current, incoming));
      setPage(nextPage); setHasMore(real.hasMore || demo.hasMore);
    } catch {
      if (mounted.current) setError(nextPage === 1 ? 'Couldn’t load the community feed. Try again.' : 'Couldn’t load more posts. Try again.');
    } finally {
      requestInFlight.current = false; if (mounted.current) { setLoading(false); setLoadingMore(false); setRefreshing(false); }
    }
  }, []);

  useEffect(() => { void Promise.resolve().then(() => loadPage(1, true)); }, [loadPage]);
  const refresh = useCallback(() => { setRefreshing(true); setHasMore(true); loadPage(1, true); }, [loadPage]);
  const loadMore = useCallback(() => { if (!endReachedDuringMomentum.current || loadingMore || !hasMore || requestInFlight.current) return; endReachedDuringMomentum.current = false; loadPage(page + 1); }, [hasMore, loadPage, loadingMore, page]);
  const selectedTypes = filters.find((item) => item.id === selectedFilter)?.types;
  const filteredPosts = useMemo(() => posts.filter((post) => {
    if (selectedFilter === 'hackathons') return post.category === 'Hackathon' || post.tags?.includes('Hackathon');
    return selectedTypes ? selectedTypes.includes(post.type) : !post.document;
  }), [posts, selectedFilter, selectedTypes]);
  const allResources = useMemo(() => {
    const realResources = posts.filter((post) => !post.demo && post.document).map((post) => post.document!);
    const map = new Map([...realResources, ...resources].map((item) => [item.id, item]));
    return [...map.values()];
  }, [posts, resources]);
  const visibleResources = useMemo(() => allResources.filter((resource) => resourceFilter === 'all' || resource.type === resourceFilter), [allResources, resourceFilter]);
  const realStudents = useMemo<StudentSpotlight[]>(() => {
    const map = new Map<string, StudentSpotlight>();
    posts.filter((post) => !post.demo && post.author.id !== user.id).forEach((post) => {
      if (!map.has(post.author.id)) map.set(post.author.id, {
        id: post.author.id, name: post.author.name, avatar: post.author.avatar,
        branchYear: post.author.college || 'StudOS student', role: post.author.role || 'Student builder',
        intro: post.content, skills: (post.skills || post.tags || []).slice(0, 3), currentWork: post.title,
      });
    });
    return [...map.values()].slice(0, 8);
  }, [posts, user.id]);
  const spotlightStudents = useMemo(() => __DEV__
    ? [...realStudents, ...DEMO_STUDENT_SPOTLIGHTS].filter((student, index, all) => all.findIndex((entry) => entry.id === student.id) === index).slice(0, 8)
    : realStudents, [realStudents]);
  const serviceOfferings = useMemo(() => {
    const real = posts.filter((post) => !post.demo && post.type === 'service').map((post) => ({
      id: post.id, title: post.title, description: post.content,
      provider: realStudents.find((student) => student.id === post.author.id) || { id: post.author.id, name: post.author.name, avatar: post.author.avatar, branchYear: post.author.college || '', role: post.author.role || 'Student', intro: '', skills: post.skills || [], currentWork: post.title },
      skills: post.skills || [], availability: post.serviceAvailability || 'Contact for availability',
    }));
    return __DEV__ ? [...real, ...DEMO_STUDENT_SERVICES] : real;
  }, [posts, realStudents]);
  const projectFeatures = useMemo(() => {
    const real = posts.filter((post) => !post.demo && post.type === 'project').map((post) => ({
      id: post.id, title: post.title, summary: post.content, author: post.author.name,
      branchYear: post.author.college || post.author.role || '', image: post.images?.[0],
      technologies: post.technologies || post.skills || [], seeking: post.rolesNeeded?.join(', '),
    }));
    return __DEV__ ? [...real, ...DEMO_STUDENT_PROJECTS] : real;
  }, [posts]);
  const questionPreviews = useMemo(() => {
    const real = posts.filter((post) => !post.demo && post.type === 'question').map((post) => ({
      id: post.id, author: post.author.name, branchYear: post.author.college || '', title: post.title,
      replies: post.commentsCount, topic: post.tags?.[0] || 'Community',
    }));
    return __DEV__ ? [...real, ...DEMO_COMMUNITY_QUESTIONS] : real;
  }, [posts]);
  const homeConversations = useMemo(() => __DEV__
    ? conversations
    : conversations.filter((conversation) => !conversation.id.startsWith('conv_')),
  [conversations]);
  const feedItems = useMemo<HomeListItem[]>(() => {
    const storyItems = filteredPosts.map((post) => ({ kind: 'post' as const, post }));
    const firstBatch = storyItems.slice(0, PAGE_SIZE);
    const laterBatches = storyItems.slice(PAGE_SIZE);
    return [
      ...(firstBatch.length ? firstBatch : [{ kind: 'empty' as const }]),
      { kind: 'study' as const }, { kind: 'questions' as const }, { kind: 'chat' as const },
      ...laterBatches,
    ];
  }, [filteredPosts]);

  const openComposer = (type: CommunityPostType) => { setComposerType(type); setComposerVisible(true); };
  const submitPost = async (value: Parameters<typeof addCommunityPost>[0], pdf?: PdfUpload) => {
    let postValue = value;
    if (value.type === 'study_material' && pdf && value.document) {
      const uploaded = await uploadPdfResource(pdf, {
        type: value.document.type, title: value.title, description: value.content,
        subject: value.document.subject, academicYear: value.document.academicYear,
        uploadedBy: user.id, createdAt: 'Just now',
      }, { id: user.id, name: user.name, avatar: user.avatar, college: user.college, role: user.primaryRole });
      postValue = { ...value, document: uploaded };
    }
    const created = await addCommunityPost(postValue);
    setPosts((current) => mergeUnique([created], current));
    if (created.document?.thumbnailStatus !== 'completed') {
      void new Promise((resolve) => setTimeout(resolve, 800)).then(async () => {
        try {
          const processed = await fetchResource(created.document!.id, created.document!.uploader);
          setPosts((current) => current.map((post) => post.id === created.id ? { ...post, document: processed } : post));
          setResources((current) => [...current.filter((item) => item.id !== processed.id), processed]);
        } catch { /* Card keeps its pending or failed state; refresh can retry. */ }
      });
    }
    return created;
  };
  const updatePost = (id: string, change: Partial<CommunityPost>) => setPosts((current) => current.map((item) => item.id === id ? { ...item, ...change } : item));
  const openPost = (post: CommunityPost) => {
    if (post.document) router.push({ pathname: '/resource/[id]', params: { id: post.document.id } } as never);
    else if (post.ideaId) router.push(`/ideahub/${post.ideaId}` as never); else if (post.projectId) router.push(`/projects/${post.projectId}` as never); else setActiveCommentPost(post);
  };
  const openAuthor = (id: string) => { if (id === user.id) router.push('/(tabs)/profile' as never); else { const author = posts.find((post) => post.author.id === id)?.author; if (author && !author.id.startsWith('preview_')) setSelectedAuthor(author); } };

  const listHeader = <>
    <CompactPostComposer user={user} onOpen={openComposer} />
    <StudentSpotlightSection students={spotlightStudents} />
    <SkillsServicesSection services={serviceOfferings.slice(0, 6)} />
    <BuiltByStudentsSection projects={projectFeatures.slice(0, 6)} />
    <View style={styles.feedHeader}><Text style={styles.feedTitle}>Campus Stories</Text><Text style={styles.feedSubtitle}>Experiences, ideas, and moments shared by students.</Text></View>
    <FlatList horizontal data={filters} keyExtractor={(item) => item.id} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters} renderItem={({ item }) => <TouchableOpacity onPress={() => setSelectedFilter(item.id)} style={[styles.filter, selectedFilter === item.id && styles.filterActive]}><Text style={[styles.filterText, selectedFilter === item.id && styles.filterTextActive]}>{item.label}</Text></TouchableOpacity>} />
    {loading ? <View style={styles.initialLoading}><ActivityIndicator color={Colors.primary} /><Text style={styles.loadingText}>Loading your campus feed...</Text></View> : null}
    {!loading && error && posts.length === 0 ? <View style={styles.state}><Ionicons name="cloud-offline-outline" size={28} color={Colors.textMuted} /><Text style={styles.stateText}>{error}</Text><TouchableOpacity style={styles.retry} onPress={() => loadPage(1, true)}><Text style={styles.retryText}>Try again</Text></TouchableOpacity></View> : null}
  </>;

  const paginationFooter = loadingMore ? <View style={styles.footer}><ActivityIndicator size="small" color={Colors.primary} /><Text style={styles.footerText}>Loading more stories...</Text></View> : error && posts.length > 0 ? <View style={styles.footer}><Text style={styles.footerText}>Couldn’t load more stories.</Text><TouchableOpacity onPress={() => loadPage(page + 1)}><Text style={styles.retryText}>Try again</Text></TouchableOpacity></View> : !hasMore && posts.length > 0 ? <View style={styles.footer}><Ionicons name="checkmark-circle-outline" size={18} color={Colors.textMuted} /><Text style={styles.footerText}>You’re all caught up.</Text></View> : null;
  return <SafeAreaView style={styles.safeArea} edges={['top']}><Header hideGreeting />
    <FlatList data={loading ? [] : feedItems} keyExtractor={(item) => item.kind === 'post' ? item.post.id : `home-section-${item.kind}`} renderItem={({ item }) => {
      if (item.kind === 'study') return <StudyHubSection resources={visibleResources} selected={resourceFilter} onSelect={setResourceFilter} onOpen={(resource) => router.push({ pathname: '/resource/[id]', params: { id: resource.id } } as never)} onBookmark={(resource) => setResources((current) => current.map((entry) => entry.id === resource.id ? { ...entry, isBookmarked: !entry.isBookmarked } : entry))} />;
      if (item.kind === 'questions') return <AskCommunitySection questions={questionPreviews.slice(0, 5)} onAsk={() => openComposer('question')} />;
      if (item.kind === 'chat') return <CommunityChatSection conversations={homeConversations} />;
      if (item.kind === 'empty') return <View style={styles.state}><Text style={styles.stateText}>Nothing here yet. Share something with your campus community.</Text></View>;
      const post = item.post;
      return <CommunityPostCard post={post} onLike={post.demo ? undefined : async () => { await toggleLikePost(post.id); updatePost(post.id, { isLiked: !post.isLiked, likesCount: post.isLiked ? Math.max(0, post.likesCount - 1) : post.likesCount + 1 }); }} onComment={post.demo ? undefined : () => setActiveCommentPost(post)} onSave={post.demo ? undefined : async () => { await toggleSavePost(post.id); updatePost(post.id, { isSaved: !post.isSaved }); }} onCollaborate={post.demo ? undefined : () => setActiveCollabPost(post)} onAuthorPress={post.demo ? undefined : openAuthor} onCardPress={() => openPost(post)} />;
    }}
      ListHeaderComponent={listHeader} ListFooterComponent={paginationFooter || undefined}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.primary} colors={[Colors.primary]} />} onEndReached={loadMore} onEndReachedThreshold={0.45} onMomentumScrollBegin={() => { endReachedDuringMomentum.current = true; }} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} initialNumToRender={5} maxToRenderPerBatch={5} windowSize={7} removeClippedSubviews />
    <PostComposerModal key={composerType} visible={composerVisible} initialType={composerType} onClose={() => setComposerVisible(false)} onSubmit={submitPost} />
    <PostCommentsModal visible={Boolean(activeCommentPost)} post={activeCommentPost} onClose={() => setActiveCommentPost(null)} onAddComment={addPostComment} />
    <CollaborateModal visible={Boolean(activeCollabPost)} post={activeCollabPost} onClose={() => setActiveCollabPost(null)} onSubmit={applyToCollaborate} />
    <AuthorProfileModal visible={Boolean(selectedAuthor)} author={selectedAuthor} onClose={() => setSelectedAuthor(null)} />
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#090A0F' }, content: { paddingBottom: 34 }, feedHeader: { paddingHorizontal: Spacing.screenPadding, marginTop: 28 }, feedTitle: { color: '#FFF', fontSize: 20, fontWeight: Typography.bold, letterSpacing: -0.4 }, feedSubtitle: { color: Colors.textMuted, fontSize: 12, marginTop: 4 },
  filters: { paddingHorizontal: Spacing.screenPadding, gap: 8, paddingVertical: 14 }, filter: { backgroundColor: '#121624', borderWidth: 1, borderColor: '#252C3D', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 }, filterActive: { backgroundColor: Colors.primary, borderColor: Colors.primary }, filterText: { color: Colors.textMuted, fontSize: 11, fontWeight: Typography.semiBold }, filterTextActive: { color: '#FFF' },
  initialLoading: { padding: 30, alignItems: 'center', gap: 10 }, loadingText: { color: Colors.textMuted, fontSize: 12 }, state: { marginHorizontal: 16, padding: 28, backgroundColor: '#121624', borderWidth: 1, borderColor: '#252C3D', borderRadius: 16, alignItems: 'center', gap: 10 }, stateText: { color: Colors.textMuted, fontSize: 12, textAlign: 'center' }, retry: { backgroundColor: Colors.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 }, retryText: { color: '#FF7777', fontSize: 12, fontWeight: Typography.bold }, footer: { minHeight: 70, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }, footerText: { color: Colors.textMuted, fontSize: 11 },
});
