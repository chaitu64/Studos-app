import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import { Avatar } from '../ui/Avatar';
import { CommunityPost, CommunityPostComment } from '../../types';

export interface PostCommentsModalProps {
  visible: boolean;
  post: CommunityPost | null;
  onClose: () => void;
  onAddComment: (postId: string, text: string) => Promise<CommunityPostComment>;
}

export const PostCommentsModal: React.FC<PostCommentsModalProps> = ({
  visible,
  post,
  onClose,
  onAddComment,
}) => {
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!post) return null;

  const comments = post.comments || [];

  const handleSend = async () => {
    if (!commentText.trim()) return;
    setIsSubmitting(true);
    try {
      await onAddComment(post.id, commentText.trim());
      setCommentText('');
    } catch {
      Alert.alert('Error', 'Unable to post comment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                Comments ({comments.length})
              </Text>
              <Text style={styles.headerPostTitle} numberOfLines={1}>
                {post.title}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Comments List */}
          <ScrollView contentContainerStyle={styles.commentsList} showsVerticalScrollIndicator={false}>
            {comments.length === 0 ? (
              <View style={styles.emptyComments}>
                <Ionicons name="chatbubbles-outline" size={36} color={Colors.textMuted} />
                <Text style={styles.emptyTitle}>No comments yet</Text>
                <Text style={styles.emptySubtitle}>Be the first to share your thoughts or ask a question!</Text>
              </View>
            ) : (
              comments.map((comm) => (
                <View key={comm.id} style={styles.commentItem}>
                  <Avatar uri={comm.userAvatar} name={comm.userName} size={32} />
                  <View style={styles.commentBody}>
                    <View style={styles.commentHeader}>
                      <Text style={styles.commentAuthor}>{comm.userName}</Text>
                      {comm.userRole ? <Text style={styles.commentRole}> • {comm.userRole}</Text> : null}
                      <Text style={styles.commentTime}>{comm.createdAt}</Text>
                    </View>
                    <Text style={styles.commentContent}>{comm.content}</Text>
                  </View>
                </View>
              ))
            )}
          </ScrollView>

          {/* Input Box */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              placeholder="Add to the conversation..."
              placeholderTextColor={Colors.textMuted}
              value={commentText}
              onChangeText={setCommentText}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[styles.sendBtn, !commentText.trim() && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={!commentText.trim() || isSubmitting}
            >
              <Ionicons
                name="send"
                size={16}
                color={commentText.trim() ? '#FFF' : Colors.textMuted}
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    height: '75%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: Typography.headline,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  headerPostTitle: {
    fontSize: Typography.caption,
    color: Colors.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentsList: {
    padding: Spacing.screenPadding,
    paddingBottom: 20,
  },
  emptyComments: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyTitle: {
    fontSize: Typography.body,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  emptySubtitle: {
    fontSize: Typography.footnote,
    color: Colors.textMuted,
    textAlign: 'center',
    maxWidth: 240,
  },
  commentItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 10,
  },
  commentBody: {
    flex: 1,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.md,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  commentAuthor: {
    fontSize: 12,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  commentRole: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  commentTime: {
    fontSize: 10,
    color: Colors.textSubtle,
    marginLeft: 'auto',
  },
  commentContent: {
    fontSize: Typography.subhead,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surfaceElevated,
    gap: 10,
  },
  textInput: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: Typography.subhead,
    maxHeight: 80,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: Colors.border,
  },
});
