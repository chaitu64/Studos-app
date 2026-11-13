import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Linking, Modal, Platform, Share,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { safeBack } from '@/navigation/safeBack';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Colors, Spacing, Typography, BorderRadius } from '../../constants/theme';
import { useApp } from '../../context/AppContext';
import { sharedContentService } from '../../services/sharedContentService';
import { chatService, chatRequestsEnabled } from '../../services/chatService';
import { supabaseConfigured } from '../../services/supabase';
import { studentIdeaBookmarksService } from '../../services/studentIdeaBookmarksService';
import {
  getDemoIdeaById,
  getDemoIdeaComments,
  addDemoIdeaComment,
  toggleDemoIdeaSpark,
  requestDemoIdeaCollaboration,
  getDemoIdeaCollaborators,
  DemoIdeaCollaborator,
} from '../../services/demoIdeasService';
import type { Idea, IdeaComment } from '../../types';

function relativeTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60_000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1_440) return `${Math.floor(minutes / 60)}h ago`;
  if (minutes < 43_200) return `${Math.floor(minutes / 1_440)}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function safeUrl(value: string) {
  try { const url = new URL(value); return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null; }
  catch { return null; }
}

export default function IdeaDetailScreen() {
  const { id = '', isDemo = '' } = useLocalSearchParams<{ id: string; isDemo?: string }>();
  const { ideas, isLoading, user, toggleUpvoteIdea, toggleBookmarkIdea, addIdeaComment } = useApp();
  const contextIdea = ideas.find((entry) => entry.id === id);
  const [remote, setRemote] = useState<{ id: string; idea: Idea | null; isDemoIdea?: boolean } | null>(null);
  const [ideaLoadError, setIdeaLoadError] = useState('');
  const [ideaReload, setIdeaReload] = useState(0);

  const idea = contextIdea || (remote?.id === id ? remote.idea : null);
  const isDemoIdea = isDemo === 'true' || Boolean(remote?.isDemoIdea);

  const [comments, setComments] = useState<IdeaComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [commentBusy, setCommentBusy] = useState(false);
  const [commentError, setCommentError] = useState('');
  const [engagement, setEngagement] = useState<{ sparkCount: number; commentCount: number; isSparkedByViewer: boolean; isSavedByViewer: boolean } | null>(null);
  const [actionBusy, setActionBusy] = useState<'spark' | 'save' | 'report' | 'collab' | ''>('');
  const [bookmarkAvailable, setBookmarkAvailable] = useState(true);
  const [moreActionsVisible, setMoreActionsVisible] = useState(false);

  const [collaborators, setCollaborators] = useState<DemoIdeaCollaborator[]>([]);
  const [collabModalVisible, setCollabModalVisible] = useState(false);
  const [collabMessage, setCollabMessage] = useState('');
  const [requestStatus, setRequestStatus] = useState<'pending' | 'accepted' | 'rejected' | null>(null);

  useEffect(() => {
    if (contextIdea || !id || !supabaseConfigured) return;
    let active = true;

    async function load() {
      // First check if marked as demo or try demo idea
      if (isDemo === 'true') {
        try {
          const demoRow = await getDemoIdeaById(id);
          if (!active) return;
          if (demoRow) {
            setIdeaLoadError('');
            setRequestStatus(demoRow.requestStatus);
            const mappedIdea: Idea = {
              id: demoRow.id,
              title: demoRow.title,
              tagline: demoRow.ideaType ? `${demoRow.ideaType} · ${demoRow.category || 'Idea'}` : (demoRow.category || ''),
              problemStatement: demoRow.description,
              proposedSolution: '',
              targetAudience: '',
              category: (demoRow.category || 'Other') as any,
              ideaType: demoRow.ideaType || undefined,
              stage: (demoRow.stage || 'Concept') as any,
              visibility: 'Public',
              requiredSkills: demoRow.skillsNeeded || [],
              rolesNeeded: [],
              roadmap: [],
              teamSizeNeeded: 4,
              currentTeamSize: demoRow.collaboratorCount || 1,
              tags: demoRow.tags || [],
              upvotes: demoRow.sparkCount || 0,
              commentsCount: demoRow.commentCount || 0,
              createdAt: demoRow.createdAt,
              isUpvoted: demoRow.isSparkedByViewer,
              isBookmarked: demoRow.isSavedByViewer,
              collaborationOpen: demoRow.collaborationOpen,
              creator: {
                id: demoRow.author.id || '',
                name: demoRow.author.name,
                avatar: demoRow.author.avatarUrl || '',
                college: demoRow.author.college || '',
                role: demoRow.author.branch || '',
                studyYear: demoRow.author.studyYear ? `Year ${demoRow.author.studyYear}` : undefined,
                identity: demoRow.author.identity,
              },
            };
            setRemote({ id, idea: mappedIdea, isDemoIdea: true });
            return;
          }
        } catch {
          // fall through to sharedContentService
        }
      }

      try {
        const rows = await sharedContentService.list<Idea>('ideas', { ids: [id] });
        if (!active) return;
        if (rows[0]) {
          setIdeaLoadError('');
          setRemote({ id, idea: rows[0], isDemoIdea: false });
        } else {
          // Fallback to demo idea lookup
          const demoRow = await getDemoIdeaById(id);
          if (!active) return;
          if (demoRow) {
            setIdeaLoadError('');
            setRequestStatus(demoRow.requestStatus);
            const mappedIdea: Idea = {
              id: demoRow.id,
              title: demoRow.title,
              tagline: demoRow.ideaType ? `${demoRow.ideaType} · ${demoRow.category || 'Idea'}` : (demoRow.category || ''),
              problemStatement: demoRow.description,
              proposedSolution: '',
              targetAudience: '',
              category: (demoRow.category || 'Other') as any,
              ideaType: demoRow.ideaType || undefined,
              stage: (demoRow.stage || 'Concept') as any,
              visibility: 'Public',
              requiredSkills: demoRow.skillsNeeded || [],
              rolesNeeded: [],
              roadmap: [],
              teamSizeNeeded: 4,
              currentTeamSize: demoRow.collaboratorCount || 1,
              tags: demoRow.tags || [],
              upvotes: demoRow.sparkCount || 0,
              commentsCount: demoRow.commentCount || 0,
              createdAt: demoRow.createdAt,
              isUpvoted: demoRow.isSparkedByViewer,
              isBookmarked: demoRow.isSavedByViewer,
              collaborationOpen: demoRow.collaborationOpen,
              creator: {
                id: demoRow.author.id || '',
                name: demoRow.author.name,
                avatar: demoRow.author.avatarUrl || '',
                college: demoRow.author.college || '',
                role: demoRow.author.branch || '',
                studyYear: demoRow.author.studyYear ? `Year ${demoRow.author.studyYear}` : undefined,
                identity: demoRow.author.identity,
              },
            };
            setRemote({ id, idea: mappedIdea, isDemoIdea: true });
          } else {
            setIdeaLoadError('This idea could not be loaded. Check your connection and try again.');
            setRemote({ id, idea: null });
          }
        }
      } catch {
        if (active) {
          setIdeaLoadError('This idea could not be loaded. Check your connection and try again.');
          setRemote({ id, idea: null });
        }
      }
    }

    void load();
    return () => { active = false; };
  }, [id, contextIdea, isDemo, ideaReload]);

  const loadComments = useCallback(async () => {
    if (!id || !supabaseConfigured) { setCommentsLoading(false); return; }
    setCommentsLoading(true); setCommentError('');
    try {
      if (isDemoIdea) {
        const demoComments = await getDemoIdeaComments(id);
        setComments(demoComments.map((c) => ({
          id: c.id,
          userId: c.authorId,
          userName: c.authorName,
          userAvatar: c.avatarUrl || '',
          userRole: c.branch || '',
          content: c.body,
          createdAt: c.createdAt,
          likes: 0,
        })));
      } else {
        setComments(await sharedContentService.ideaComments(id));
      }
    }
    catch (cause) { setCommentError(cause instanceof Error ? cause.message : 'Comments could not be loaded.'); }
    finally { setCommentsLoading(false); }
  }, [id, isDemoIdea]);

  const loadEngagement = useCallback(async () => {
    if (!id || !supabaseConfigured) return;
    try {
      if (isDemoIdea) {
        const demoIdea = await getDemoIdeaById(id);
        if (demoIdea) {
          let isSavedByViewer = false;
          try {
            isSavedByViewer = await studentIdeaBookmarksService.isSaved(id);
            setBookmarkAvailable(true);
          } catch (cause) {
            setBookmarkAvailable(false);
            if (__DEV__) console.warn('[Idea bookmark] Persistent bookmarks unavailable. Apply migration 009.', cause);
          }
          setEngagement({
            sparkCount: demoIdea.sparkCount ?? 0,
            commentCount: demoIdea.commentCount ?? 0,
            isSparkedByViewer: demoIdea.isSparkedByViewer,
            isSavedByViewer,
          });
          setRequestStatus(demoIdea.requestStatus);
        }
      } else {
        setEngagement(await sharedContentService.ideaEngagement(id));
      }
    }
    catch { setEngagement(null); }
  }, [id, isDemoIdea]);

  const loadCollaborators = useCallback(async () => {
    if (!id || !isDemoIdea || !supabaseConfigured) return;
    try {
      setCollaborators(await getDemoIdeaCollaborators(id));
    } catch {
      setCollaborators([]);
    }
  }, [id, isDemoIdea]);

  useEffect(() => { void Promise.resolve().then(loadComments); }, [loadComments]);
  useEffect(() => { void Promise.resolve().then(loadEngagement); }, [loadEngagement]);
  useEffect(() => { void Promise.resolve().then(loadCollaborators); }, [loadCollaborators]);

  const shareIdea = async () => {
    if (!idea) return;
    const shareUrl = Platform.OS === 'web' && typeof window !== 'undefined'
      ? `${window.location.origin}/ideahub/${encodeURIComponent(idea.id)}?isDemo=${isDemoIdea ? 'true' : 'false'}`
      : `studos://ideahub/${encodeURIComponent(idea.id)}?isDemo=${isDemoIdea ? 'true' : 'false'}`;
    const message = `${idea.title}\n\n${shareUrl}`;
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title: idea.title, text: idea.tagline || idea.problemStatement, url: shareUrl });
      } else if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        Alert.alert('Link copied', 'The idea link is ready to share.');
      } else {
        await Share.share({ title: idea.title, message });
      }
    }
    catch { Alert.alert('Could not share idea', 'Please try again.'); }
  };

  const toggleSpark = async () => {
    if (!idea || actionBusy) return;
    const prior = engagement;
    const wasSparked = engagement?.isSparkedByViewer ?? Boolean(idea.isUpvoted);
    setActionBusy('spark');
    setEngagement((current) => {
      const base = current || { sparkCount: idea.upvotes || 0, commentCount: idea.commentsCount || 0, isSparkedByViewer: wasSparked, isSavedByViewer: Boolean(idea.isBookmarked) };
      return { ...base, isSparkedByViewer: !wasSparked, sparkCount: Math.max(0, base.sparkCount + (wasSparked ? -1 : 1)) };
    });
    try {
      if (isDemoIdea) {
        await toggleDemoIdeaSpark(idea.id, user.id);
      } else {
        await toggleUpvoteIdea(idea.id);
      }
      await loadEngagement();
    }
    catch (cause) {
      setEngagement(prior);
      Alert.alert('Spark not updated', cause instanceof Error ? cause.message : 'Please try again.');
    }
    finally { setActionBusy(''); }
  };

  const toggleSave = async () => {
    if (!idea || actionBusy) return;
    const prior = engagement;
    const wasSaved = engagement?.isSavedByViewer ?? Boolean(idea.isBookmarked);
    setActionBusy('save');
    setEngagement((current) => ({
      ...(current || { sparkCount: idea.upvotes || 0, commentCount: idea.commentsCount || 0, isSparkedByViewer: Boolean(idea.isUpvoted), isSavedByViewer: wasSaved }),
      isSavedByViewer: !wasSaved,
    }));
    try {
      if (isDemoIdea) {
        if (!bookmarkAvailable) throw new Error('Idea bookmarks are unavailable until the secure bookmark migration is applied.');
        await studentIdeaBookmarksService.toggle(idea.id);
      } else {
        await toggleBookmarkIdea(idea.id);
      }
      await loadEngagement();
    }
    catch (cause) {
      setEngagement(prior);
      Alert.alert('Idea not saved', cause instanceof Error ? cause.message : 'Please try again.');
    }
    finally { setActionBusy(''); }
  };

  const submitComment = async () => {
    const content = commentText.trim();
    if (!idea || !content || commentBusy) return;
    setCommentBusy(true); setCommentError('');
    try {
      if (isDemoIdea) {
        const savedDemo = await addDemoIdeaComment(idea.id, content);
        setComments((current) => [...current, {
          id: savedDemo.id,
          userId: savedDemo.authorId,
          userName: savedDemo.authorName,
          userAvatar: savedDemo.avatarUrl || '',
          userRole: savedDemo.branch || '',
          content: savedDemo.body,
          createdAt: savedDemo.createdAt,
          likes: 0,
        }]);
      } else {
        const saved = await addIdeaComment(idea.id, content);
        setComments((current) => [...current, saved]);
      }
      setCommentText('');
      await loadEngagement();
    }
    catch (cause) { setCommentError(cause instanceof Error ? cause.message : 'Your comment was not posted. Try again.'); }
    finally { setCommentBusy(false); }
  };

  const handleSendCollaborationRequest = async () => {
    if (!collabMessage.trim() || !idea || actionBusy) return;
    setActionBusy('collab');
    try {
      await requestDemoIdeaCollaboration(idea.id, collabMessage.trim());
      setRequestStatus('pending');
      setCollabModalVisible(false);
      setCollabMessage('');
      Alert.alert('Request Sent', 'Your request to collaborate has been submitted.');
    } catch (cause) {
      Alert.alert('Could not submit request', cause instanceof Error ? cause.message : 'Please try again.');
    } finally {
      setActionBusy('');
    }
  };

  const reportIdea = () => {
    if (!idea || actionBusy) return;
    Alert.alert('Report this idea', 'Choose the closest reason. Your report is sent privately to the STUDOS moderation team.', [
      { text: 'Cancel', style: 'cancel' },
      ...(['Spam', 'Misleading', 'Inappropriate'] as const).map((reason) => ({ text: reason, onPress: () => {
        setActionBusy('report');
        void sharedContentService.reportIdea(idea.id, reason.toLowerCase()).then(() => Alert.alert('Report sent', 'Thank you for helping keep STUDOS useful.')).catch((cause) => Alert.alert('Report not sent', cause instanceof Error ? cause.message : 'Please try again.')).finally(() => setActionBusy(''));
      } })),
    ]);
  };

  const messageAuthor = async () => {
    const author = idea?.creator;
    if (!author || author.identity?.type !== 'real' || author.id === user.id) return;
    setMoreActionsVisible(false);
    try {
      const conversationId = await chatService.existingConversation(author.id);
      if (conversationId) router.push({ pathname: '/chat/[id]', params: { id: conversationId } } as never);
      else if (chatRequestsEnabled) router.push({ pathname: '/messages', params: { recipient: author.id } } as never);
      else Alert.alert('Messaging setup required', 'Chat requests are not available until the reviewed database migration is deployed and verified.');
    } catch (cause) {
      Alert.alert('Could not open chat', cause instanceof Error ? cause.message : 'Please try again.');
    }
  };

  const authorProfile = () => {
    if (!idea?.creator.identity) return;
    router.push(`/student/${idea.creator.identity.type}/${idea.creator.identity.id}` as never);
  };

  if (!idea) return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.topBar}><TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" onPress={() => safeBack()} style={styles.iconButton}><Ionicons name="arrow-back" size={22} color={Colors.textPrimary} /></TouchableOpacity><Text style={styles.topBarTitle} numberOfLines={1}>Idea Details</Text><View style={styles.topBarSpacer} /></View>
      <View style={styles.centerState}>{isLoading || (remote?.id !== id && supabaseConfigured) ? <ActivityIndicator color={Colors.primary} /> : <><Ionicons name={ideaLoadError ? 'cloud-offline-outline' : 'bulb-outline'} size={34} color={Colors.textMuted} /><Text style={styles.emptyTitle}>{ideaLoadError ? 'Unable to load idea' : 'Idea not found'}</Text><Text style={styles.muted}>{ideaLoadError || 'It may have been removed or is no longer available.'}</Text>{ideaLoadError ? <Button title="Try again" onPress={() => { setRemote(null); setIdeaReload((value) => value + 1); }} /> : null}<Button title="Back to ideas" variant={ideaLoadError ? 'outline' : 'primary'} onPress={() => safeBack()} /></>}</View>
    </SafeAreaView>
  );

  const description = [idea.problemStatement, idea.proposedSolution ? `Proposed solution\n${idea.proposedSolution}` : '', idea.targetAudience ? `Who it helps\n${idea.targetAudience}` : ''].filter(Boolean).join('\n\n');
  const sparkCount = engagement?.sparkCount ?? idea.upvotes ?? 0;
  const commentCount = engagement?.commentCount ?? idea.commentsCount ?? comments.length;
  const sparked = engagement?.isSparkedByViewer ?? Boolean(idea.isUpvoted);
  const saved = engagement?.isSavedByViewer ?? Boolean(idea.isBookmarked);
  const resources = (idea.resources || []).map((resource) => ({ ...resource, url: safeUrl(resource.url) })).filter((resource): resource is { label: string; url: string } => Boolean(resource.url));

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" onPress={() => safeBack()} style={styles.iconButton}><Ionicons name="arrow-back" size={22} color={Colors.textPrimary} /></TouchableOpacity>
        <Text style={styles.topBarTitle} numberOfLines={1}>Idea Details</Text>
        <View style={styles.topActions}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={saved ? 'Remove saved idea' : 'Save idea'} accessibilityState={{ selected: saved, disabled: actionBusy === 'save' || !bookmarkAvailable }} disabled={actionBusy === 'save' || !bookmarkAvailable} onPress={() => { void toggleSave(); }} style={styles.iconButton}>{actionBusy === 'save' ? <ActivityIndicator size="small" color={Colors.primary} /> : <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={20} color={saved ? Colors.primary : bookmarkAvailable ? Colors.textPrimary : Colors.textMuted} />}</TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Share idea" onPress={() => { void shareIdea(); }} style={styles.iconButton}><Ionicons name="share-outline" size={20} color={Colors.textPrimary} /></TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="More idea actions" onPress={() => setMoreActionsVisible(true)} style={styles.iconButton}><Ionicons name="ellipsis-horizontal" size={21} color={Colors.textPrimary} /></TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 4 : 0}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={`View ${idea.creator.name}'s profile`} onPress={authorProfile} style={styles.authorRow}>
            <Avatar uri={idea.creator.avatar} name={idea.creator.name} size={48} />
            <View style={styles.authorCopy}>
              <Text style={styles.authorName}>{idea.creator.name}</Text>
              <Text style={styles.authorMeta}>{[idea.creator.college, idea.creator.role, idea.creator.studyYear].filter(Boolean).join(' · ')}</Text>
              <Text style={styles.posted}>{relativeTime(idea.createdAt)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={17} color={Colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.classifications}>
            <View style={styles.ideaMark}><Ionicons name="bulb-outline" size={15} color={Colors.primary} /><Text style={styles.ideaMarkText}>STUDENT IDEA</Text></View>
            {idea.category ? <View style={styles.metaChip}><Text style={styles.metaChipText}>{idea.category}</Text></View> : null}
            {idea.ideaType ? <View style={styles.metaChip}><Text style={styles.metaChipText}>{idea.ideaType}</Text></View> : null}
            {idea.stage ? <View style={styles.metaChip}><Text style={styles.metaChipText}>{idea.stage}</Text></View> : null}
          </View>

          <Text accessibilityRole="header" style={styles.title}>{idea.title}</Text>
          {idea.tagline ? <Text style={styles.tagline}>{idea.tagline}</Text> : null}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>THE IDEA</Text>
            <Text selectable style={styles.description}>{description || idea.tagline || 'The author has not added a description yet.'}</Text>
          </View>

          {idea.requiredSkills.length ? <View style={styles.section}>
            <Text style={styles.sectionTitle}>SKILLS TO BUILD THIS</Text>
            <View style={styles.chips}>{idea.requiredSkills.map((skill) => <View key={skill} style={styles.skillChip}><Text style={styles.skillText}>{skill}</Text></View>)}</View>
          </View> : null}

          {idea.tags.length ? <View style={styles.section}>
            <Text style={styles.sectionTitle}>TOPICS</Text>
            <View style={styles.chips}>{idea.tags.map((tag) => <View key={tag} style={styles.tagChip}><Text style={styles.tagText}>#{tag.replace(/^#/, '')}</Text></View>)}</View>
          </View> : null}

          {idea.rolesNeeded.length ? <View style={styles.section}>
            <Text style={styles.sectionTitle}>CONTRIBUTORS SOUGHT</Text>
            <View style={styles.chips}>{idea.rolesNeeded.map((role) => <View key={role} style={styles.roleChip}><Ionicons name="person-add-outline" size={14} color={Colors.primary} /><Text style={styles.roleText}>{role}</Text></View>)}</View>
          </View> : null}

          {resources.length ? <View style={styles.section}>
            <Text style={styles.sectionTitle}>PROJECT LINKS</Text>
            {resources.map((resource) => <TouchableOpacity key={`${resource.label}-${resource.url}`} accessibilityRole="link" accessibilityLabel={`Open ${resource.label}`} style={styles.resourceRow} onPress={() => { void Linking.openURL(resource.url).catch(() => Alert.alert('Link unavailable', 'This link could not be opened.')); }}><Ionicons name="open-outline" size={17} color={Colors.primary} /><Text style={styles.resourceLabel}>{resource.label}</Text><Ionicons name="arrow-up-right-box" size={15} color={Colors.textMuted} /></TouchableOpacity>)}
          </View> : null}

          <View style={styles.engagementCard}>
            <View style={styles.engagementStats}>
              <Text style={styles.engagementNumber}>{engagement ? sparkCount : '—'}</Text><Text style={styles.engagementLabel}>Sparks</Text>
              <View style={styles.statDivider} />
              <Text style={styles.engagementNumber}>{engagement ? commentCount : '—'}</Text><Text style={styles.engagementLabel}>Comments</Text>
            </View>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel={sparked ? 'Remove Spark' : 'Spark this idea'} accessibilityState={{ selected: sparked, disabled: actionBusy === 'spark' }} disabled={actionBusy === 'spark'} onPress={() => { void toggleSpark(); }} style={[styles.sparkButton, sparked && styles.sparkButtonActive]}>
              {actionBusy === 'spark' ? <ActivityIndicator size="small" color={sparked ? Colors.textOnPrimary : Colors.primary} /> : <Ionicons name={sparked ? 'flash' : 'flash-outline'} size={18} color={sparked ? Colors.textOnPrimary : Colors.primary} />}
              <Text style={[styles.sparkText, sparked && styles.sparkTextActive]}>{sparked ? 'Sparked' : 'Spark'}</Text>
            </TouchableOpacity>
          </View>

          {idea.collaborationOpen === true ? (
            <View style={styles.collabNotice}>
              <Ionicons name="people-outline" size={20} color={Colors.primary} />
              <View style={styles.collabCopy}>
                <Text style={styles.collabTitle}>Open to collaboration</Text>
                {requestStatus === 'pending' ? (
                  <Text style={styles.collabStatusText}>Your collaboration request is pending review.</Text>
                ) : requestStatus === 'accepted' ? (
                  <Text style={styles.collabStatusTextSuccess}>You are a confirmed collaborator on this idea.</Text>
                ) : requestStatus === 'rejected' ? (
                  <Text style={styles.collabStatusText}>Your collaboration request was declined.</Text>
                ) : (
                  <Text style={styles.muted}>The creator is looking for student collaborators to build this together.</Text>
                )}
                {!requestStatus && isDemoIdea ? (
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Request to collaborate"
                    onPress={() => setCollabModalVisible(true)}
                    style={styles.collabButton}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="person-add-outline" size={15} color={Colors.textOnPrimary} />
                    <Text style={styles.collabButtonText}>Request to Collaborate</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          ) : idea.collaborationOpen === false ? (
            <Text style={styles.closedNotice}>Team not accepting requests</Text>
          ) : null}

          {collaborators.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>TEAM COLLABORATORS ({collaborators.length})</Text>
              <View style={styles.collaboratorList}>
                {collaborators.map((c) => (
                  <View key={c.id} style={styles.collaboratorItem}>
                    <Avatar uri={c.avatarUrl || ''} name={c.name} size={34} />
                    <View style={styles.collaboratorInfo}>
                      <Text style={styles.collaboratorName}>{c.name}</Text>
                      <Text style={styles.collaboratorRole}>{c.role || c.branch || 'Collaborator'}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          <View style={styles.discussion}>
            <View style={styles.discussionHeading}><Text accessibilityRole="header" style={styles.sectionTitle}>DISCUSSION</Text><Text style={styles.discussionCount}>{engagement ? commentCount : '—'}</Text></View>
            {commentsLoading ? <ActivityIndicator color={Colors.primary} style={styles.commentLoading} /> : commentError ? <View style={styles.errorState}><Text accessibilityRole="alert" style={styles.errorText}>{commentError}</Text><TouchableOpacity onPress={() => { void loadComments(); }}><Text style={styles.retryText}>Try again</Text></TouchableOpacity></View> : comments.length ? comments.map((comment) => <View key={comment.id} style={styles.commentRow}>
              <Avatar uri={comment.userAvatar} name={comment.userName} size={36} />
              <View style={styles.commentContent}><View style={styles.commentHeader}><Text style={styles.commentName}>{comment.userName}</Text><Text style={styles.commentTime}>{relativeTime(comment.createdAt)}</Text></View><Text selectable style={styles.commentText}>{comment.content}</Text></View>
              {comment.userId === user.id ? <TouchableOpacity accessibilityRole="button" accessibilityLabel="Delete your comment" style={styles.deleteComment} onPress={() => Alert.alert('Delete comment?', 'This removes your comment from the discussion.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => { void sharedContentService.removeIdeaComment(comment.id).then(() => { setComments((rows) => rows.filter((row) => row.id !== comment.id)); void loadEngagement(); }).catch((cause) => Alert.alert('Comment not deleted', cause instanceof Error ? cause.message : 'Please try again.')); } }])}><Ionicons name="trash-outline" size={17} color={Colors.textMuted} /></TouchableOpacity> : null}
            </View>) : <Text style={styles.emptyComments}>Be the first to share a useful question or suggestion.</Text>}

            <View style={styles.composer}>
              <Avatar uri={user.avatar} name={user.name} size={34} />
              <TextInput accessibilityLabel="Write a comment" accessibilityHint="Comments are shared with people viewing this idea" value={commentText} onChangeText={setCommentText} placeholder="Add to the discussion…" placeholderTextColor={Colors.textMuted} multiline maxLength={3000} style={styles.commentInput} textAlignVertical="top" />
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Post comment" accessibilityState={{ disabled: !commentText.trim() || commentBusy }} disabled={!commentText.trim() || commentBusy} onPress={() => { void submitComment(); }} style={[styles.sendButton, (!commentText.trim() || commentBusy) && styles.sendButtonDisabled]}>{commentBusy ? <ActivityIndicator size="small" color={Colors.textOnPrimary} /> : <Ionicons name="arrow-up" size={18} color={Colors.textOnPrimary} />}</TouchableOpacity>
            </View>
            {commentError && !commentsLoading ? <Text accessibilityRole="alert" style={styles.errorText}>{commentError}</Text> : null}
            {!supabaseConfigured ? <Text style={styles.signInHint}>Sign in to join this discussion.</Text> : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* COLLABORATION REQUEST MODAL */}
      <Modal visible={collabModalVisible} transparent animationType="fade" onRequestClose={() => setCollabModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Request to Collaborate</Text>
              <TouchableOpacity onPress={() => setCollabModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              Introduce yourself and share how your skills can help bring this idea to life.
            </Text>
            <TextInput
              accessibilityLabel="Collaboration note"
              placeholder="e.g. I have 2 years experience with React Native and PyTorch..."
              placeholderTextColor={Colors.textSubtle}
              value={collabMessage}
              onChangeText={setCollabMessage}
              multiline
              numberOfLines={4}
              style={styles.modalInput}
              textAlignVertical="top"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setCollabModalVisible(false)} style={styles.modalCancelBtn}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSendCollaborationRequest}
                disabled={!collabMessage.trim() || actionBusy === 'collab'}
                style={[styles.modalSubmitBtn, (!collabMessage.trim() || actionBusy === 'collab') && styles.sendButtonDisabled]}
              >
                {actionBusy === 'collab' ? (
                  <ActivityIndicator size="small" color={Colors.textOnPrimary} />
                ) : (
                  <Text style={styles.modalSubmitText}>Send Request</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={moreActionsVisible} transparent animationType="fade" onRequestClose={() => setMoreActionsVisible(false)}>
        <View style={styles.modalOverlay}><View style={styles.modalContent}>
          <View style={styles.modalHeader}><Text style={styles.modalTitle}>Idea actions</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel="Close idea actions" onPress={() => setMoreActionsVisible(false)} style={styles.modalCloseBtn}><Ionicons name="close" size={20} color={Colors.textMuted} /></TouchableOpacity></View>
          <TouchableOpacity accessibilityRole="button" style={styles.moreActionRow} onPress={() => { setMoreActionsVisible(false); void shareIdea(); }}><Ionicons name="share-outline" size={19} color={Colors.textPrimary} /><Text style={styles.moreActionText}>Share idea</Text></TouchableOpacity>
          {idea.creator.identity?.type === 'real' && idea.creator.id !== user.id ? <TouchableOpacity accessibilityRole="button" style={styles.moreActionRow} onPress={() => { void messageAuthor(); }}><Ionicons name="chatbubble-outline" size={19} color={Colors.textPrimary} /><Text style={styles.moreActionText}>Message author</Text></TouchableOpacity> : null}
          <TouchableOpacity accessibilityRole="button" style={styles.moreActionRow} onPress={() => { setMoreActionsVisible(false); reportIdea(); }}><Ionicons name="flag-outline" size={19} color={Colors.error} /><Text style={[styles.moreActionText, { color: Colors.error }]}>Report idea</Text></TouchableOpacity>
        </View></View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background }, flex: { flex: 1 },
  topBar: { minHeight: 52, paddingHorizontal: 6, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  topBarTitle: { flex: 1, textAlign: 'center', fontSize: Typography.body, fontWeight: Typography.semiBold, color: Colors.textPrimary }, topBarSpacer: { width: 44 },
  topActions: { flexDirection: 'row', alignItems: 'center' }, iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingHorizontal: Spacing.screenPadding, paddingTop: 18, paddingBottom: 34 },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 12 }, emptyTitle: { color: Colors.textPrimary, fontSize: Typography.title2, fontWeight: Typography.bold }, muted: { color: Colors.textMuted, fontSize: Typography.footnote, lineHeight: 20 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 18 }, authorCopy: { flex: 1, minWidth: 0 }, authorName: { fontSize: Typography.body, lineHeight: 21, color: Colors.textPrimary, fontWeight: Typography.bold }, authorMeta: { color: Colors.textSecondary, fontSize: Typography.caption, lineHeight: 18, marginTop: 2 }, posted: { color: Colors.textMuted, fontSize: Typography.caption, marginTop: 2 },
  classifications: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 7, marginBottom: 12 }, ideaMark: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, backgroundColor: Colors.primarySubtle, paddingHorizontal: 9, paddingVertical: 6 }, ideaMarkText: { color: Colors.primary, fontSize: 10, fontWeight: Typography.bold, letterSpacing: .5 }, metaChip: { borderWidth: 1, borderColor: Colors.border, borderRadius: 999, backgroundColor: Colors.surface, paddingHorizontal: 9, paddingVertical: 5 }, metaChipText: { color: Colors.textSecondary, fontSize: 11, fontWeight: Typography.medium },
  title: { fontSize: 26, lineHeight: 33, fontWeight: Typography.bold, color: Colors.textPrimary, marginBottom: 8 }, tagline: { fontSize: Typography.headline, lineHeight: 25, color: Colors.textSecondary, marginBottom: 16 },
  section: { paddingVertical: 17, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border }, sectionTitle: { fontSize: Typography.caption, fontWeight: Typography.bold, color: Colors.textMuted, letterSpacing: .7 }, description: { fontSize: 16, lineHeight: 26, color: Colors.textPrimary, marginTop: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 11 }, skillChip: { borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 11 }, skillText: { color: Colors.textPrimary, fontSize: Typography.footnote, fontWeight: Typography.medium }, tagChip: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, backgroundColor: Colors.surfaceHighlight }, tagText: { color: Colors.primary, fontSize: Typography.footnote, fontWeight: Typography.medium }, roleChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: Colors.primaryBorder, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 11 }, roleText: { color: Colors.textPrimary, fontSize: Typography.footnote },
  resourceRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border }, resourceLabel: { flex: 1, color: Colors.primary, fontSize: Typography.body, fontWeight: Typography.semiBold },
  engagementCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: 15, marginTop: 12, borderRadius: BorderRadius.lg, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder }, engagementStats: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', columnGap: 5 }, engagementNumber: { color: Colors.textPrimary, fontSize: Typography.headline, fontWeight: Typography.bold }, engagementLabel: { color: Colors.textMuted, fontSize: Typography.caption, marginRight: 6 }, statDivider: { width: 1, height: 18, backgroundColor: Colors.border, marginHorizontal: 7, alignSelf: 'center' },
  sparkButton: { minHeight: 44, minWidth: 106, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: Colors.primaryBorder, backgroundColor: Colors.primarySubtle, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 }, sparkButtonActive: { backgroundColor: Colors.primary, borderColor: Colors.primary }, sparkText: { color: Colors.primary, fontSize: Typography.footnote, fontWeight: Typography.bold }, sparkTextActive: { color: Colors.textOnPrimary },
  collabNotice: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 16, marginTop: 14, borderWidth: 1, borderColor: Colors.primaryBorder, backgroundColor: Colors.primarySubtle, borderRadius: BorderRadius.lg }, collabCopy: { flex: 1, gap: 6 }, collabTitle: { color: Colors.textPrimary, fontSize: Typography.subhead, fontWeight: Typography.bold }, closedNotice: { color: Colors.textMuted, fontSize: Typography.footnote, marginTop: 12 },
  collabStatusText: { color: Colors.accentCyan, fontSize: Typography.footnote, fontWeight: Typography.medium },
  collabStatusTextSuccess: { color: Colors.success, fontSize: Typography.footnote, fontWeight: Typography.semiBold },
  collabButton: { marginTop: 8, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: BorderRadius.full },
  collabButtonText: { color: Colors.textOnPrimary, fontSize: 12, fontWeight: Typography.bold },
  collaboratorList: { gap: 10, marginTop: 12 },
  collaboratorItem: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.surface, padding: 10, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border },
  collaboratorInfo: { flex: 1, minWidth: 0 },
  collaboratorName: { color: Colors.textPrimary, fontSize: 13, fontWeight: Typography.bold },
  collaboratorRole: { color: Colors.textMuted, fontSize: 11, marginTop: 1 },
  discussion: { marginTop: 24 }, discussionHeading: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }, discussionCount: { color: Colors.textMuted, fontSize: Typography.footnote }, commentLoading: { padding: 18 }, emptyComments: { paddingVertical: 12, color: Colors.textMuted, fontSize: Typography.footnote, lineHeight: 20 },
  commentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 18 }, commentContent: { flex: 1, minWidth: 0 }, commentHeader: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', columnGap: 8, marginBottom: 4 }, commentName: { color: Colors.textPrimary, fontSize: Typography.footnote, fontWeight: Typography.bold }, commentTime: { color: Colors.textMuted, fontSize: Typography.caption }, commentText: { color: Colors.textSecondary, fontSize: Typography.body, lineHeight: 22 }, deleteComment: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border }, commentInput: { flex: 1, maxHeight: 130, minHeight: 44, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface, borderRadius: 20, paddingHorizontal: 14, paddingTop: 11, paddingBottom: 10, color: Colors.textPrimary, fontSize: Typography.body, lineHeight: 21 }, sendButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary, borderRadius: 22 }, sendButtonDisabled: { opacity: .45 }, errorState: { gap: 8, paddingVertical: 10 }, errorText: { color: Colors.error, fontSize: Typography.footnote, lineHeight: 20 }, retryText: { color: Colors.primary, fontSize: Typography.footnote, fontWeight: Typography.bold }, signInHint: { color: Colors.textMuted, fontSize: Typography.caption, marginTop: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', maxWidth: 440, backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, borderWidth: 1, borderColor: Colors.border, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalTitle: { fontSize: Typography.title3, fontWeight: Typography.bold, color: Colors.textPrimary },
  modalCloseBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  modalSubtitle: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18, marginBottom: 14 },
  modalInput: { minHeight: 100, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, padding: 12, color: Colors.textPrimary, fontSize: 14, lineHeight: 20, marginBottom: 16 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  modalCancelBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: BorderRadius.md },
  modalCancelText: { color: Colors.textMuted, fontSize: 13, fontWeight: Typography.semiBold },
  modalSubmitBtn: { backgroundColor: Colors.primary, paddingVertical: 10, paddingHorizontal: 18, borderRadius: BorderRadius.md, minWidth: 100, alignItems: 'center', justifyContent: 'center' },
  modalSubmitText: { color: Colors.textOnPrimary, fontSize: 13, fontWeight: Typography.bold },
  moreActionRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border },
  moreActionText: { color: Colors.textPrimary, fontSize: Typography.body, fontWeight: Typography.medium },
});
