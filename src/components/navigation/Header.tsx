import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import { Avatar } from '../ui/Avatar';
import { useApp } from '../../context/AppContext';

export interface HeaderProps {
  showSearch?: boolean;
  title?: string;
  subtitle?: string;
  hideGreeting?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  hideGreeting,
}) => {
  const { user, unreadNotifsCount } = useApp();

  return (
    <View style={styles.container}>
      {/* Top Bar: Wordmark, Search trigger, Notifications, Avatar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.brandContainer}
          activeOpacity={0.8}
          onPress={() => router.push('/(tabs)')}
        >
          <Text style={styles.wordmark}>
            STU<Text style={styles.wordmarkHighlight}>DOS</Text>
          </Text>
          <View style={styles.badgePill}>
            <Text style={styles.badgeText}>STUDENT NETWORK</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.actionsRight}>
          <TouchableOpacity
            accessibilityLabel="Search"
            style={styles.iconBtn}
            onPress={() => router.push('/search' as any)}
          >
            <Ionicons name="search-outline" size={22} color={Colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityLabel="Notifications"
            style={styles.iconBtn}
            onPress={() => router.push('/notifications' as any)}
          >
            <Ionicons name="notifications-outline" size={22} color={Colors.textSecondary} />
            {unreadNotifsCount > 0 ? (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>{unreadNotifsCount}</Text>
              </View>
            ) : null}
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/(tabs)/profile' as any)}
            style={styles.avatarBtn}
          >
            <Avatar uri={user.avatar} name={user.name} size={36} isOnline isVerified={user.isVerified} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Greeting or Title section */}
      {hideGreeting ? null : title ? (
        <View style={styles.titleSection}>
          <Text style={styles.pageTitle}>{title}</Text>
          {subtitle ? <Text style={styles.pageSubtitle}>{subtitle}</Text> : null}
        </View>
      ) : (
        <View style={styles.greetingSection}>
          <Text style={styles.greetingGreeting}>Welcome back, {user?.name ? user.name.split(' ')[0] : 'Student'}</Text>
          <Text style={styles.greetingMission}>Build something that matters today.</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  wordmark: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  wordmarkHighlight: {
    color: Colors.primary,
  },
  badgePill: {
    backgroundColor: Colors.primarySubtle,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.6,
  },
  actionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: Colors.primary,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#FFF',
  },
  avatarBtn: {
    marginLeft: 4,
  },
  titleSection: {
    marginTop: 4,
    marginBottom: 6,
  },
  pageTitle: {
    fontSize: Typography.title2,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  pageSubtitle: {
    fontSize: Typography.subhead,
    color: Colors.textMuted,
    marginTop: 2,
  },
  greetingSection: {
    marginBottom: 4,
  },
  greetingGreeting: {
    fontSize: Typography.title3,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  greetingMission: {
    fontSize: Typography.subhead,
    color: Colors.textMuted,
    marginTop: 2,
  },
});
