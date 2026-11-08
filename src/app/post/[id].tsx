import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { safeBack } from '@/navigation/safeBack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { BorderRadius, Colors, Spacing, Typography } from '../../constants/theme';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { postService } from '../../services/postService';
import type { CommunityPost, CommunityPostComment } from '../../types';

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function PostDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { session } = useAuth();
  const { toggleLikePost, toggleSavePost, addPostComment, deleteCommunityPost } = useApp();
  const [post, setPost] = useState<CommunityPost | null>(null);
  const [comments, setComments] = useState<CommunityPostComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [commentsError, setCommentsError] = useState('');
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const commentInputRef = useRef<React.ElementRef<typeof TextInput>>(null);
  const [commentBusy, setCommentBusy] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [commentActionBusy, setCommentActionBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);

  const loadComments = useCallback(async () => {
    if (!id) return;
    setCommentsLoading(true);
    setCommentsError('');
    try {
      setComments(await postService.comments(id));
    } catch (cause) {
      setCommentsError(cause instanceof Error ? cause.message : 'Comments could not be loaded.');
    } finally {
      setCommentsLoading(false);
    }
  }, [id]);

  const load = useCallback(async (isRefresh = false) => {
    if (!id) {
      setError('This post link is incomplete.');
      setLoading(false);
      return;
    }
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError('');
    try {
      const value = await postService.getById(id);
      setPost(value);
      setTitle(value.title);
      setBody(value.content);
      await loadComments();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'This post could not be loaded.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, loadComments]);

  useEffect(() => { void Promise.resolve().then(() => load()); }, [load]);

  const own = Boolean(session && post && session.user.id === post.author.id);
  const authorRoute = useMemo(() => {
    const identity = post?.author.identity;
    if (!identity) return null;
    return `/student/${identity.type}/${identity.id}`;
  }, [post?.author.identity]);

  const retry = () => { void load(); };
  const handleLike = async () => {
    if (!post || busy) return;
    setBusy(true);
    try {
      await toggleLikePost(post.id);
      setPost((current) => current ? { ...current, isLiked: !current.isLiked, likesCount: Math.max(0, (current.likesCount || 0) + (current.isLiked ? -1 : 1)) } : current);
    } catch (cause) { Alert.alert('Could not update reaction', cause instanceof Error ? cause.message : 'Please try again.'); }
    finally { setBusy(false); }
  };
  const handleSave = async () => {
    if (!post || busy) return;
    setBusy(true);
    try {
      await toggleSavePost(post.id);
      setPost((current) => current ? { ...current, isSaved: !current.isSaved } : current);
    } catch (cause) { Alert.alert('Could not update saved posts', cause instanceof Error ? cause.message : 'Please try again.'); }
    finally { setBusy(false); }
  };
  const handleComment = async () => {
    const value = commentText.trim();
    if (!post || !value || commentBusy) return;
    setCommentBusy(true);
    try {
      const created = await addPostComment(post.id, value);
      setComments((current) => [...current, created]);
      setPost((current) => current ? { ...current, commentsCount: (current.commentsCount || 0) + 1 } : current);
      setCommentText('');
    } catch (cause) { Alert.alert('Comment not sent', cause instanceof Error ? cause.message : 'Please try again.'); }
    finally { setCommentBusy(false); }
  };
  const saveCommentEdit = async () => {
    const value = editingCommentText.trim();
    if (!editingCommentId || !value || commentActionBusy) return;
    setCommentActionBusy(true);
    try {
      const updated = await postService.updateComment(editingCommentId, value);
      setComments((current) => current.map((comment) => comment.id === updated.id ? updated : comment));
      setEditingCommentId(null); setEditingCommentText('');
    } catch (cause) { Alert.alert('Could not edit comment', cause instanceof Error ? cause.message : 'Please try again.'); }
    finally { setCommentActionBusy(false); }
  };
  const deleteComment = (commentId: string) => Alert.alert('Delete your comment?', 'This cannot be undone.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => {
      if (commentActionBusy) return;
      setCommentActionBusy(true);
      try {
        await postService.deleteComment(commentId);
        setComments((current) => current.filter((comment) => comment.id !== commentId));
        setPost((current) => current ? { ...current, commentsCount: Math.max(0, (current.commentsCount || 0) - 1) } : current);
      } catch (cause) { Alert.alert('Could not delete comment', cause instanceof Error ? cause.message : 'Please try again.'); }
      finally { setCommentActionBusy(false); }
    } },
  ]);
  const saveEdit = async () => {
    const nextTitle = title.trim(); const nextBody = body.trim();
    if (!nextTitle || !nextBody || busy) return;
    setBusy(true);
    try {
      const value = await postService.update(id, { title: nextTitle, content: nextBody });
      setPost(value);
      setEditing(false);
    } catch (cause) { Alert.alert('Could not save changes', cause instanceof Error ? cause.message : 'Please try again.'); }
    finally { setBusy(false); }
  };
  const remove = () => Alert.alert('Delete this post?', 'This removes the post from your campus feed.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete post', style: 'destructive', onPress: async () => {
      if (!post || busy) return;
      setBusy(true);
      try { await postService.remove(post.id); await deleteCommunityPost(post.id); safeBack(); }
      catch (cause) { Alert.alert('Could not delete post', cause instanceof Error ? cause.message : 'Please try again.'); }
      finally { setBusy(false); }
    } },
  ]);

  if (loading) return <SafeAreaView style={styles.safe} edges={['top']}><View style={styles.state}><ActivityIndicator color={Colors.primary} /><Text style={styles.muted}>Loading post…</Text></View></SafeAreaView>;
  if (!post) return <SafeAreaView style={styles.safe} edges={['top']}><View style={styles.state}><View style={styles.stateIcon}><Ionicons name="cloud-offline-outline" size={24} color={Colors.textMuted} /></View><Text style={styles.stateTitle}>Post unavailable</Text><Text style={styles.muted}>{error || 'This post may have been removed.'}</Text><Button title="Try again" onPress={retry} /><Button title="Go back" variant="ghost" onPress={() => safeBack()} /></View></SafeAreaView>;

  return <SafeAreaView style={styles.safe} edges={['top']}>
    <View style={styles.topBar}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" onPress={() => safeBack()} style={styles.iconButton}><Ionicons name="arrow-back" size={21} color={Colors.textPrimary} /></TouchableOpacity>
      <Text style={styles.topTitle}>Post</Text>
      {own ? <TouchableOpacity accessibilityRole="button" accessibilityLabel="Post options" onPress={() => Alert.alert('Post options', undefined, [{ text: 'Edit post', onPress: () => setEditing(true) }, { text: 'Delete post', style: 'destructive', onPress: remove }, { text: 'Cancel', style: 'cancel' }])} style={styles.iconButton}><Ionicons name="ellipsis-horizontal" size={21} color={Colors.textPrimary} /></TouchableOpacity> : <View style={styles.iconSpacer} />}
    </View>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={Colors.primary} colors={[Colors.primary]} />}>
      <View style={styles.postCard}>
        <View style={styles.authorRow}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={`View ${post.author.name}'s profile`} disabled={!authorRoute} onPress={() => authorRoute && router.push(authorRoute as never)} style={styles.authorPress}>
            <Avatar uri={post.author.avatar} name={post.author.name} size={46} />
            <View style={styles.authorCopy}><Text style={styles.authorName}>{post.author.name}</Text><Text style={styles.meta} numberOfLines={1}>{[post.author.college || post.author.role, formatDate(post.createdAt)].filter(Boolean).join(' · ')}</Text></View>
          </TouchableOpacity>
          <Text style={styles.typeBadge}>{post.type.replace('_', ' ')}</Text>
        </View>
        <Text style={styles.postTitle}>{post.title}</Text>
        <Text style={styles.postBody}>{post.content}</Text>
        {post.tags?.length ? <View style={styles.tags}>{post.tags.map((tag) => <Text key={tag} style={styles.tag}>#{tag}</Text>)}</View> : null}
        {post.images?.map((uri, index) => <Image key={`${uri}-${index}`} accessibilityLabel={`Post image ${index + 1}`} source={{ uri }} style={styles.image} />)}
        <View style={styles.stats}>{post.likesAvailable === false ? <Text style={styles.meta}>Likes unavailable</Text> : <Text style={styles.meta}>{post.likesCount ?? 0} {(post.likesCount ?? 0) === 1 ? 'like' : 'likes'}</Text>}{post.commentsAvailable === false ? <Text style={styles.meta}>Comments unavailable</Text> : <Text style={styles.meta}>{comments.length || post.commentsCount || 0} {((comments.length || post.commentsCount || 0) === 1) ? 'comment' : 'comments'}</Text>}</View>
        <View style={styles.actions}>
          {post.likesAvailable !== false ? <TouchableOpacity accessibilityRole="button" accessibilityLabel={post.isLiked ? 'Unlike post' : 'Like post'} accessibilityState={{ selected: Boolean(post.isLiked), disabled: busy }} disabled={busy} onPress={() => void handleLike()} style={styles.action}><Ionicons name={post.isLiked ? 'heart' : 'heart-outline'} size={20} color={post.isLiked ? Colors.primary : Colors.textSecondary} /><Text style={[styles.actionText, post.isLiked && styles.actionActive]}>Like</Text></TouchableOpacity> : null}
          {post.commentsAvailable !== false ? <TouchableOpacity accessibilityRole="button" accessibilityLabel="Write a comment" onPress={() => commentInputRef.current?.focus()} style={styles.action}><Ionicons name="chatbubble-outline" size={19} color={Colors.textSecondary} /><Text style={styles.actionText}>Comment</Text></TouchableOpacity> : null}
          {post.savesAvailable !== false ? <TouchableOpacity accessibilityRole="button" accessibilityLabel={post.isSaved ? 'Remove from saved posts' : 'Save post'} accessibilityState={{ selected: Boolean(post.isSaved), disabled: busy }} disabled={busy} onPress={() => void handleSave()} style={styles.action}><Ionicons name={post.isSaved ? 'bookmark' : 'bookmark-outline'} size={19} color={post.isSaved ? Colors.primary : Colors.textSecondary} /><Text style={[styles.actionText, post.isSaved && styles.actionActive]}>{post.isSaved ? 'Saved' : 'Save'}</Text></TouchableOpacity> : null}
        </View>
      </View>

      <View style={styles.commentsHeader}><View><Text style={styles.sectionTitle}>Comments</Text><Text style={styles.sectionHint}>Share a helpful thought or question.</Text></View><Text style={styles.commentCount}>{comments.length}</Text></View>
      {commentsLoading ? <View style={styles.inlineState}><ActivityIndicator size="small" color={Colors.primary} /><Text style={styles.muted}>Loading comments…</Text></View> : commentsError ? <View style={styles.inlineError}><Text style={styles.errorText}>{commentsError}</Text><TouchableOpacity accessibilityRole="button" onPress={() => void loadComments()} style={styles.retry}><Text style={styles.retryText}>Retry</Text></TouchableOpacity></View> : comments.length ? comments.map((comment) => <View key={comment.id} style={styles.commentCard}><Avatar uri={comment.userAvatar} name={comment.userName} size={36} /><View style={styles.commentCopy}><View style={styles.commentMeta}><Text style={styles.commentName}>{comment.userName}</Text>{comment.userRole ? <Text style={styles.meta}> · {comment.userRole}</Text> : null}</View>{editingCommentId === comment.id ? <><TextInput accessibilityLabel="Edit comment" value={editingCommentText} onChangeText={setEditingCommentText} multiline maxLength={3000} style={styles.editCommentInput} /><View style={styles.commentActions}><TouchableOpacity accessibilityRole="button" disabled={!editingCommentText.trim() || commentActionBusy} onPress={() => void saveCommentEdit()}><Text style={styles.commentActionPrimary}>{commentActionBusy ? 'Saving…' : 'Save'}</Text></TouchableOpacity><TouchableOpacity accessibilityRole="button" onPress={() => { setEditingCommentId(null); setEditingCommentText(''); }}><Text style={styles.commentAction}>Cancel</Text></TouchableOpacity></View></> : <><Text style={styles.commentBody}>{comment.content}</Text><Text style={styles.commentTime}>{formatDate(comment.createdAt)}{comment.updatedAt && comment.updatedAt !== comment.createdAt ? ' · edited' : ''}</Text>{comment.isOwn ? <View style={styles.commentActions}><TouchableOpacity accessibilityRole="button" onPress={() => { setEditingCommentId(comment.id); setEditingCommentText(comment.content); }}><Text style={styles.commentAction}>Edit</Text></TouchableOpacity><TouchableOpacity accessibilityRole="button" disabled={commentActionBusy} onPress={() => deleteComment(comment.id)}><Text style={styles.commentActionDanger}>Delete</Text></TouchableOpacity></View> : null}</>}</View></View>) : <View style={styles.emptyComments}><Ionicons name="chatbubbles-outline" size={23} color={Colors.textMuted} /><Text style={styles.emptyTitle}>Start the conversation</Text><Text style={styles.muted}>No comments yet. Add the first one below.</Text></View>}

      {post.commentsAvailable !== false ? <View style={styles.composer}><TextInput ref={commentInputRef} accessibilityLabel="Write a comment" value={commentText} onChangeText={setCommentText} placeholder="Add a thoughtful comment…" placeholderTextColor={Colors.textSubtle} multiline maxLength={3000} style={styles.commentInput} /><TouchableOpacity accessibilityRole="button" accessibilityLabel="Send comment" accessibilityState={{ disabled: !commentText.trim() || commentBusy }} disabled={!commentText.trim() || commentBusy} onPress={() => void handleComment()} style={[styles.sendButton, (!commentText.trim() || commentBusy) && styles.sendDisabled]}>{commentBusy ? <ActivityIndicator size="small" color={Colors.textOnPrimary} /> : <Ionicons name="arrow-up" size={19} color={Colors.textOnPrimary} />}</TouchableOpacity></View> : null}
    </ScrollView>

    <Modal visible={editing} transparent animationType="slide" onRequestClose={() => setEditing(false)}>
      <View style={styles.overlay}><View style={styles.editCard}><View style={styles.modalHeader}><Text style={styles.sectionTitle}>Edit post</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel="Close editor" onPress={() => setEditing(false)} style={styles.iconButton}><Ionicons name="close" size={20} color={Colors.textPrimary} /></TouchableOpacity></View><TextInput accessibilityLabel="Post title" value={title} onChangeText={setTitle} placeholder="Title" placeholderTextColor={Colors.textSubtle} maxLength={160} style={styles.input} /><TextInput accessibilityLabel="Post details" value={body} onChangeText={setBody} placeholder="Details" placeholderTextColor={Colors.textSubtle} multiline maxLength={5000} style={[styles.input, styles.bodyInput]} /><Button title="Save changes" onPress={() => void saveEdit()} disabled={busy || !title.trim() || !body.trim()} loading={busy} /><Button title="Cancel" variant="ghost" onPress={() => setEditing(false)} disabled={busy} /></View></View>
    </Modal>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  topBar: { minHeight: 56, paddingHorizontal: Spacing.screenPadding, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  topTitle: { color: Colors.textPrimary, fontSize: Typography.headline, fontWeight: Typography.semiBold },
  iconButton: { width: 44, height: 44, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center' }, iconSpacer: { width: 44 },
  content: { padding: Spacing.screenPadding, paddingBottom: 40 },
  postCard: { backgroundColor: Colors.card, borderRadius: BorderRadius.xl, borderWidth: 1, borderColor: Colors.cardBorder, padding: Spacing.lg },
  authorRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }, authorPress: { flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 }, authorCopy: { flex: 1, minWidth: 0, marginLeft: 11 }, authorName: { color: Colors.textPrimary, fontSize: Typography.subhead, fontWeight: Typography.bold }, meta: { color: Colors.textMuted, fontSize: Typography.caption, lineHeight: 17 }, typeBadge: { color: Colors.primary, backgroundColor: Colors.primarySubtle, borderRadius: BorderRadius.full, paddingHorizontal: 10, paddingVertical: 6, overflow: 'hidden', fontSize: Typography.caption, fontWeight: Typography.semiBold, textTransform: 'capitalize' },
  postTitle: { color: Colors.textPrimary, fontSize: Typography.title2, lineHeight: 31, fontWeight: Typography.bold, marginTop: 19 }, postBody: { color: Colors.textSecondary, fontSize: Typography.body, lineHeight: 24, marginTop: 10 }, tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 14 }, tag: { color: Colors.accentCyan, fontSize: Typography.footnote, fontWeight: Typography.medium }, image: { width: '100%', height: 230, resizeMode: 'cover', borderRadius: BorderRadius.lg, marginTop: 14, backgroundColor: Colors.surfaceHighlight },
  stats: { flexDirection: 'row', gap: 18, paddingTop: 16, marginTop: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border }, actions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }, action: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 10, borderRadius: BorderRadius.md }, actionText: { color: Colors.textSecondary, fontSize: Typography.footnote, fontWeight: Typography.medium }, actionActive: { color: Colors.primary },
  commentsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 26, marginBottom: 13 }, sectionTitle: { color: Colors.textPrimary, fontSize: Typography.title3, fontWeight: Typography.bold }, sectionHint: { color: Colors.textMuted, fontSize: Typography.caption, marginTop: 3 }, commentCount: { color: Colors.textMuted, fontSize: Typography.footnote, fontWeight: Typography.semiBold }, commentCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, backgroundColor: Colors.surface, borderColor: Colors.border, borderWidth: 1, borderRadius: BorderRadius.lg, marginBottom: 9 }, commentCopy: { flex: 1, minWidth: 0 }, commentMeta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }, commentName: { color: Colors.textPrimary, fontSize: Typography.footnote, fontWeight: Typography.semiBold }, commentBody: { color: Colors.textSecondary, fontSize: Typography.footnote, lineHeight: 21, marginTop: 5 }, commentTime: { color: Colors.textSubtle, fontSize: Typography.caption, marginTop: 7 }, commentActions: { flexDirection: 'row', gap: 18, marginTop: 8 }, commentAction: { color: Colors.textMuted, fontSize: Typography.caption, fontWeight: Typography.semiBold, paddingVertical: 5 }, commentActionPrimary: { color: Colors.primary, fontSize: Typography.caption, fontWeight: Typography.bold, paddingVertical: 5 }, commentActionDanger: { color: Colors.error, fontSize: Typography.caption, fontWeight: Typography.semiBold, paddingVertical: 5 }, editCommentInput: { color: Colors.textPrimary, backgroundColor: Colors.surfaceSubtle, borderColor: Colors.border, borderWidth: 1, borderRadius: BorderRadius.md, padding: 10, marginTop: 8, minHeight: 60, textAlignVertical: 'top' },
  emptyComments: { alignItems: 'center', gap: 7, padding: 22, borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed', borderRadius: BorderRadius.lg, backgroundColor: Colors.surfaceSubtle }, emptyTitle: { color: Colors.textPrimary, fontSize: Typography.footnote, fontWeight: Typography.semiBold }, muted: { color: Colors.textMuted, fontSize: Typography.footnote, lineHeight: 20, textAlign: 'center' }, inlineState: { minHeight: 64, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 9 }, inlineError: { padding: 14, backgroundColor: Colors.errorSubtle, borderRadius: BorderRadius.md, gap: 8 }, errorText: { color: Colors.error, fontSize: Typography.footnote, lineHeight: 19 }, retry: { alignSelf: 'flex-start', minHeight: 40, justifyContent: 'center', paddingHorizontal: 5 }, retryText: { color: Colors.primary, fontWeight: Typography.bold }, composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 9, marginTop: 14, padding: 10, backgroundColor: Colors.surface, borderColor: Colors.border, borderWidth: 1, borderRadius: BorderRadius.lg }, commentInput: { flex: 1, maxHeight: 120, minHeight: 42, color: Colors.textPrimary, fontSize: Typography.footnote, lineHeight: 20, paddingHorizontal: 5, paddingVertical: 10, textAlignVertical: 'top' }, sendButton: { width: 44, height: 44, borderRadius: BorderRadius.full, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' }, sendDisabled: { opacity: 0.5 },
  state: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxl, gap: 13 }, stateIcon: { width: 56, height: 56, borderRadius: BorderRadius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surfaceHighlight }, stateTitle: { color: Colors.textPrimary, fontSize: Typography.title3, fontWeight: Typography.bold },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: Colors.overlay }, editCard: { backgroundColor: Colors.surfaceElevated, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, padding: Spacing.xxl, gap: 10, maxHeight: '88%' }, modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }, input: { minHeight: 48, color: Colors.textPrimary, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, paddingHorizontal: 13, paddingVertical: 12, fontSize: Typography.body }, bodyInput: { minHeight: 130, textAlignVertical: 'top' },
});
