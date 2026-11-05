import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';

export interface ActionSheetProps {
  visible: boolean;
  onClose: () => void;
}

export const ActionSheet: React.FC<ActionSheetProps> = ({ visible, onClose }) => {
  const actions = [
    {
      id: 'resource',
      title: 'Share Study PDF',
      subtitle: 'Add a course PDF by sharing its Google Drive link',
      icon: 'document-text-outline' as const,
      color: Colors.accentAmber,
      bgColor: Colors.accentAmberSubtle,
      route: '/share-resource',
      badge: 'Study Hub',
    },
    {
      id: 'idea',
      title: 'Submit an Idea',
      subtitle: 'Post a concept, find co-builders & gather community feedback',
      icon: 'bulb-outline' as const,
      color: Colors.primary,
      bgColor: Colors.primarySubtle,
      route: '/ideahub/submit',
      badge: 'Core Innovation',
    },
    {
      id: 'project',
      title: 'Showcase a Project',
      subtitle: 'Demonstrate live prototypes, GitHub repos & achievements',
      icon: 'rocket-outline' as const,
      color: Colors.accentGreen,
      bgColor: Colors.accentGreenSubtle,
      route: '/projects/create',
      badge: 'Portfolio',
    },
    {
      id: 'team',
      title: 'Recruit Teammates',
      subtitle: 'Form a squad for hackathons, research or student startups',
      icon: 'people-outline' as const,
      color: Colors.accentCyan,
      bgColor: Colors.accentCyanSubtle,
      route: '/teams/create',
      badge: 'Team Finder',
    },
  ];

  const handleSelect = (route: string) => {
    onClose();
    setTimeout(() => {
      router.push(route as any);
    }, 150);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.sheetContainer}>
              {/* Handle indicator */}
              <View style={styles.handleContainer}>
                <View style={styles.handleBar} />
              </View>

              {/* Header */}
              <View style={styles.header}>
                <View>
                  <Text style={styles.title}>What do you want to create?</Text>
                  <Text style={styles.subtitle}>Choose an action to share with the StudOs network</Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <Ionicons name="close" size={20} color={Colors.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Actions List */}
              <View style={styles.actionsList}>
                {actions.map((act) => (
                  <TouchableOpacity
                    key={act.id}
                    activeOpacity={0.75}
                    style={styles.actionCard}
                    onPress={() => handleSelect(act.route)}
                  >
                    <View style={[styles.iconWrapper, { backgroundColor: act.bgColor }]}>
                      <Ionicons name={act.icon} size={24} color={act.color} />
                    </View>

                    <View style={styles.actionInfo}>
                      <View style={styles.badgeRow}>
                        <Text style={[styles.actionBadge, { color: act.color }]}>{act.badge}</Text>
                      </View>
                      <Text style={styles.actionTitle}>{act.title}</Text>
                      <Text style={styles.actionSubtitle}>{act.subtitle}</Text>
                    </View>

                    <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 7, 15, 0.75)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: Colors.surfaceElevated,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.screenPadding,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
    paddingTop: 12,
    ...Shadows.card,
  },
  handleContainer: {
    alignItems: 'center',
    paddingBottom: 12,
  },
  handleBar: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  title: {
    fontSize: Typography.title3,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: Typography.caption,
    color: Colors.textMuted,
    marginTop: 3,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionsList: {
    gap: 12,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  actionInfo: {
    flex: 1,
  },
  badgeRow: {
    marginBottom: 2,
  },
  actionBadge: {
    fontSize: 10,
    fontWeight: Typography.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  actionTitle: {
    fontSize: Typography.body,
    fontWeight: Typography.semiBold,
    color: Colors.textPrimary,
  },
  actionSubtitle: {
    fontSize: Typography.caption,
    color: Colors.textMuted,
    marginTop: 2,
    lineHeight: 16,
  },
});
