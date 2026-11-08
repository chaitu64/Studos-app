import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { useApp } from '../../context/AppContext';
import { NotificationItem } from '../../types';

export default function NotificationsScreen() {
  const { notifications, notificationsLoading, notificationsError, refreshNotifications, markNotificationRead, markAllNotificationsRead } = useApp();

  const openAllowedTarget = (target?: string) => {
    if (!target || !target.startsWith('/') || target.startsWith('//') || target.includes('..')) return;
    const allowed = target === '/messages' || target === '/notifications' || target === '/search'
      || /^\/\(tabs\)\/(index|study|explore|swipe|profile)$/.test(target)
      || /^\/(chat|ideahub|problem|help|teams|post|opportunities)\/[0-9a-f-]{8,}$/i.test(target)
      || /^\/community\/(problem|help)\/[0-9a-f-]{8,}$/i.test(target);
    if (allowed) router.push(target as never);
  };

  const handleNotificationPress = async (item: NotificationItem) => {
    try {
      await markNotificationRead(item.id);
      openAllowedTarget(item.actionUrl);
    } catch (cause) {
      Alert.alert('Could not update notification', cause instanceof Error ? cause.message : 'Please try again.');
    }
  };

  const handleMarkAll = async () => {
    try { await markAllNotificationsRead(); }
    catch (cause) { Alert.alert('Could not update notifications', cause instanceof Error ? cause.message : 'Please try again.'); }
  };

  const getIconForType = (type: NotificationItem['type']) => {
    switch (type) {
      case 'match':
        return <Ionicons name="flash" size={18} color={Colors.primary} />;
      case 'team_application':
      case 'team_invite':
        return <Ionicons name="people" size={18} color={Colors.accentCyan} />;
      case 'deadline':
        return <Ionicons name="time" size={18} color={Colors.accentAmber} />;
      case 'achievement':
        return <Ionicons name="trophy" size={18} color={Colors.accentAmber} />;
      default:
        return <Ionicons name="notifications" size={18} color={Colors.primary} />;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      {/* Header Controls */}
      <View style={styles.header}>
        <Text style={styles.title}>Activity Center</Text>
        <Button
          title="Mark all as read"
          variant="ghost"
          size="sm"
          disabled={!notifications.some((item) => !item.read)}
          onPress={() => { void handleMarkAll(); }}
        />
      </View>

      <ScrollView contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false}>
        {notificationsError ? <View style={styles.errorState}><Text style={styles.errorText}>Notifications could not be loaded: {notificationsError}</Text><Button title="Retry" variant="outline" size="sm" onPress={() => { void refreshNotifications(); }} /></View> : notificationsLoading ? (
          <View style={styles.loading}><Text style={styles.loadingText}>Loading notifications…</Text></View>
        ) : notifications.length > 0 ? (
          notifications.map((item) => (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.8}
              style={[
                styles.notifCard,
                !item.read ? styles.notifCardUnread : undefined,
              ]}
              onPress={() => handleNotificationPress(item)}
            >
              <View style={styles.iconCircle}>
                {item.avatar ? (
                  <Avatar uri={item.avatar} name={item.title} size={40} />
                ) : (
                  getIconForType(item.type)
                )}
              </View>

              <View style={styles.notifInfo}>
                <View style={styles.notifHeaderRow}>
                  <Text style={styles.notifTitle} numberOfLines={1}>
                    {item.title}{item.isDemo ? ' · Demo' : ''}
                  </Text>
                  <Text style={styles.notifTime}>{item.timestamp}</Text>
                </View>
                <Text style={styles.notifMsg}>{item.message}</Text>
              </View>

              {!item.read ? <View style={styles.unreadDot} /> : null}
            </TouchableOpacity>
          ))
        ) : (
          <EmptyState
            icon="notifications-off-outline"
            title="All quiet here"
            description="You’re all caught up. New notifications will appear here when they’re sent to your account."
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: Typography.title3,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  listContainer: {
    padding: Spacing.screenPadding,
    gap: 10,
  },
  errorState: { alignItems: 'center', gap: 12, padding: 20, borderRadius: BorderRadius.lg, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  errorText: { color: Colors.error, fontSize: Typography.footnote, lineHeight: 19, textAlign: 'center' },
  loading: { padding: 28, alignItems: 'center' },
  loadingText: { color: Colors.textMuted, fontSize: Typography.footnote },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 12,
  },
  notifCardUnread: {
    borderColor: Colors.primaryBorder,
    backgroundColor: Colors.surfaceElevated,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.surfaceHighlight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifInfo: {
    flex: 1,
    marginLeft: 12,
  },
  notifHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  notifTitle: {
    fontSize: Typography.subhead,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    flex: 1,
    marginRight: 6,
  },
  notifTime: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  notifMsg: {
    fontSize: Typography.footnote,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginLeft: 8,
  },
});
