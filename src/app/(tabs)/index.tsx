import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../../components/navigation/Header';
import { DemoIdeaCard } from '../../components/cards/DemoIdeaCard';
import { PostComposerModal } from '../../components/modals/PostComposerModal';
import { Avatar } from '../../components/ui/Avatar';
import { Chip } from '../../components/ui/Chip';
import { CommunityRecordComposer, CommunityDraft } from '../../components/home/CommunityRecordComposer';
import { StudentCommunityCard } from '../../components/home/StudentCommunityCard';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { Colors, Spacing, Typography } from '../../constants/theme';
import { getDemoIdeaById, getDemoIdeas, toggleDemoIdeaSpark, type DemoIdea } from '../../services/demoIdeasService';
import type { CommunityPost, CommunityPostType } from '../../types';
import { studentCommunityService, StudentHelpRequest, StudentProblem } from '../../services/studentCommunityService';

type FeedFilter = 'All' | 'Ideas' | 'Problems' | 'Builds' | 'Help Needed';
const FILTERS: FeedFilter[] = ['All', 'Ideas', 'Problems', 'Builds', 'Help Needed'];

function ideaSkeleton() { return <View style={styles.skeleton}><View style={styles.skeletonLine} /><View style={[styles.skeletonLine, { width: '66%' }]} /><View style={[styles.skeletonLine, { width: '90%' }]} /></View>; }

