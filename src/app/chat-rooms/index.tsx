import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { sharedContentService } from '../../services/sharedContentService';
import { supabaseConfigured } from '../../services/supabase';
import { ChatRoom } from '../../types';

export default function ChatRoomsScreen() {
  const [rooms, setRooms] = useState<ChatRoom[]>([]); const [loading, setLoading] = useState(false); const [error, setError] = useState(supabaseConfigured ? '' : 'Configure Supabase to load chat rooms.');
  useEffect(() => { if (!supabaseConfigured) return; let active = true; void sharedContentService.chatRooms().then((rows) => { if (active) setRooms(rows); }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'Could not load chat rooms.'); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, []);
  const handleJoinRoom = async (roomId: string) => {
    try { if (supabaseConfigured) await sharedContentService.joinChatRoom(roomId); router.push({ pathname: '/chat/room/[id]', params: { id: roomId } } as never); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not join this room.'); }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Topic Innovation Rooms</Text>
          <Text style={styles.subtitle}>
            Join public student circles discussing papers, hardware, hackathon strategies, and startup growth.
          </Text>
        </View>

        {loading ? <ActivityIndicator color={Colors.primary} style={{ margin: 30 }} /> : null}
        {error ? <Text style={styles.subtitle}>{error}</Text> : null}
        <View style={styles.roomsList}>
          {rooms.map((room) => (
            <Card key={room.id} variant="default" style={styles.roomCard}>
              <View style={styles.roomHeader}>
                <View style={styles.iconCircle}>
                  <Ionicons name="chatbubbles" size={20} color={Colors.primary} />
                </View>
                <View style={styles.roomTitleWrap}>
                  <Text style={styles.roomTitle}>{room.title}</Text>
                  <Text style={styles.roomTopic} numberOfLines={1}>{room.topic}</Text>
                </View>
                {room.isPrivate ? (
                  <Badge label="Invite-Only" variant="outline" size="sm" />
                ) : (
                  <View style={styles.activePill}>
                    <View style={styles.greenDot} />
                    <Text style={styles.activeText}>{room.activeNow} online</Text>
                  </View>
                )}
              </View>

              <Text style={styles.roomDesc}>{room.description}</Text>

              <View style={styles.roomFooter}>
                <View style={styles.memberStats}>
                  <Ionicons name="people-outline" size={14} color={Colors.textMuted} />
                  <Text style={styles.memberText}>{room.membersCount} students</Text>
                </View>

                <Button
                  title="Enter Room"
                  variant="primary"
                  size="sm"
                  onPress={() => { void handleJoinRoom(room.id); }}
                />
              </View>
            </Card>
          ))}
          {!loading && !rooms.length ? <Text style={styles.subtitle}>No public chat rooms are available yet.</Text> : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContainer: {
    padding: Spacing.screenPadding,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: Typography.title2,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: Typography.body,
    color: Colors.textMuted,
    lineHeight: 20,
    marginTop: 4,
  },
  roomsList: {
    gap: 12,
  },
  roomCard: {
    padding: 16,
  },
  roomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primarySubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  roomTitleWrap: {
    flex: 1,
  },
  roomTitle: {
    fontSize: Typography.headline,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  roomTopic: {
    fontSize: Typography.caption,
    color: Colors.textMuted,
    marginTop: 1,
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceHighlight,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: BorderRadius.full,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.success,
    marginRight: 4,
  },
  activeText: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: Typography.medium,
  },
  roomDesc: {
    fontSize: Typography.footnote,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 14,
  },
  roomFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 10,
  },
  memberStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberText: {
    fontSize: Typography.caption,
    color: Colors.textMuted,
    marginLeft: 6,
  },
});
