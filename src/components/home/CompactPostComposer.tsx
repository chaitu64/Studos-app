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
      <Text style={styles.greeting}>Hey, {firstName} 👋</Text>
      <Text style={styles.subtitle}>What’s happening on campus today?</Text>
      <View style={styles.card}>
        <View style={styles.inputRow}>
          <Avatar uri={user.avatar} name={user.name} size={36} />
          <TouchableOpacity accessibilityRole="button" style={styles.input} onPress={() => onOpen('story')}>
            <Text style={styles.placeholder}>Share something with your community...</Text>
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
  wrap: { paddingHorizontal: Spacing.screenPadding, paddingTop: 18 },
  greeting: { color: Colors.textPrimary, fontSize: 22, fontWeight: Typography.bold, letterSpacing: -0.5 },
  subtitle: { color: Colors.textMuted, fontSize: 13, marginTop: 3, marginBottom: 14 },
  card: { backgroundColor: '#121624', borderRadius: BorderRadius.lg, borderColor: '#252C3D', borderWidth: 1, padding: 12 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  input: { flex: 1, minHeight: 40, justifyContent: 'center', backgroundColor: '#171D2D', borderRadius: 12, paddingHorizontal: 13 },
  placeholder: { color: Colors.textMuted, fontSize: 13 },
  actions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 11, borderTopWidth: 1, borderTopColor: '#252C3D' },
  action: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 4 },
  actionText: { color: Colors.textSecondary, fontSize: 11, fontWeight: Typography.semiBold },
});
