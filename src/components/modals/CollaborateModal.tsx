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
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { CommunityPost } from '../../types';

export interface CollaborateModalProps {
  visible: boolean;
  post: CommunityPost | null;
  onClose: () => void;
  onSubmit: (postId: string, note: string, role?: string) => Promise<{ success: boolean; message: string }>;
}

export const CollaborateModal: React.FC<CollaborateModalProps> = ({
  visible,
  post,
  onClose,
  onSubmit,
}) => {
  const [note, setNote] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!post) return null;

  const isService = post.type === 'service';
  const isEvent = post.type === 'event_collab';

  const modalTitle = isService
    ? 'Request Service'
    : isEvent
    ? 'Volunteer / Join Initiative'
    : 'Collaborate with Creator';

  const actionPrompt = isService
    ? `Tell ${post.author.name} about your project and what you need:`
    : isEvent
    ? `Tell the event organizer why you want to help out:`
    : `Introduce yourself and what you can contribute to this idea:`;

  const handleSubmit = async () => {
    if (!note.trim()) {
      Alert.alert('Message Required', 'Please write a brief note to the creator.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await onSubmit(post.id, note.trim(), selectedRole || undefined);
      Alert.alert('Request Sent!', res.message);
      setNote('');
      setSelectedRole('');
      onClose();
    } catch {
      Alert.alert('Error', 'Unable to send collaboration request. Please try again.');
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
            <View>
              <Text style={styles.headerTitle}>{modalTitle}</Text>
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {post.title}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
            {/* Author summary card */}
            <View style={styles.authorCard}>
              <Avatar
                uri={post.author.avatar}
                name={post.author.name}
                size={44}
                isVerified={post.author.isVerified}
              />
              <View style={styles.authorInfo}>
                <Text style={styles.authorName}>{post.author.name}</Text>
                <Text style={styles.authorCollege}>
                  {post.author.role ? `${post.author.role} • ` : ''}
                  {post.author.college || 'StuDos Student'}
                </Text>
              </View>
            </View>

            {/* If roles needed are specified */}
            {post.rolesNeeded && post.rolesNeeded.length > 0 ? (
              <View style={styles.rolesSection}>
                <Text style={styles.rolesLabel}>SELECT ROLE YOU CAN FILL:</Text>
                <View style={styles.rolesList}>
                  {post.rolesNeeded.map((r) => {
                    const isSelected = selectedRole === r;
                    return (
                      <TouchableOpacity
                        key={r}
                        style={[styles.roleChip, isSelected && styles.roleChipSelected]}
                        onPress={() => setSelectedRole(isSelected ? '' : r)}
                      >
                        <Text style={[styles.roleChipText, isSelected && styles.roleChipTextSelected]}>
                          {r}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {/* Message input */}
            <Input
              label={actionPrompt}
              value={note}
              onChangeText={setNote}
              placeholder="E.g., Hey! I saw your post and I have 2 years of React Native experience. Would love to hop on a call..."
              multiline
              numberOfLines={4}
              style={{ minHeight: 100, textAlignVertical: 'top' }}
            />

            <View style={styles.btnRow}>
              <Button
                title={isSubmitting ? 'Sending...' : 'Send Request'}
                variant="primary"
                size="md"
                onPress={handleSubmit}
                disabled={isSubmitting}
                style={{ width: '100%' }}
              />
            </View>
          </ScrollView>
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
    maxHeight: '80%',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: Typography.title3,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: Typography.caption,
    color: Colors.textMuted,
    marginTop: 2,
    maxWidth: 280,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: Spacing.screenPadding,
  },
  authorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
    gap: 12,
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: Typography.body,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  authorCollege: {
    fontSize: Typography.caption,
    color: Colors.textMuted,
    marginTop: 2,
  },
  rolesSection: {
    marginBottom: 14,
  },
  rolesLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  rolesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  roleChip: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.xs,
  },
  roleChipSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primarySubtle,
  },
  roleChipText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: Typography.medium,
  },
  roleChipTextSelected: {
    color: Colors.primary,
    fontWeight: Typography.bold,
  },
  btnRow: {
    marginTop: 14,
  },
});
