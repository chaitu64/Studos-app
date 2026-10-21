import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { Chip } from '../../components/ui/Chip';
import { useApp } from '../../context/AppContext';

export default function ChatListScreen() {
  const { conversations } = useApp();
  const [selectedTab, setSelectedTab] = useState<'all' | 'direct' | 'team' | 'idea'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = conversations.filter((c) => {
    const matchesTab = selectedTab === 'all' || c.type === selectedTab;
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'match':
        return <Badge label="Match" variant="primary" size="sm" />;
      case 'team':
        return <Badge label="Team Room" variant="cyan" size="sm" />;
      case 'idea':
        return <Badge label="Idea Discussion" variant="purple" size="sm" />;
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Messages & Collab</Text>
          <Text style={styles.subtitle}>Direct chats, team rooms & matched partners</Text>
        </View>

        <TouchableOpacity
          style={styles.exploreRoomsBtn}
          onPress={() => router.push('/chat-rooms' as any)}
        >
          <Ionicons name="planet-outline" size={16} color={Colors.primary} />
          <Text style={styles.exploreRoomsText}>Public Rooms</Text>
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color={Colors.textMuted} />
          <TextInput
            placeholder="Search conversations, teams, keywords..."
            placeholderTextColor={Colors.textSubtle}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabsRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          <Chip label="All Messages" selected={selectedTab === 'all'} onPress={() => setSelectedTab('all')} />
          <Chip label="Matches & 1:1" selected={selectedTab === 'direct'} onPress={() => setSelectedTab('direct')} />
          <Chip label="Team Rooms" selected={selectedTab === 'team'} onPress={() => setSelectedTab('team')} />
          <Chip label="Idea Discussions" selected={selectedTab === 'idea'} onPress={() => setSelectedTab('idea')} />
        </ScrollView>
      </View>

      {/* Conversation List */}
      <ScrollView contentContainerStyle={styles.listContainer}>
        {filtered.length > 0 ? (
          filtered.map((conv) => (
            <TouchableOpacity
              key={conv.id}
              activeOpacity={0.75}
              style={styles.conversationItem}
              onPress={() => router.push(`/chat/${conv.id}` as any)}
            >
              <Avatar
                uri={conv.avatar}
                name={conv.name}
                size={52}
                isOnline={conv.type === 'match' || conv.type === 'direct'}
              />

              <View style={styles.convDetails}>
                <View style={styles.convTopRow}>
                  <Text style={styles.convName} numberOfLines={1}>
                    {conv.name}
                  </Text>
                  <Text style={styles.convTime}>{conv.lastMessageTime}</Text>
                </View>

                {conv.subtitle ? (
                  <View style={styles.subtitleRow}>
                    <Text style={styles.convSubtitle} numberOfLines={1}>
                      {conv.subtitle}
                    </Text>
                    {getTypeBadge(conv.type)}
                  </View>
                ) : null}

                <View style={styles.convBottomRow}>
                  <Text
                    style={[
                      styles.lastMessage,
                      conv.unreadCount > 0 ? styles.unreadMessageText : undefined,
                    ]}
                    numberOfLines={1}
                  >
                    {conv.lastMessage}
                  </Text>
                  {conv.unreadCount > 0 ? (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadCountText}>{conv.unreadCount}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyWrap}>
            <Ionicons name="chatbubble-outline" size={48} color={Colors.textDisabled} />
            <Text style={styles.emptyTitle}>No conversations found</Text>
            <Text style={styles.emptySub}>
              Match with collaborators in Discover or apply to a team to start a chat room.
            </Text>
          </View>
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
  },
  title: {
    fontSize: Typography.title2,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: Typography.caption,
    color: Colors.textMuted,
    marginTop: 2,
  },
  exploreRoomsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primarySubtle,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  exploreRoomsText: {
    fontSize: Typography.footnote,
    fontWeight: Typography.bold,
    color: Colors.primary,
    marginLeft: 6,
  },
  searchWrapper: {
    paddingHorizontal: Spacing.screenPadding,
    marginBottom: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    height: 42,
  },
  searchInput: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: Typography.body,
    marginLeft: 8,
  },
  tabsRow: {
    marginBottom: 8,
  },
  tabsScroll: {
    paddingHorizontal: Spacing.screenPadding,
  },
  listContainer: {
    paddingHorizontal: Spacing.screenPadding,
    paddingBottom: 30,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 12,
    marginBottom: 10,
  },
  convDetails: {
    flex: 1,
    marginLeft: 12,
  },
  convTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  convName: {
    fontSize: Typography.headline,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    flex: 1,
    marginRight: 6,
  },
  convTime: {
    fontSize: 11,
    color: Colors.textSubtle,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  convSubtitle: {
    fontSize: Typography.caption,
    color: Colors.textMuted,
    flex: 1,
    marginRight: 6,
  },
  convBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: Typography.footnote,
    color: Colors.textSecondary,
    flex: 1,
    marginRight: 8,
  },
  unreadMessageText: {
    color: Colors.textPrimary,
    fontWeight: Typography.semiBold,
  },
  unreadBadge: {
    backgroundColor: Colors.primary,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadCountText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFF',
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: Typography.headline,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    marginTop: 12,
  },
  emptySub: {
    fontSize: Typography.body,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 260,
  },
});
