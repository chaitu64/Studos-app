import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, BorderRadius } from '../../constants/theme';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { Chip } from '../../components/ui/Chip';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { useApp } from '../../context/AppContext';
import { studentDirectoryService } from '../../services/studentDirectoryService';
import { sharedContentService } from '../../services/sharedContentService';
import { supabaseConfigured } from '../../services/supabase';
import { ChatRoom, StudentDirectoryProfile } from '../../types';

const SEARCH_TABS = ['All', 'Students', 'Ideas', 'Teams', 'Opportunities', 'Rooms'];
const TRENDING_KEYWORDS: string[] = [];

export default function GlobalSearchScreen() {
  const { ideas, teams, opportunities } = useApp();
  const [students, setStudents] = useState<StudentDirectoryProfile[]>([]);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  useEffect(() => { let active = true; void studentDirectoryService.list({ limit: 500 }).then((page) => { if (active) setStudents(page.students); }).catch(() => { if (active) setStudents([]); }); if (supabaseConfigured) void sharedContentService.chatRooms().then((rows) => { if (active) setRooms(rows); }).catch(() => { if (active) setRooms([]); }); return () => { active = false; }; }, []);
  const [query, setQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState('All');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const messageStudent = async (studentId: string) => { try { const conversationId = await sharedContentService.startDirectConversation(studentId); router.push(`/chat/${conversationId}` as never); } catch (cause) { Alert.alert('Could not start a conversation', cause instanceof Error ? cause.message : 'Try again.'); } };

  const q = query.trim().toLowerCase();

  // Search Results
  const matchedStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      s.college.toLowerCase().includes(q) ||
      (s.branch || '').toLowerCase().includes(q) || s.skills.some((sk) => sk.toLowerCase().includes(q)) || s.interests.some((item) => item.toLowerCase().includes(q))
  );

  const matchedIdeas = ideas.filter(
    (i) =>
      i.title.toLowerCase().includes(q) ||
      i.tagline.toLowerCase().includes(q) ||
      i.category.toLowerCase().includes(q)
  );

  const matchedTeams = teams.filter(
    (t) =>
      t.name.toLowerCase().includes(q) ||
      t.tagline.toLowerCase().includes(q) ||
      t.projectDomain.toLowerCase().includes(q)
  );

  const matchedOpps = opportunities.filter(
    (o) =>
      o.title.toLowerCase().includes(q) ||
      o.organizer.toLowerCase().includes(q) ||
      o.type.toLowerCase().includes(q)
  );

  const matchedRooms = rooms.filter(
    (r) =>
      r.title.toLowerCase().includes(q) ||
      r.topic.toLowerCase().includes(q)
  );

  const totalResults =
    (q ? matchedStudents.length : 0) +
    (q ? matchedIdeas.length : 0) +
    (q ? matchedTeams.length : 0) +
    (q ? matchedOpps.length : 0) +
    (q ? matchedRooms.length : 0);

  const handleSelectKeyword = (kw: string) => {
    setQuery(kw);
    if (!recentSearches.includes(kw)) {
      setRecentSearches([kw, ...recentSearches.slice(0, 4)]);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Top Search Bar */}
      <View style={styles.searchBarRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.searchInputWrap}>
          <Ionicons name="search" size={18} color={Colors.textMuted} />
          <TextInput
            autoFocus
            placeholder="Search students, skills, hackathons, ideas..."
            placeholderTextColor={Colors.textSubtle}
            value={query}
            onChangeText={setQuery}
            style={styles.input}
          />
          {query ? (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {SEARCH_TABS.map((tab) => (
            <Chip
              key={tab}
              label={tab}
              selected={selectedTab === tab}
              onPress={() => setSelectedTab(tab)}
            />
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {!q ? (
          <View style={styles.emptyStateContainer}>
            {/* Recent Searches */}
            {recentSearches.length > 0 ? (
              <View style={styles.sectionBlock}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionHeaderTitle}>RECENT SEARCHES</Text>
                  <TouchableOpacity onPress={() => setRecentSearches([])}>
                    <Text style={styles.clearBtnText}>Clear</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.keywordsWrap}>
                  {recentSearches.map((kw) => (
                    <TouchableOpacity
                      key={kw}
                      style={styles.recentItem}
                      onPress={() => handleSelectKeyword(kw)}
                    >
                      <Ionicons name="time-outline" size={14} color={Colors.textMuted} />
                      <Text style={styles.recentItemText}>{kw}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : null}

            {/* Trending searches */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionHeaderTitle}>TRENDING IN THE STUDENT NETWORK</Text>
              <View style={styles.keywordsWrap}>
                {TRENDING_KEYWORDS.map((kw) => (
                  <Chip
                    key={kw}
                    label={`🔥 ${kw}`}
                    onPress={() => handleSelectKeyword(kw)}
                    style={{ marginBottom: 8 }}
                  />
                ))}
              </View>
            </View>
          </View>
        ) : totalResults === 0 ? (
          <EmptyState
            icon="search-outline"
            title="No Results Found"
            description={`We couldn't find anything matching "${query}". Try searching by technical skill or domain.`}
          />
        ) : (
          <View style={styles.resultsContainer}>
            {/* Students results */}
            {(selectedTab === 'All' || selectedTab === 'Students') && matchedStudents.length > 0 ? (
              <View style={styles.resultGroup}>
                <Text style={styles.groupHeader}>STUDENTS ({matchedStudents.length})</Text>
                {matchedStudents.map((s) => (
                  <Card
                    key={s.id}
                    variant="default"
                    style={styles.resultCard}
                    onPress={() => router.push(`/student/${s.identity.type}/${s.id}` as any)}
                  >
                    <Avatar uri={s.avatar} name={s.name} size={40} isVerified={s.isVerified} />
                    <View style={styles.resultInfo}>
                      <Text style={styles.resultName}>{s.name}{s.isDemo ? ' · Demo profile' : ''}</Text>
                      <Text style={styles.resultSub}>{s.college} • {s.branch || 'Student'}</Text>
                    </View>
                    <Badge label={s.branch || 'Student'} variant="primary" size="sm" />
                    {!s.isDemo ? <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Message ${s.name}`} onPress={() => { void messageStudent(s.id); }} style={{ padding: 10 }}><Ionicons name="chatbubble-ellipses-outline" size={19} color={Colors.primary}/></TouchableOpacity> : null}
                  </Card>
                ))}
              </View>
            ) : null}

            {/* Ideas results */}
            {(selectedTab === 'All' || selectedTab === 'Ideas') && matchedIdeas.length > 0 ? (
              <View style={styles.resultGroup}>
                <Text style={styles.groupHeader}>IDEAS ({matchedIdeas.length})</Text>
                {matchedIdeas.map((i) => (
                  <Card
                    key={i.id}
                    variant="default"
                    style={styles.resultCard}
                    onPress={() => router.push(`/ideahub/${i.id}` as any)}
                  >
                    <View style={styles.resultInfo}>
                      <Text style={styles.resultName}>{i.title}</Text>
                      <Text style={styles.resultSub} numberOfLines={1}>{i.tagline}</Text>
                    </View>
                    <Badge label={i.category} variant="outline" size="sm" />
                  </Card>
                ))}
              </View>
            ) : null}

            {/* Teams results */}
            {(selectedTab === 'All' || selectedTab === 'Teams') && matchedTeams.length > 0 ? (
              <View style={styles.resultGroup}>
                <Text style={styles.groupHeader}>TEAMS ({matchedTeams.length})</Text>
                {matchedTeams.map((t) => (
                  <Card
                    key={t.id}
                    variant="default"
                    style={styles.resultCard}
                    onPress={() => router.push(`/teams/${t.id}` as any)}
                  >
                    <View style={styles.resultInfo}>
                      <Text style={styles.resultName}>{t.name}</Text>
                      <Text style={styles.resultSub} numberOfLines={1}>{t.tagline}</Text>
                    </View>
                    <Badge label={t.stage} variant="purple" size="sm" />
                  </Card>
                ))}
              </View>
            ) : null}

            {/* Opportunities results */}
            {(selectedTab === 'All' || selectedTab === 'Opportunities') && matchedOpps.length > 0 ? (
              <View style={styles.resultGroup}>
                <Text style={styles.groupHeader}>OPPORTUNITIES ({matchedOpps.length})</Text>
                {matchedOpps.map((o) => (
                  <Card
                    key={o.id}
                    variant="default"
                    style={styles.resultCard}
                    onPress={() => router.push(`/opportunities/${o.id}` as any)}
                  >
                    <View style={styles.resultInfo}>
                      <Text style={styles.resultName}>{o.title}</Text>
                      <Text style={styles.resultSub}>{o.organizer} • {o.deadline}</Text>
                    </View>
                    <Badge label={o.type} variant="green" size="sm" />
                  </Card>
                ))}
              </View>
            ) : null}

            {/* Chat Rooms */}
            {(selectedTab === 'All' || selectedTab === 'Rooms') && matchedRooms.length > 0 ? (
              <View style={styles.resultGroup}>
                <Text style={styles.groupHeader}>CHAT ROOMS ({matchedRooms.length})</Text>
                {matchedRooms.map((r) => (
                  <Card
                    key={r.id}
                    variant="default"
                    style={styles.resultCard}
                    onPress={() => router.push('/chat-rooms' as any)}
                  >
                    <View style={styles.resultInfo}>
                      <Text style={styles.resultName}>{r.title}</Text>
                      <Text style={styles.resultSub} numberOfLines={1}>{r.topic}</Text>
                    </View>
                    <Badge label={`${r.membersCount} students`} variant="cyan" size="sm" />
                  </Card>
                ))}
              </View>
            ) : null}
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
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
  },
  backBtn: {
    padding: 8,
    marginRight: 4,
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    height: 42,
  },
  input: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: Typography.body,
    marginLeft: 8,
  },
  tabsRow: {
    marginBottom: 8,
  },
  tabsScroll: {
    paddingHorizontal: 16,
    gap: 6,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  emptyStateContainer: {
    gap: 24,
  },
  sectionBlock: {
    marginBottom: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionHeaderTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 0.8,
  },
  clearBtnText: {
    fontSize: Typography.caption,
    color: Colors.primary,
  },
  keywordsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 6,
  },
  recentItemText: {
    fontSize: Typography.footnote,
    color: Colors.textSecondary,
  },
  resultsContainer: {
    gap: 20,
  },
  resultGroup: {
    gap: 8,
  },
  groupHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  resultInfo: {
    flex: 1,
    marginHorizontal: 10,
  },
  resultName: {
    fontSize: Typography.body,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  resultSub: {
    fontSize: Typography.caption,
    color: Colors.textMuted,
    marginTop: 2,
  },
});
