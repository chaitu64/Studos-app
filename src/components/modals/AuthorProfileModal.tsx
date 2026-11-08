import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

export interface AuthorProfileModalProps {
  visible: boolean;
  author: {
    id: string;
    name: string;
    avatar: string;
    college?: string;
    role?: string;
    isVerified?: boolean;
    skills?: string[];
  } | null;
  onClose: () => void;
}

export const AuthorProfileModal: React.FC<AuthorProfileModalProps> = ({
  visible,
  author,
  onClose,
}) => {
  if (!author) return null;

  const handleMessage = () => {
    onClose();
    router.push('/messages' as never);
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={20} color={Colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.avatarWrap}>
            <Avatar
              uri={author.avatar}
              name={author.name}
              size={64}
              isVerified={author.isVerified}
            />
          </View>

          <Text style={styles.name}>{author.name}</Text>
          <Text style={styles.college}>{author.college || 'StuDos Student Builder'}</Text>

          {author.role ? (
            <Badge label={author.role} variant="primary" size="sm" style={{ marginTop: 6 }} />
          ) : null}

          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>COMMUNITY STATUS</Text>
            <View style={styles.statusRow}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Active on StudOs Student Network</Text>
            </View>
          </View>

          <View style={styles.actionRow}>
            <Button
              title="Message"
              variant="primary"
              size="sm"
              icon={<Ionicons name="chatbubble-outline" size={16} color="#FFF" />}
              onPress={handleMessage}
              style={{ flex: 1 }}
            />
            <Button
              title="Close"
              variant="outline"
              size="sm"
              onPress={onClose}
              style={{ marginLeft: 8 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.screenPadding,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarWrap: {
    marginBottom: 12,
  },
  name: {
    fontSize: Typography.title3,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  college: {
    fontSize: Typography.caption,
    color: Colors.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
  infoBox: {
    width: '100%',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 16,
    marginBottom: 20,
  },
  infoLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.success,
  },
  statusText: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  actionRow: {
    flexDirection: 'row',
    width: '100%',
  },
});
