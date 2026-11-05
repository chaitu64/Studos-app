import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '../ui/Avatar';
import { Colors, BorderRadius, Spacing, Typography } from '../../constants/theme';
import { CommunityPostType, UserProfile } from '../../types';

type Props = { user: UserProfile; onOpen: (type: CommunityPostType) => void };

const actions: { label: string; icon: keyof typeof Ionicons.glyphMap; type: CommunityPostType }[] = [
  { label: 'PDF / Notes', icon: 'document-text-outline', type: 'study_material' },
  { label: 'Photo', icon: 'image-outline', type: 'story' },
  { label: 'Idea', icon: 'bulb-outline', type: 'idea' },
  { label: 'Team Up', icon: 'people-outline', type: 'event_collab' },
];

export function CompactPostComposer({ user, onOpen }: Props) {
  const firstName = user.name?.trim().split(' ')[0] || 'Student';
  return (
    <View style={styles.wrap}>
      <View style={styles.promptRow}><Text style={styles.greeting}>Good to see you, {firstName}</Text><Text style={styles.subtitle}>Share what you’re working on</Text></View>
      <View style={styles.card}>
        <View style={styles.inputRow}>
          <Avatar uri={user.avatar} name={user.name} size={36} />
          <TouchableOpacity accessibilityRole="button" style={styles.input} onPress={() => onOpen('story')}>
            <Text style={styles.placeholder} numberOfLines={1}>What’s happening on campus?</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.actions}>
          {actions.map((action) => (
            <TouchableOpacity key={action.label} accessibilityRole="button" style={styles.action} onPress={() => onOpen(action.type)}>
              <Ionicons name={action.icon} size={16} color={Colors.textSecondary} />
              <Text style={styles.actionText}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: Spacing.screenPadding, paddingTop: 12 },
  promptRow: { marginBottom: 12, gap: 2 },
  greeting: { color: Colors.textPrimary, fontSize: 18, lineHeight: 24, fontWeight: Typography.bold, letterSpacing: -0.25 },
  subtitle: { color: Colors.textMuted, fontSize: 13, lineHeight: 18 },
  card: { backgroundColor: Colors.card, borderRadius: BorderRadius.md, borderColor: Colors.cardBorder, borderWidth: 1, padding: 12 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  input: { flex: 1, minWidth: 0, minHeight: 44, justifyContent: 'center', backgroundColor: Colors.surfaceElevated, borderRadius: 12, paddingHorizontal: 13 },
  placeholder: { color: Colors.textMuted, fontSize: 14 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: Colors.border },
  action: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 40, minWidth: '46%', paddingHorizontal: 5 },
  actionText: { color: Colors.textSecondary, fontSize: 12, fontWeight: Typography.semiBold },
});
