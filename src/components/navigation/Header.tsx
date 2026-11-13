import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing } from '../../constants/theme';
import { useApp } from '../../context/AppContext';

export interface HeaderProps {
  showSearch?: boolean;
  showChats?: boolean;
  title?: string;
  subtitle?: string;
  hideGreeting?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  showSearch = true,
  showChats = true,
  title,
  subtitle,
  hideGreeting,
}) => {
  const { user, unreadNotifsCount } = useApp();

  return (
    <View style={[styles.container, hideGreeting && styles.containerCompact]}>
      {/* Top bar: wordmark and available navigation actions */}
      <View style={[styles.topBar, hideGreeting && styles.topBarCompact]}>
        <TouchableOpacity
          style={styles.brandContainer}
          activeOpacity={0.8}
          onPress={() => router.push('/(tabs)')}
        >
          <Text style={styles.wordmark}>
            STU<Text style={styles.wordmarkHighlight}>DOS</Text>
          </Text>
        </TouchableOpacity>

        <View style={styles.actionsRight}>
          {showSearch ? <TouchableOpacity
            accessibilityLabel="Search"
            style={styles.iconBtn}
            onPress={() => router.push('/search' as any)}
          >
            <Ionicons name="search-outline" size={22} color={Colors.textSecondary} />
          </TouchableOpacity> : null}

          {showChats ? <TouchableOpacity
            accessibilityLabel="Chats"
            style={styles.iconBtn}
            onPress={() => router.push('/messages' as never)}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={21} color={Colors.textSecondary} />
          </TouchableOpacity> : null}

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
    paddingTop: 4,
    paddingBottom: 8,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  containerCompact: { paddingTop: 6, paddingBottom: 7 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  topBarCompact: { marginBottom: 0 },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  wordmark: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.textPrimary,
    letterSpacing: 0,
  },
  wordmarkHighlight: {
    color: Colors.primary,
  },
  actionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
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