function PostCard({ post, onOpen }: { post: CommunityPost; onOpen: () => void }) {
  const isProblem = post.type === 'question';
  const label = isProblem ? 'PROBLEM' : 'BUILD UPDATE';
  return <TouchableOpacity accessibilityRole="button" onPress={onOpen} activeOpacity={0.86} style={styles.postCard}>
    <View style={styles.authorRow}><Avatar uri={post.author.avatar} name={post.author.name} size={38} /><View style={styles.authorCopy}><Text style={styles.authorName}>{post.author.name}</Text><Text style={styles.authorMeta} numberOfLines={1}>{[post.author.college, post.author.role].filter(Boolean).join(' · ') || 'STUDOS student'}</Text></View><View style={[styles.typeBadge, isProblem ? styles.problemBadge : styles.buildBadge]}><Text style={styles.typeBadgeText}>{label}</Text></View></View>
    <Text style={styles.postTitle}>{post.title}</Text><Text style={styles.postBody} numberOfLines={4}>{post.content}</Text>
    {!!post.tags?.length && <View style={styles.tags}>{post.tags.slice(0, 4).map((tag) => <Text key={tag} style={styles.tag}>#{tag}</Text>)}</View>}
    <View style={styles.postActions}><View style={styles.actionLabel}><Ionicons name="chatbubble-outline" size={15} color={Colors.textMuted} /><Text style={styles.actionText}>Discuss</Text></View><Text style={styles.cardAction}>{isProblem ? 'Suggest a solution' : 'Offer help'}  ›</Text></View>
  </TouchableOpacity>;
}

export default function HomeScreen() {
  const { session } = useAuth();
  const { width } = useWindowDimensions();
  const { communityPosts, refreshCommunityPosts, addCommunityPost, dataErrors, isLoading } = useApp();
  const [ideas, setIdeas] = useState<DemoIdea[]>([]);
  const [ideasLoading, setIdeasLoading] = useState(true);
  const [ideasError, setIdeasError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FeedFilter>('All');
  const [composerChoice, setComposerChoice] = useState<CommunityPostType | null>(null);
  const [showComposerChoices, setShowComposerChoices] = useState(false);
  const [busyIdea, setBusyIdea] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');
  const [problems, setProblems] = useState<StudentProblem[]>([]);
  const [helpRequests, setHelpRequests] = useState<StudentHelpRequest[]>([]);
  const [problemLoading, setProblemLoading] = useState(true);
  const [helpLoading, setHelpLoading] = useState(true);
  const [problemError, setProblemError] = useState('');
  const [helpError, setHelpError] = useState('');
  const [communityForm, setCommunityForm] = useState<'problem' | 'help' | null>(null);
  const contentWidth = Math.min(width - Spacing.screenPadding * 2, 720);

  const loadIdeas = useCallback(async () => {
    setIdeasLoading(true); setIdeasError('');
    try { const result = await getDemoIdeas({ limit: 20 }); setIdeas(result.items); }
    catch (error) { if (__DEV__) console.warn('[Supabase query failed]', { feature: 'Home community ideas', relation: 'student_ideas', ...(error as object) }); setIdeasError('Ideas could not be loaded. Retry this section.'); }
    finally { setIdeasLoading(false); }
  }, []);
  useEffect(() => { const timer = setTimeout(() => { void loadIdeas(); }, 0); return () => clearTimeout(timer); }, [loadIdeas]);

  const loadCommunityRecords = useCallback(async () => {
    setProblemLoading(true); setHelpLoading(true); setProblemError(''); setHelpError('');
    const [problemResult, helpResult] = await Promise.allSettled([studentCommunityService.problems(), studentCommunityService.helpRequests()]);
    if (problemResult.status === 'fulfilled') setProblems(problemResult.value); else { setProblemError(problemResult.reason instanceof Error ? problemResult.reason.message : 'Problems could not be loaded.'); setProblems([]); }
    if (helpResult.status === 'fulfilled') setHelpRequests(helpResult.value); else { setHelpError(helpResult.reason instanceof Error ? helpResult.reason.message : 'Help requests could not be loaded.'); setHelpRequests([]); }
    setProblemLoading(false); setHelpLoading(false);
  }, []);
  useEffect(() => { const timer = setTimeout(() => { void loadCommunityRecords(); }, 0); return () => clearTimeout(timer); }, [loadCommunityRecords]);

  const feedPosts = useMemo(() => communityPosts.filter((post) => post.type === 'question' || post.type === 'project'), [communityPosts]);
  const filteredIdeas = filter === 'All' || filter === 'Ideas' ? ideas : [];
  const filteredProblems = filter === 'All' || filter === 'Problems' ? problems : [];
  const filteredHelp = filter === 'All' || filter === 'Help Needed' ? helpRequests : [];
  const filteredPosts = feedPosts.filter((post) => filter === 'All' || (filter === 'Problems' && post.type === 'question') || (filter === 'Builds' && post.type === 'project') || (filter === 'Help Needed' && Boolean(post.skills?.length || post.rolesNeeded?.length || post.tags?.some((tag) => /help|looking[- ]for/i.test(tag)))));
  const refresh = async () => { setRefreshing(true); await Promise.allSettled([loadIdeas(), refreshCommunityPosts(), loadCommunityRecords()]); setRefreshing(false); };

  const onSpark = async (idea: DemoIdea) => {
    if (!session?.user.id) { setActionError('Sign in to Spark ideas.'); return; }
    if (busyIdea || idea.sparkCount == null) return;
    setBusyIdea(idea.id); setActionError('');
    try { await toggleDemoIdeaSpark(idea.id, session.user.id); const next = await getDemoIdeaById(idea.id); if (next) setIdeas((rows) => rows.map((row) => row.id === idea.id ? next : row)); }
    catch (error) { setActionError(error instanceof Error ? error.message : 'Spark could not be saved.'); }
    finally { setBusyIdea(null); }
  };

  const openPost = (post: CommunityPost) => router.push({ pathname: '/post/[id]', params: { id: post.id } } as never);
  const noEntries = !ideasLoading && !ideasError && !problemLoading && !problemError && !helpLoading && !helpError && filteredIdeas.length === 0 && filteredPosts.length === 0 && filteredProblems.length === 0 && filteredHelp.length === 0;

  const submitCommunityRecord = async (draft: CommunityDraft) => {
    if (communityForm === 'problem') {
      const created = await studentCommunityService.createProblem(draft);
      setProblems((rows) => [created, ...rows]);
      setCommunityForm(null);
      return;
    }
    if (communityForm === 'help') {
      const created = await studentCommunityService.createHelpRequest(draft);
      setHelpRequests((rows) => [created, ...rows]);
      setCommunityForm(null);
    }
  };

  return <SafeAreaView style={styles.safe} edges={['top']}>
    <Header />
    <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={Colors.primary} colors={[Colors.primary]} />} contentContainerStyle={styles.scroll}>
      <View style={[styles.content, { width: contentWidth }]}>
        <View style={styles.greeting}><Text style={styles.greetingTitle}>What are students building?</Text><Text style={styles.greetingSub}>Share ideas, solve real problems, and find people to build with.</Text></View>
        <TouchableOpacity accessibilityRole="button" onPress={() => session ? setShowComposerChoices(true) : router.push('/login' as never)} activeOpacity={0.84} style={styles.composerPrompt}>
          <View style={styles.composerIcon}><Ionicons name="create-outline" size={21} color={Colors.primary} /></View><Text style={styles.composerText}>What are you working on?</Text><Ionicons name="arrow-forward" size={18} color={Colors.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" onPress={() => router.push('/(tabs)/study' as never)} activeOpacity={0.82} style={styles.studyShortcut}>
          <View style={styles.studyIcon}><Ionicons name="book-outline" size={19} color={Colors.primary} /></View><View style={styles.studyCopy}><Text style={styles.studyTitle}>Exam prep?</Text><Text style={styles.studySubtitle}>Find your study materials</Text></View><Text style={styles.studyAction}>Open Study Hub  ›</Text>
        </TouchableOpacity>

        <View style={styles.feedHeading}><View><Text style={styles.sectionTitle}>Student community</Text><Text style={styles.sectionSubtitle}>Ideas, problems and work in progress</Text></View></View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>{FILTERS.map((item) => <Chip key={item} label={item} selected={filter === item} onPress={() => setFilter(item)} />)}</ScrollView>
        {actionError ? <TouchableOpacity accessibilityRole="button" onPress={() => setActionError('')} style={styles.errorBox}><Text style={styles.errorText}>{actionError}</Text><Ionicons name="close" size={16} color={Colors.error} /></TouchableOpacity> : null}
        {isLoading && !communityPosts.length && !ideasLoading ? <View style={styles.state}><Text style={styles.stateText}>Loading community posts…</Text></View> : null}
        {!isLoading && dataErrors.posts ? <View style={styles.state}><Text style={styles.stateText}>Community posts could not be loaded.</Text><TouchableOpacity accessibilityRole="button" onPress={() => void refreshCommunityPosts().catch(() => undefined)}><Text style={styles.retry}>Retry posts</Text></TouchableOpacity></View> : null}
        {ideasLoading && (filter === 'All' || filter === 'Ideas') ? <View accessibilityLabel="Loading community ideas">{ideaSkeleton()}{ideaSkeleton()}</View> : null}
        {!ideasLoading && ideasError && (filter === 'All' || filter === 'Ideas') ? <View style={styles.state}><Text style={styles.stateText}>{ideasError}</Text><TouchableOpacity accessibilityRole="button" onPress={() => void loadIdeas()}><Text style={styles.retry}>Retry ideas</Text></TouchableOpacity></View> : null}
        {filteredIdeas.map((idea) => <DemoIdeaCard key={`idea-${idea.id}`} idea={idea} busy={busyIdea === idea.id} onSpark={() => void onSpark(idea)} onOpen={() => router.push({ pathname: '/ideahub/[id]', params: { id: idea.id, isDemo: 'true' } } as never)} />)}
        {(filter === 'All' || filter === 'Problems') && (problemLoading ? <View accessibilityLabel="Loading problems">{ideaSkeleton()}</View> : problemError ? <View style={styles.state}><Text style={styles.stateText}>Problems could not be loaded: {problemError}</Text><TouchableOpacity accessibilityRole="button" onPress={() => void loadCommunityRecords()}><Text style={styles.retry}>Retry problems</Text></TouchableOpacity></View> : filteredProblems.map((problem) => <StudentCommunityCard key={`problem-${problem.id}`} kind="problem" record={problem} onOpen={() => router.push({ pathname: '/community/[kind]/[id]', params: { kind: 'problem', id: problem.id } } as never)} />))}
        {(filter === 'All' || filter === 'Help Needed') && (helpLoading ? <View accessibilityLabel="Loading help requests">{ideaSkeleton()}</View> : helpError ? <View style={styles.state}><Text style={styles.stateText}>Help requests could not be loaded: {helpError}</Text><TouchableOpacity accessibilityRole="button" onPress={() => void loadCommunityRecords()}><Text style={styles.retry}>Retry help requests</Text></TouchableOpacity></View> : filteredHelp.map((help) => <StudentCommunityCard key={`help-${help.id}`} kind="help" record={help} onOpen={() => router.push({ pathname: '/community/[kind]/[id]', params: { kind: 'help', id: help.id } } as never)} />))}
        {filteredPosts.map((post) => <PostCard key={`post-${post.id}`} post={post} onOpen={() => openPost(post)} />)}
        {noEntries ? <View style={styles.state}><Text style={styles.stateText}>Nothing here yet. Share the first idea or question.</Text></View> : null}
      </View>
    </ScrollView>

    <Modal visible={showComposerChoices} transparent animationType="slide" onRequestClose={() => setShowComposerChoices(false)}>
      <View style={styles.modalScrim}><View style={styles.choiceSheet}><View style={styles.sheetHandle} /><Text style={styles.sheetTitle}>Share with the community</Text><Text style={styles.sheetSubtitle}>Choose what you want to post.</Text>
        <TouchableOpacity style={styles.choiceRow} onPress={() => { setShowComposerChoices(false); router.push('/ideahub/submit' as never); }}><View style={styles.choiceIcon}><Ionicons name="bulb-outline" size={20} color={Colors.primary} /></View><View style={styles.choiceCopy}><Text style={styles.choiceTitle}>Share an Idea</Text><Text style={styles.choiceSub}>Present an original idea to build together</Text></View><Ionicons name="chevron-forward" size={18} color={Colors.textMuted} /></TouchableOpacity>
        <TouchableOpacity style={styles.choiceRow} onPress={() => { setShowComposerChoices(false); setCommunityForm('problem'); }}><View style={styles.choiceIcon}><Ionicons name="help-circle-outline" size={20} color={Colors.info} /></View><View style={styles.choiceCopy}><Text style={styles.choiceTitle}>Post a Problem</Text><Text style={styles.choiceSub}>Ask the community for a solution</Text></View><Ionicons name="chevron-forward" size={18} color={Colors.textMuted} /></TouchableOpacity>
        <TouchableOpacity style={styles.choiceRow} onPress={() => { setShowComposerChoices(false); setCommunityForm('help'); }}><View style={styles.choiceIcon}><Ionicons name="hand-right-outline" size={20} color={Colors.primary} /></View><View style={styles.choiceCopy}><Text style={styles.choiceTitle}>Ask for Help</Text><Text style={styles.choiceSub}>Describe the skills and support you need</Text></View><Ionicons name="chevron-forward" size={18} color={Colors.textMuted} /></TouchableOpacity>
        <TouchableOpacity style={styles.choiceRow} onPress={() => { setShowComposerChoices(false); setComposerChoice('project'); }}><View style={styles.choiceIcon}><Ionicons name="rocket-outline" size={20} color={Colors.accentGreen} /></View><View style={styles.choiceCopy}><Text style={styles.choiceTitle}>Share a Build Update</Text><Text style={styles.choiceSub}>Show what you are working on</Text></View><Ionicons name="chevron-forward" size={18} color={Colors.textMuted} /></TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" style={styles.cancel} onPress={() => setShowComposerChoices(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
      </View></View>
    </Modal>
    {composerChoice ? <PostComposerModal key={composerChoice} visible initialType={composerChoice} allowedTypes={[composerChoice]} onClose={() => setComposerChoice(null)} onSubmit={addCommunityPost} /> : null}
    {communityForm ? <CommunityRecordComposer key={communityForm} visible kind={communityForm} onClose={() => setCommunityForm(null)} onSubmit={submitCommunityRecord} /> : null}
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background }, scroll: { paddingBottom: 30 }, content: { alignSelf: 'center', paddingHorizontal: Spacing.screenPadding, paddingTop: 17 },
  greeting: { marginBottom: 15 }, greetingTitle: { color: Colors.textPrimary, fontSize: 23, lineHeight: 29, fontWeight: Typography.bold, letterSpacing: -0.4 }, greetingSub: { color: Colors.textMuted, fontSize: 13, lineHeight: 19, marginTop: 4 },
  composerPrompt: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 13, backgroundColor: Colors.surface, borderRadius: 15, borderWidth: 1, borderColor: Colors.border }, composerIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: Colors.primarySubtle, alignItems: 'center', justifyContent: 'center' }, composerText: { flex: 1, color: Colors.textMuted, fontSize: 14 },
  studyShortcut: { minHeight: 62, marginTop: 10, marginBottom: 24, paddingHorizontal: 12, borderRadius: 14, backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.border, flexDirection: 'row', alignItems: 'center', gap: 10 }, studyIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: Colors.primarySubtle, alignItems: 'center', justifyContent: 'center' }, studyCopy: { flex: 1 }, studyTitle: { color: Colors.textPrimary, fontSize: 13, fontWeight: Typography.semiBold }, studySubtitle: { color: Colors.textMuted, fontSize: 11, marginTop: 2 }, studyAction: { color: Colors.primary, fontSize: 11, fontWeight: Typography.semiBold },
  feedHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, sectionTitle: { color: Colors.textPrimary, fontSize: 18, lineHeight: 24, fontWeight: Typography.bold }, sectionSubtitle: { color: Colors.textMuted, fontSize: 12, marginTop: 2 }, filters: { gap: 7, paddingVertical: 12, paddingBottom: 15 },
  skeleton: { padding: 16, marginBottom: 12, gap: 10, borderRadius: 15, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border }, skeletonLine: { height: 10, width: '78%', borderRadius: 6, backgroundColor: Colors.border },
  postCard: { padding: 15, marginBottom: 12, borderRadius: 16, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border }, authorRow: { flexDirection: 'row', alignItems: 'center', gap: 9 }, authorCopy: { flex: 1, minWidth: 0 }, authorName: { color: Colors.textPrimary, fontSize: 13, fontWeight: Typography.semiBold }, authorMeta: { color: Colors.textMuted, fontSize: 11, marginTop: 2 }, typeBadge: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 7 }, problemBadge: { backgroundColor: Colors.info + '22' }, buildBadge: { backgroundColor: Colors.accentGreen + '22' }, typeBadgeText: { fontSize: 9, letterSpacing: 0.5, fontWeight: Typography.bold, color: Colors.textSecondary }, postTitle: { color: Colors.textPrimary, fontSize: 16, lineHeight: 22, fontWeight: Typography.bold, marginTop: 14 }, postBody: { color: Colors.textSecondary, fontSize: 13, lineHeight: 20, marginTop: 6 }, tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 11 }, tag: { color: Colors.primary, fontSize: 11 }, postActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 11, marginTop: 13 }, actionLabel: { flexDirection: 'row', alignItems: 'center', gap: 5 }, actionText: { color: Colors.textMuted, fontSize: 11 }, cardAction: { color: Colors.primary, fontSize: 11, fontWeight: Typography.semiBold },
  state: { alignItems: 'center', gap: 10, padding: 20, marginBottom: 12, backgroundColor: Colors.surface, borderRadius: 15, borderWidth: 1, borderColor: Colors.border }, stateText: { color: Colors.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 19 }, retry: { color: Colors.primary, fontSize: 12, fontWeight: Typography.bold }, errorBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: 11, marginBottom: 10, borderRadius: 11, backgroundColor: Colors.errorSubtle }, errorText: { flex: 1, color: Colors.error, fontSize: 12 },
  modalScrim: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' }, choiceSheet: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24, backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24 }, sheetHandle: { width: 38, height: 4, borderRadius: 2, backgroundColor: Colors.textSubtle, alignSelf: 'center', marginBottom: 18 }, sheetTitle: { color: Colors.textPrimary, fontSize: 19, fontWeight: Typography.bold }, sheetSubtitle: { color: Colors.textMuted, fontSize: 12, marginTop: 4, marginBottom: 10 }, choiceRow: { flexDirection: 'row', alignItems: 'center', gap: 11, minHeight: 68, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border }, choiceIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' }, choiceCopy: { flex: 1 }, choiceTitle: { color: Colors.textPrimary, fontSize: 14, fontWeight: Typography.semiBold }, choiceSub: { color: Colors.textMuted, fontSize: 11, marginTop: 3 }, cancel: { minHeight: 46, marginTop: 12, alignItems: 'center', justifyContent: 'center' }, cancelText: { color: Colors.textSecondary, fontSize: 13, fontWeight: Typography.semiBold },
});
