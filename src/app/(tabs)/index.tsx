import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../components/navigation/Header';
import { PostComposerModal } from '../../components/modals/PostComposerModal';
import { CommunityDraft, CommunityRecordComposer } from '../../components/home/CommunityRecordComposer';
import { HomeFeedEntry, HomeFeedItem } from '../../components/home/HomeFeedItem';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { Colors, Typography } from '../../constants/theme';
import { getDemoIdeas, getDemoIdeaById, toggleDemoIdeaSave, toggleDemoIdeaSpark, type DemoIdea } from '../../services/demoIdeasService';
import { studentCommunityService, StudentHelpRequest, StudentProblem } from '../../services/studentCommunityService';
import { postService } from '../../services/postService';
import type { CommunityPost, CommunityPostType } from '../../types';
import { studentProfileRoute } from '../../services/studentIdentity';

type FeedFilter = 'All' | 'Ideas' | 'Problems' | 'Builds' | 'Help Needed';
type FeedSource = 'ideas' | 'problems' | 'help' | 'posts';
const FILTERS: FeedFilter[] = ['All', 'Ideas', 'Problems', 'Builds', 'Help Needed'];
const SOURCES: FeedSource[] = ['ideas', 'problems', 'help', 'posts'];
const PAGE_SIZE = 20;

function mergeUnique<T extends { id: string }>(previous: T[], next: T[], reset: boolean) {
  const rows = reset ? [] : previous;
  const byId = new Map(rows.map((item) => [item.id, item]));
  next.forEach((item) => byId.set(item.id, item));
  return [...byId.values()];
}

function postFilter(post: CommunityPost): FeedFilter | null {
  if (post.type === 'idea') return 'Ideas';
  if (post.type === 'project') return 'Builds';
  if (post.type === 'question') {
    const asksForHelp = Boolean(post.skills?.length || post.rolesNeeded?.length || post.tags?.some((tag) => /help|looking[- ]for/i.test(tag)));
    return asksForHelp ? 'Help Needed' : 'Problems';
  }
  if (post.type === 'event_collab') return 'Help Needed';
  return null;
}

