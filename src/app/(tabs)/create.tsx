import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { Card } from '../../components/ui/Card';

export default function CreateScreen() {
  const actions = [
    {
      id: 'resource',
      title: 'Share Study PDF',
      subtitle: 'Share a Google Drive link with course details. STUDOS keeps the PDF in your Drive.',
      icon: 'document-text-outline' as const,
      color: Colors.accentAmber,
      bgColor: Colors.accentAmberSubtle,
      route: '/share-resource',
      badge: 'Study Hub',
    },
    {
      id: 'idea',
      title: 'Submit an Idea',
      subtitle: 'Post a concept, find co-builders, gather community feedback and form a roadmap.',
      icon: 'bulb-outline' as const,
      color: Colors.primary,
      bgColor: Colors.primarySubtle,
      route: '/ideahub/submit',
      badge: 'Core Innovation',
    },
    {
      id: 'team',
      title: 'Recruit Teammates',
      subtitle: 'Form a squad for TreeHacks, an MIT challenge, or a seed-stage startup.',
      icon: 'people-outline' as const,
      color: Colors.accentCyan,
      bgColor: Colors.accentCyanSubtle,
      route: '/teams/create',
      badge: 'Team Finder',
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>What are you building?</Text>
          <Text style={styles.subtitle}>
            StuDos is built for action. Share your vision, recruit peers, or showcase your engineering.
          </Text>
        </View>

        <View style={styles.actionsList}>
          {actions.map((act) => (
            <TouchableOpacity
              key={act.id}
              activeOpacity={0.85}
              style={styles.actionCard}
              onPress={() => router.push(act.route as any)}
            >
              <View style={[styles.iconWrapper, { backgroundColor: act.bgColor }]}>
                <Ionicons name={act.icon} size={28} color={act.color} />
              </View>

              <View style={styles.actionInfo}>
                <View style={styles.badgeRow}>
                  <Text style={[styles.actionBadge, { color: act.color }]}>{act.badge}</Text>
                </View>
                <Text style={styles.actionTitle}>{act.title}</Text>
                <Text style={styles.actionSubtitle}>{act.subtitle}</Text>
              </View>

              <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        <Card variant="outline" style={styles.tipsCard}>
          <View style={styles.tipsHeader}>
            <Ionicons name="shield-checkmark-outline" size={18} color={Colors.primary} />
            <Text style={styles.tipsTitle}>BUILDER QUALITY GUIDELINES</Text>
          </View>
          <Text style={styles.tipsText}>
            {`• Clearly state problem statements before proposing tech solutions.\n• Specify exact skills needed (e.g. React Native & WebGL, not just Coder).\n• High-quality submissions earn +100 verified StuDos impact points.`}
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    padding: Spacing.screenPadding,
    paddingBottom: 40,
  },
  header: {
    marginTop: 10,
    marginBottom: 24,
  },
  title: {
    fontSize: Typography.display,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    lineHeight: 38,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: Typography.body,
    color: Colors.textMuted,
    lineHeight: 22,
  },
  actionsList: {
    gap: 16,
    marginBottom: 28,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 18,
    ...Shadows.card,
  },
  iconWrapper: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  actionInfo: {
    flex: 1,
    marginRight: 8,
  },
  badgeRow: {
    marginBottom: 4,
  },
  actionBadge: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  actionTitle: {
    fontSize: Typography.headline,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: Typography.footnote,
    color: Colors.textMuted,
    lineHeight: 18,
  },
  tipsCard: {
    backgroundColor: Colors.surfaceElevated,
    borderColor: Colors.border,
    padding: 16,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tipsTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.8,
    marginLeft: 6,
  },
  tipsText: {
    fontSize: Typography.footnote,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});
