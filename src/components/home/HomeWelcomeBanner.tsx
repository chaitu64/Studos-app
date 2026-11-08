import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import type { UserProfile } from '../../types';

type Props = {
  user: UserProfile;
};

export const HomeWelcomeBanner: React.FC<Props> = React.memo(function HomeWelcomeBanner({ user }) {
  const firstName = user?.name && user.name !== 'Not signed in'
    ? user.name.split(' ')[0]
    : 'Student';

  return (
    <View style={styles.container}>
      <View style={styles.textContainer}>
        <Text style={styles.greeting}>
          Hello, <Text style={styles.highlightName}>{firstName}</Text> 👋
        </Text>
        <Text style={styles.mission}>
          Discover student ideas, meet collaborators, and access verified study notes.
        </Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: 14,
    paddingBottom: 6,
  },
  textContainer: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  greeting: {
    fontSize: Typography.title3,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    letterSpacing: -0.2,
  },
  highlightName: {
    color: Colors.primary,
  },
  mission: {
    fontSize: Typography.caption,
    lineHeight: 18,
    color: Colors.textSecondary,
    marginTop: 4,
  },
});