export default function HomeScreen() {
  const { session } = useAuth();
  const { width } = useWindowDimensions();
  const { addCommunityPost, toggleLikePost, toggleSavePost, applyToCollaborate } = useApp();
  const [ideas, setIdeas] = useState<DemoIdea[]>([]);
  const [problems, setProblems] = useState<StudentProblem[]>([]);
  const [helpRequests, setHelpRequests] = useState<StudentHelpRequest[]>([]);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [filter, setFilter] = useState<FeedFilter>('All');
  const [sourceErrors, setSourceErrors] = useState<Partial<Record<FeedSource, string>>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sourceHasMore, setSourceHasMore] = useState<Record<FeedSource, boolean>>({ ideas: true, problems: true, help: true, posts: true });
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [composerChoiceOpen, setComposerChoiceOpen] = useState(false);
  const [composerChoice, setComposerChoice] = useState<CommunityPostType | null>(null);
  const [communityForm, setCommunityForm] = useState<'problem' | 'help' | null>(null);
  const [collaborationPost, setCollaborationPost] = useState<CommunityPost | null>(null);
  const [collaborationNote, setCollaborationNote] = useState('');
  const [collaborationBusy, setCollaborationBusy] = useState(false);
  const requestVersion = useRef(0);
  const hasLoaded = useRef(false);
  const loadingMoreRef = useRef(false);
  const offsets = useRef<Record<FeedSource, number>>({ ideas: 0, problems: 0, help: 0, posts: 0 });
  const canLoadMore = useRef<Record<FeedSource, boolean>>({ ideas: true, problems: true, help: true, posts: true });

  const loadPage = useCallback(async (reset: boolean) => {
    if (!reset && loadingMoreRef.current) return;
    if (!reset) { loadingMoreRef.current = true; setLoadingMore(true); }
    else if (!hasLoaded.current) setLoading(true);
    const version = ++requestVersion.current;
    const pageOffsets = reset ? { ideas: 0, problems: 0, help: 0, posts: 0 } : { ...offsets.current };
    const requests = {
      ideas: getDemoIdeas({ offset: pageOffsets.ideas, limit: PAGE_SIZE }),
      problems: studentCommunityService.problems(pageOffsets.problems, PAGE_SIZE),
      help: studentCommunityService.helpRequests(pageOffsets.help, PAGE_SIZE),
      posts: postService.feed(Math.floor(pageOffsets.posts / PAGE_SIZE) + 1, PAGE_SIZE),
    };
    const results = await Promise.allSettled([requests.ideas, requests.problems, requests.help, requests.posts]);
    if (version !== requestVersion.current) return;
    results.forEach((result, index) => {
      const source = SOURCES[index];
      if (result.status === 'rejected') {
        setSourceErrors((current) => ({ ...current, [source]: result.reason instanceof Error ? result.reason.message : `${source} could not be loaded.` }));
        canLoadMore.current[source] = false;
        setSourceHasMore((current) => ({ ...current, [source]: false }));
        return;
      }
      setSourceErrors((current) => { const next = { ...current }; delete next[source]; return next; });
      if (source === 'ideas') {
        const page = result.value as Awaited<typeof requests.ideas>;
        setIdeas((current) => mergeUnique(current, page.items, reset));
        offsets.current.ideas = pageOffsets.ideas + page.items.length;
        canLoadMore.current.ideas = page.hasMore;
        setSourceHasMore((current) => ({ ...current, ideas: page.hasMore }));
      } else if (source === 'problems') {
        const page = result.value as StudentProblem[];
        setProblems((current) => mergeUnique(current, page, reset));
        offsets.current.problems = pageOffsets.problems + page.length;
        canLoadMore.current.problems = page.length === PAGE_SIZE;
        setSourceHasMore((current) => ({ ...current, problems: page.length === PAGE_SIZE }));
      } else if (source === 'help') {
        const page = result.value as StudentHelpRequest[];
        setHelpRequests((current) => mergeUnique(current, page, reset));
        offsets.current.help = pageOffsets.help + page.length;
        canLoadMore.current.help = page.length === PAGE_SIZE;
        setSourceHasMore((current) => ({ ...current, help: page.length === PAGE_SIZE }));
      } else {
        const page = (result.value as Awaited<typeof requests.posts>).posts;
        setPosts((current) => mergeUnique(current, page, reset));
        offsets.current.posts = pageOffsets.posts + page.length;
        canLoadMore.current.posts = (result.value as Awaited<typeof requests.posts>).hasMore;
        setSourceHasMore((current) => ({ ...current, posts: (result.value as Awaited<typeof requests.posts>).hasMore }));
      }
    });
    hasLoaded.current = true;
    setLoading(false);
    setRefreshing(false);
    loadingMoreRef.current = false;
    setLoadingMore(false);
  }, []);

  useFocusEffect(useCallback(() => {
    void loadPage(true);
  }, [loadPage]));

  const entries = useMemo<HomeFeedEntry[]>(() => {
    const rows: HomeFeedEntry[] = [
      ...ideas.map((data) => ({ kind: 'idea' as const, id: data.id, createdAt: data.createdAt, data })),
      ...problems.map((data) => ({ kind: 'problem' as const, id: data.id, createdAt: data.createdAt, data })),
      ...helpRequests.map((data) => ({ kind: 'help' as const, id: data.id, createdAt: data.createdAt, data })),
      ...posts.map((data) => ({ kind: 'post' as const, id: data.id, createdAt: data.createdAt, data })),
    ];
    const seen = new Set<string>();
    return rows.filter((row) => {
      const key = `${row.kind}:${row.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      if (filter === 'All') return true;
      if (row.kind === 'idea') return filter === 'Ideas';
      if (row.kind === 'problem') return filter === 'Problems';
      if (row.kind === 'help') return filter === 'Help Needed';
      return postFilter(row.data) === filter;
    }).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }, [filter, ideas, problems, helpRequests, posts]);

  const anyMore = SOURCES.some((source) => sourceHasMore[source]);
  const retryLoad = () => { setRefreshing(true); void loadPage(true); };
  const refresh = () => { setRefreshing(true); void loadPage(true); };
  const loadMore = () => { if (anyMore && !loadingMoreRef.current) void loadPage(false); };
  const requireAuth = (message: string) => {
    if (session?.user.id) return true;
    Alert.alert('Sign in required', message, [{ text: 'Cancel', style: 'cancel' }, { text: 'Sign in', onPress: () => router.push('/login' as never) }]);
    return false;
  };

  const onIdeaAction = async (idea: DemoIdea, action: 'spark' | 'save') => {
    if (!requireAuth(action === 'spark' ? 'Sign in to Spark ideas.' : 'Sign in to save ideas.')) return;
    const busy = `${action}:${idea.id}`;
    if (busyAction) return;
    setBusyAction(busy);
    try {
      if (action === 'spark') {
        const active = await toggleDemoIdeaSpark(idea.id, session?.user.id);
        const updated = await getDemoIdeaById(idea.id);
        setIdeas((rows) => rows.map((row) => row.id === idea.id ? updated || { ...row, isSparkedByViewer: active, sparkCount: row.sparkCount == null ? null : Math.max(0, row.sparkCount + (active ? 1 : -1)) } : row));
      } else {
        const active = await toggleDemoIdeaSave(idea.id, session?.user.id);
        setIdeas((rows) => rows.map((row) => row.id === idea.id ? { ...row, isSavedByViewer: active } : row));
      }
    } catch (cause) { Alert.alert('Could not update idea', cause instanceof Error ? cause.message : 'Please try again.'); }
    finally { setBusyAction(null); }
  };

  const onPostAction = async (post: CommunityPost, action: 'like' | 'save') => {
    if (!requireAuth(action === 'like' ? 'Sign in to react to posts.' : 'Sign in to save posts.')) return;
    const busy = `${action}:${post.id}`;
    if (busyAction) return;
    setBusyAction(busy);
    const oldLiked = Boolean(post.isLiked);
    const oldSaved = Boolean(post.isSaved);
    setPosts((rows) => rows.map((row) => row.id === post.id ? action === 'like'
      ? { ...row, isLiked: !oldLiked, likesCount: typeof row.likesCount === 'number' ? Math.max(0, row.likesCount + (oldLiked ? -1 : 1)) : undefined }
      : { ...row, isSaved: !oldSaved } : row));
    try { if (action === 'like') await toggleLikePost(post.id); else await toggleSavePost(post.id); }
    catch (cause) {
      setPosts((rows) => rows.map((row) => row.id === post.id ? { ...row, isLiked: oldLiked, isSaved: oldSaved, likesCount: post.likesCount } : row));
      Alert.alert('Could not update post', cause instanceof Error ? cause.message : 'Please try again.');
    } finally { setBusyAction(null); }
  };

  const submitCollaborationRequest = async () => {
    if (!collaborationPost || !collaborationNote.trim() || collaborationBusy) return;
    if (!requireAuth('Sign in to request collaboration.')) return;
    setCollaborationBusy(true);
    try {
      const result = await applyToCollaborate(collaborationPost.id, collaborationNote.trim());
      Alert.alert(result.success ? 'Request sent' : 'Request not sent', result.message);
      if (result.success) { setCollaborationPost(null); setCollaborationNote(''); }
    } catch (cause) { Alert.alert('Could not send request', cause instanceof Error ? cause.message : 'Please try again.'); }
    finally { setCollaborationBusy(false); }
  };

  const openEntry = (entry: HomeFeedEntry) => {
    if (entry.kind === 'idea') router.push({ pathname: '/ideahub/[id]', params: { id: entry.id } } as never);
    else if (entry.kind === 'post' && entry.data.type === 'study_material' && entry.data.document?.id) router.push({ pathname: '/resource/[id]', params: { id: entry.data.document.id } } as never);
    else if (entry.kind === 'post') router.push({ pathname: '/post/[id]', params: { id: entry.id } } as never);
    else router.push({ pathname: '/community/[kind]/[id]', params: { kind: entry.kind === 'problem' ? 'problem' : 'help', id: entry.id } } as never);
  };

  const openAuthor = (entry: HomeFeedEntry) => {
    if (entry.kind === 'idea') router.push(studentProfileRoute(entry.data.author.identity) as never);
    else if (entry.kind === 'post') router.push(`/student/real/${entry.data.author.id}` as never);
    else router.push(studentProfileRoute(entry.data.author.identity) as never);
  };

  const submitCommunityRecord = async (draft: CommunityDraft) => {
    if (communityForm === 'problem') {
      const created = await studentCommunityService.createProblem(draft);
      setProblems((rows) => mergeUnique(rows, [created], false)); setCommunityForm(null); return;
    }
    if (communityForm === 'help') {
      const created = await studentCommunityService.createHelpRequest(draft);
      setHelpRequests((rows) => mergeUnique(rows, [created], false)); setCommunityForm(null);
    }
  };

  const submitPost = async (draft: Parameters<typeof addCommunityPost>[0]) => {
    const created = await addCommunityPost(draft);
    setPosts((rows) => mergeUnique(rows, [created], false));
  };

  const renderEntry = ({ item }: { item: HomeFeedEntry }) => <HomeFeedItem
    entry={item}
    busyAction={busyAction}
    onOpen={() => openEntry(item)}
    onAuthor={() => openAuthor(item)}
    onSpark={item.kind === 'idea' ? () => void onIdeaAction(item.data, 'spark') : undefined}
    onSaveIdea={item.kind === 'idea' ? () => void onIdeaAction(item.data, 'save') : undefined}
    onLike={item.kind === 'post' ? () => void onPostAction(item.data, 'like') : undefined}
    onSavePost={item.kind === 'post' ? () => void onPostAction(item.data, 'save') : undefined}
    onCollaborate={item.kind === 'post' ? () => { setCollaborationPost(item.data); setCollaborationNote(''); } : undefined}
  />;

  const visibleErrors = Object.entries(sourceErrors).filter(([source]) => filter === 'All' || sourceMatchesFilter(source as FeedSource, filter));
  const listHeader = <View style={[styles.filterHeader, { maxWidth: Math.min(width, 840) }]}>
    <View style={styles.filterRow}>
      <FlatList horizontal data={FILTERS} keyExtractor={(item) => item} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters} renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityState={{ selected: filter === item }} onPress={() => setFilter(item)} style={[styles.filter, filter === item && styles.filterSelected]}><Text style={[styles.filterText, filter === item && styles.filterTextSelected]}>{item}</Text></Pressable>} />
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Create a post" onPress={() => session ? setComposerChoiceOpen(true) : router.push('/login' as never)} style={styles.createButton}><Ionicons name="add" size={18} color={Colors.primary}/><Text style={styles.createText}>Create</Text></TouchableOpacity>
    </View>
  </View>;

  return <SafeAreaView style={styles.safe} edges={['top']}>
    <Header hideGreeting />
    <FlatList
      data={entries}
      renderItem={renderEntry}
      keyExtractor={(item) => `${item.kind}:${item.id}`}
      extraData={`${filter}:${busyAction}`}
      ListHeaderComponent={listHeader}
      stickyHeaderIndices={[0]}
      contentContainerStyle={styles.feedContent}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.primary} colors={[Colors.primary]} />}
      onEndReached={loadMore}
      onEndReachedThreshold={0.55}
      initialNumToRender={6}
      maxToRenderPerBatch={6}
      windowSize={7}
      removeClippedSubviews={Platform.OS === 'android'}
      ListEmptyComponent={loading ? <View style={styles.emptyState}><ActivityIndicator color={Colors.primary}/><Text style={styles.emptyText}>Loading the student feed</Text></View> : visibleErrors.length ? <View style={styles.emptyState}><Text style={styles.emptyText}>Some community posts could not be loaded.</Text><TouchableOpacity accessibilityRole="button" onPress={retryLoad}><Text style={styles.retryText}>Retry</Text></TouchableOpacity></View> : <View style={styles.emptyState}><Text style={styles.emptyText}>No posts in this category yet</Text><TouchableOpacity accessibilityRole="button" onPress={() => setComposerChoiceOpen(true)}><Text style={styles.retryText}>Create a post</Text></TouchableOpacity></View>}
      ListFooterComponent={loadingMore ? <ActivityIndicator color={Colors.primary} style={styles.footerLoading}/> : visibleErrors.length > 0 && entries.length > 0 ? <TouchableOpacity accessibilityRole="button" onPress={retryLoad} style={styles.partialError}><Text style={styles.partialErrorText}>Some posts could not be loaded · Retry</Text></TouchableOpacity> : anyMore ? <View style={styles.footerSpace}/> : <View style={styles.footerSpace}/>}
    />

    <Modal visible={composerChoiceOpen} transparent animationType="slide" onRequestClose={() => setComposerChoiceOpen(false)}>
      <Pressable style={styles.modalScrim} onPress={() => setComposerChoiceOpen(false)}><Pressable style={styles.choiceSheet} onPress={(event) => event.stopPropagation()}>
        <ScrollView keyboardShouldPersistTaps="handled">
        <Text style={styles.sheetTitle}>Create</Text>
        <CreateOption label="Post" icon="create-outline" onPress={() => { setComposerChoiceOpen(false); setComposerChoice('story'); }}/>
        <CreateOption label="Idea" icon="bulb-outline" onPress={() => { setComposerChoiceOpen(false); router.push('/ideahub/submit' as never); }}/>
        <CreateOption label="Problem" icon="help-circle-outline" onPress={() => { setComposerChoiceOpen(false); setCommunityForm('problem'); }}/>
        <CreateOption label="Project" icon="construct-outline" onPress={() => { setComposerChoiceOpen(false); setComposerChoice('project'); }}/>
        <CreateOption label="Help Request" icon="hand-right-outline" onPress={() => { setComposerChoiceOpen(false); setCommunityForm('help'); }}/>
        <CreateOption label="PDF / Resource" icon="document-text-outline" onPress={() => { setComposerChoiceOpen(false); router.push('/share-resource' as never); }}/>
        <CreateOption label="Survey / Poll" icon="stats-chart-outline" onPress={() => { setComposerChoiceOpen(false); router.push('/poll/create' as never); }}/>
        <TouchableOpacity accessibilityRole="button" style={styles.cancel} onPress={() => setComposerChoiceOpen(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
        </ScrollView>
      </Pressable></Pressable>
    </Modal>
    {composerChoice ? <PostComposerModal key={composerChoice} visible initialType={composerChoice} allowedTypes={[composerChoice]} onClose={() => setComposerChoice(null)} onSubmit={submitPost} /> : null}
    {communityForm ? <CommunityRecordComposer key={communityForm} visible kind={communityForm} onClose={() => setCommunityForm(null)} onSubmit={submitCommunityRecord} /> : null}
    <Modal visible={Boolean(collaborationPost)} transparent animationType="fade" onRequestClose={() => setCollaborationPost(null)}>
      <Pressable style={styles.modalScrim} onPress={() => setCollaborationPost(null)}><Pressable style={styles.collaborationSheet} onPress={(event) => event.stopPropagation()}>
        <Text style={styles.sheetTitle}>Request to collaborate</Text>
        <Text style={styles.emptyText}>{collaborationPost?.title}</Text>
        <TextInput accessibilityLabel="Collaboration request message" value={collaborationNote} onChangeText={setCollaborationNote} placeholder="Introduce yourself and what you can contribute" placeholderTextColor={Colors.textMuted} multiline maxLength={600} style={styles.collaborationInput}/>
        <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: collaborationBusy || !collaborationNote.trim() }} disabled={collaborationBusy || !collaborationNote.trim()} onPress={() => void submitCollaborationRequest()} style={styles.sendRequest}><Text style={styles.sendRequestText}>{collaborationBusy ? 'Sending…' : 'Send request'}</Text></TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" onPress={() => setCollaborationPost(null)} style={styles.cancel}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
      </Pressable></Pressable>
    </Modal>
  </SafeAreaView>;
}

function sourceMatchesFilter(source: FeedSource, filter: FeedFilter) {
  return filter === 'All' || (filter === 'Ideas' && source === 'ideas') || (filter === 'Problems' && source === 'problems') || (filter === 'Help Needed' && source === 'help') || filter === 'Builds' && source === 'posts';
}

function CreateOption({ label, icon, onPress }: { label: string; icon: React.ComponentProps<typeof Ionicons>['name']; onPress: () => void }) {
  return <TouchableOpacity accessibilityRole="button" onPress={onPress} style={styles.createOption}><Ionicons name={icon} size={18} color={Colors.textMuted}/><Text style={styles.createOptionText}>{label}</Text><Ionicons name="chevron-forward" size={16} color={Colors.textMuted}/></TouchableOpacity>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  feedContent: { paddingBottom: 20, flexGrow: 1 },
  filterHeader: { width: '100%', alignSelf: 'center', backgroundColor: Colors.background, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  filterRow: { width: '100%', minHeight: 52, flexDirection: 'row', alignItems: 'center', paddingLeft: 12, paddingRight: 12, gap: 8 },
  filters: { alignItems: 'center', gap: 4, paddingVertical: 8 },
  filter: { minHeight: 36, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, borderRadius: 8 },
  filterSelected: { backgroundColor: Colors.primarySubtle, borderWidth: StyleSheet.hairlineWidth, borderColor: Colors.primaryBorder },
  filterText: { color: Colors.textMuted, fontSize: 13, lineHeight: 18 },
  filterTextSelected: { color: Colors.primary, fontWeight: Typography.semiBold },
  createButton: { minHeight: 40, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 4 },
  createText: { color: Colors.primary, fontSize: 13, fontWeight: Typography.medium },
  emptyState: { minHeight: 180, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 24 },
  emptyText: { color: Colors.textMuted, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  retryText: { color: Colors.primary, fontSize: 13, fontWeight: Typography.medium },
  footerLoading: { paddingVertical: 20 },
  footerSpace: { height: 12 },
  partialError: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  partialErrorText: { color: Colors.textMuted, fontSize: 12 },
  modalScrim: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  choiceSheet: { width: '100%', maxWidth: 560, maxHeight: '90%', alignSelf: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24, backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  collaborationSheet: { width: '100%', maxWidth: 560, alignSelf: 'center', padding: 20, backgroundColor: Colors.surface, borderRadius: 16 },
  collaborationInput: { minHeight: 104, maxHeight: 180, marginTop: 12, padding: 12, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, color: Colors.textPrimary, fontSize: 14, lineHeight: 20, textAlignVertical: 'top' },
  sendRequest: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 12, borderRadius: 8, backgroundColor: Colors.primary },
  sendRequestText: { color: Colors.textOnPrimary, fontSize: 14, fontWeight: Typography.semiBold },
  sheetTitle: { color: Colors.textPrimary, fontSize: 18, lineHeight: 24, fontWeight: Typography.semiBold, marginBottom: 8 },
  createOption: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  createOptionText: { flex: 1, color: Colors.textPrimary, fontSize: 14 },
  cancel: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  cancelText: { color: Colors.textSecondary, fontSize: 14 },
});
