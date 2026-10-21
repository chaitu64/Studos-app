import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
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
  const { notifications, markNotificationRead, markAllNotificationsRead } = useApp();

  const handleNotificationPress = async (item: NotificationItem) => {
    await markNotificationRead(item.id);
    switch (item.type) {
      case 'match':
      case 'message':
        router.push('/chat/conv_1' as any);
        break;
      case 'team_application':
      case 'team_invite':
        router.push('/teams/team_1' as any);
        break;
      case 'deadline':
        router.push('/opportunities/opp_1' as any);
        break;
      case 'achievement':
        router.push('/leaderboard' as any);
        break;
      default:
        break;
    }
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
          title="Mark All as Read"
          variant="ghost"
          size="sm"
          onPress={markAllNotificationsRead}
        />
      </View>

      <ScrollView contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false}>
        {notifications.length > 0 ? (
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
                    {item.title}
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
            description="You will receive alerts here when peers swipe on your profile, apply to your teams, or message you."
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
