import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { safeBack } from '@/navigation/safeBack';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, BorderRadius } from '../../constants/theme';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { SearchField } from '../../components/ui/SearchField';
import { useApp } from '../../context/AppContext';
import { studentDirectoryService } from '../../services/studentDirectoryService';
import { sharedContentService } from '../../services/sharedContentService';
import { supabaseConfigured } from '../../services/supabase';
import { ChatRoom, StudentDirectoryProfile, StudyResource } from '../../types';
import { studentCommunityService, StudentHelpRequest, StudentProblem, StudentTeamOpening } from '../../services/studentCommunityService';
import { studentServicesService } from '../../services/studentServicesService';
import type { StudentService } from '../../services/homeDiscoveryData';
import { listStudyResources } from '../../services/resourceApi';
import { visibleSearchResultCount } from '../../utils/globalSearch';

const SEARCH_TABS = ['All', 'Students', 'Ideas', 'Problems', 'Help requests', 'Openings', 'Services', 'Study resources', 'Posts', 'Teams', 'Opportunities', 'Rooms'];

export default function GlobalSearchScreen() {
  const { ideas, communityPosts, teams, opportunities, dataErrors, isLoading: appLoading } = useApp();
  const [students, setStudents] = useState<StudentDirectoryProfile[]>([]);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loadError, setLoadError] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => { let active = true; void Promise.allSettled([studentDirectoryService.list({ limit: 500 }), supabaseConfigured ? sharedContentService.chatRooms() : Promise.resolve([])]).then((results) => { if (!active) return; if (results[0].status === 'fulfilled') setStudents(results[0].value.students); else setStudents([]); if (results[1].status === 'fulfilled') setRooms(results[1].value); else setRooms([]); setLoadError(results.flatMap((result, index) => result.status === 'rejected' ? [index === 0 ? 'Students' : 'Rooms'] : []).join(', ')); }); return () => { active = false; }; }, [reload]);
  const [query, setQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState('All');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [problems, setProblems] = useState<StudentProblem[]>([]);
  const [helpRequests, setHelpRequests] = useState<StudentHelpRequest[]>([]);
  const [openings, setOpenings] = useState<StudentTeamOpening[]>([]);
  const [serviceRows, setServiceRows] = useState<StudentService[]>([]);
  const [resources, setResources] = useState<StudyResource[]>([]);
  const [sourceErrors, setSourceErrors] = useState<string[]>([]);
  const [searchingSources, setSearchingSources] = useState(false);

  const q = query.trim().toLowerCase();

  useEffect(() => {
    let active = true;
    let requestTimer: ReturnType<typeof setTimeout> | undefined;
    const startTimer = setTimeout(() => {
      if (!q) { setProblems([]); setHelpRequests([]); setOpenings([]); setServiceRows([]); setResources([]); setSourceErrors([]); setSearchingSources(false); return; }
      setSearchingSources(true);
      requestTimer = setTimeout(() => {
      void Promise.allSettled([
        studentCommunityService.problems(), studentCommunityService.helpRequests(), studentCommunityService.teamOpenings(),
        studentServicesService.listDiscoverable(), listStudyResources({ search: q, limit: 30 }),
      ]).then((results) => {
        if (!active) return;
        const names = ['Problems', 'Help requests', 'Team openings', 'Services', 'Study resources'];
        const errors: string[] = [];
        const value = <T,>(index: number): T[] => { const result = results[index]; if (result.status === 'rejected') { errors.push(names[index]); return []; } return result.value as T[]; };
        setProblems(value<StudentProblem>(0)); setHelpRequests(value<StudentHelpRequest>(1)); setOpenings(value<StudentTeamOpening>(2)); setServiceRows(value<StudentService>(3)); setResources(value<StudyResource>(4));
        setSourceErrors(errors); setSearchingSources(false);
      });
      }, 280);
    }, 0);
    return () => { active = false; clearTimeout(startTimer); if (requestTimer) clearTimeout(requestTimer); };
  }, [q, reload]);

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

  const matchedPosts = communityPosts.filter((post) => `${post.title} ${post.content} ${post.author.name} ${post.category || ''} ${(post.tags || []).join(' ')}`.toLowerCase().includes(q));

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
  const matchedProblems = q ? problems.filter((item) => `${item.title} ${item.description} ${item.category} ${item.tags.join(' ')} ${item.author.name}`.toLowerCase().includes(q)) : [];
  const matchedHelp = q ? helpRequests.filter((item) => `${item.title} ${item.description} ${item.category} ${item.helpType} ${item.skillsNeeded.join(' ')} ${item.author.name}`.toLowerCase().includes(q)) : [];
  const matchedOpenings = q ? openings.filter((item) => `${item.eventName} ${item.roleTitle} ${item.description} ${item.skillsNeeded.join(' ')} ${item.author.name}`.toLowerCase().includes(q)) : [];
  const matchedServices = q ? serviceRows.filter((item) => `${item.title} ${item.description} ${item.category} ${item.provider.name}`.toLowerCase().includes(q)) : [];
  const matchedResources = q ? resources.filter((item) => `${item.title} ${item.subject} ${item.description} ${item.type}`.toLowerCase().includes(q)) : [];

  const totalResults =
    (q ? matchedStudents.length : 0) +
    (q ? matchedPosts.length : 0) +
    (q ? matchedIdeas.length : 0) +
    (q ? matchedTeams.length : 0) +
    (q ? matchedOpps.length : 0) +
    (q ? matchedRooms.length : 0) + matchedProblems.length + matchedHelp.length + matchedOpenings.length + matchedServices.length + matchedResources.length;
  const appSourceErrors = ['students', 'ideas', 'teams', 'posts', 'opportunities'].filter((key) => dataErrors[key]);
  const unavailableSources = [...new Set([...sourceErrors, ...loadError.split(', ').filter(Boolean), ...appSourceErrors.map((key) => `${key} data`)])];
  const visibleResultCount = visibleSearchResultCount(selectedTab, {
    Students: matchedStudents.length,
    Posts: matchedPosts.length,
    Ideas: matchedIdeas.length,
    Teams: matchedTeams.length,
    Opportunities: matchedOpps.length,
    Problems: matchedProblems.length,
    'Help requests': matchedHelp.length,
    Openings: matchedOpenings.length,
    Services: matchedServices.length,
    'Study resources': matchedResources.length,
    Rooms: matchedRooms.length,
  }, totalResults);

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
        <TouchableOpacity style={styles.backBtn} onPress={() => safeBack()}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>

        <SearchField
          accessibilityLabel="Search STUDOS"
          autoFocus
          placeholder="Search people, ideas, teams..."
          value={query}
          onChangeText={setQuery}
          style={styles.searchField}
        />
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          <View style={styles.segmented}>
            {SEARCH_TABS.map((tab) => (
              <TouchableOpacity key={tab} accessibilityRole="tab" accessibilityState={{ selected: selectedTab === tab }} style={[styles.segment, selectedTab === tab && styles.segmentActive]} onPress={() => setSelectedTab(tab)}>
                <Text style={[styles.segmentText, selectedTab === tab && styles.segmentTextActive]}>{tab}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {q && totalResults > 0 && unavailableSources.length > 0 ? <View style={styles.partialNotice}><Text style={styles.partialText}>Some sources are unavailable: {unavailableSources.join(', ')}. Other results are shown.</Text><TouchableOpacity accessibilityRole="button" onPress={() => setReload((value) => value + 1)}><Text style={styles.loadErrorAction}>Retry</Text></TouchableOpacity></View> : null}
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

            {!recentSearches.length ? (
              <View style={styles.searchHint}>
                <View style={styles.searchHintIcon}><Ionicons name="search-outline" size={22} color={Colors.primary} /></View>
                <Text style={styles.searchHintTitle}>Search the student network</Text>
                <Text style={styles.searchHintText}>Find students, ideas, teams, opportunities, and study rooms.</Text>
              </View>
            ) : null}
          </View>
        ) : searchingSources || (appLoading && totalResults === 0) ? (
          <View style={styles.searching}><Text style={styles.searchingText}>Searching STUDOS…</Text></View>
        ) : visibleResultCount === 0 ? (
          <EmptyState
            icon="search-outline"
            title={`No ${selectedTab === 'All' ? 'results' : selectedTab.toLowerCase()} found`}
            description={unavailableSources.length ? `No results from the sources that loaded. ${unavailableSources.join(', ')} could not be searched. Retry or try another term.` : `Nothing matches "${query}" here. Try another term or select a different category.`}
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
                      <Text style={styles.resultName} numberOfLines={1}>{s.name}{s.isDemo ? ' · Demo profile' : ''}</Text>
                      <Text style={styles.resultSub} numberOfLines={2}>{[s.college, s.branch || 'Student'].filter(Boolean).join(' · ')}</Text>
                    </View>
                    <Badge label={s.branch || 'Student'} variant="primary" size="sm" />
                  </Card>
                ))}
              </View>
            ) : null}

            {(selectedTab === 'All' || selectedTab === 'Posts') && matchedPosts.length > 0 ? (
              <View style={styles.resultGroup}>
                <Text style={styles.groupHeader}>POSTS ({matchedPosts.length})</Text>
                {matchedPosts.map((post) => <Card key={post.id} variant="default" style={styles.resultCard} onPress={() => router.push(`/post/${post.id}` as never)}><Avatar uri={post.author.avatar} name={post.author.name} size={38} /><View style={styles.resultInfo}><Text style={styles.resultName} numberOfLines={2}>{post.title}</Text><Text style={styles.resultSub} numberOfLines={2}>{post.author.name} · {post.content}</Text></View></Card>)}
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
                      <Text style={styles.resultName} numberOfLines={2}>{i.title}</Text>
                      <Text style={styles.resultSub} numberOfLines={1}>{i.tagline}</Text>
                    </View>
                    <Badge label={i.category} variant="outline" size="sm" />
                  </Card>
                ))}
              </View>
            ) : null}

            {(selectedTab === 'All' || selectedTab === 'Problems') && matchedProblems.length > 0 ? <View style={styles.resultGroup}><Text style={styles.groupHeader}>PROBLEMS ({matchedProblems.length})</Text>{matchedProblems.map((problem) => <Card key={problem.id} variant="default" style={styles.resultCard} onPress={() => router.push({ pathname: '/community/[kind]/[id]', params: { kind: 'problem', id: problem.id } } as never)}><Avatar uri={problem.author.avatar} name={problem.author.name} size={38}/><View style={styles.resultInfo}><Text style={styles.resultName} numberOfLines={2}>{problem.title}{problem.isDemo ? ' · Demo' : ''}</Text><Text style={styles.resultSub} numberOfLines={2}>{problem.category} · {problem.description}</Text></View></Card>)}</View> : null}

            {(selectedTab === 'All' || selectedTab === 'Help requests') && matchedHelp.length > 0 ? <View style={styles.resultGroup}><Text style={styles.groupHeader}>HELP REQUESTS ({matchedHelp.length})</Text>{matchedHelp.map((help) => <Card key={help.id} variant="default" style={styles.resultCard} onPress={() => router.push({ pathname: '/community/[kind]/[id]', params: { kind: 'help', id: help.id } } as never)}><Avatar uri={help.author.avatar} name={help.author.name} size={38}/><View style={styles.resultInfo}><Text style={styles.resultName} numberOfLines={2}>{help.title}{help.isDemo ? ' · Demo' : ''}</Text><Text style={styles.resultSub} numberOfLines={2}>{help.helpType} · {help.skillsNeeded.join(', ')}</Text></View></Card>)}</View> : null}

            {(selectedTab === 'All' || selectedTab === 'Openings') && matchedOpenings.length > 0 ? <View style={styles.resultGroup}><Text style={styles.groupHeader}>TEAM OPENINGS ({matchedOpenings.length})</Text>{matchedOpenings.map((opening) => <Card key={opening.id} variant="default" style={styles.resultCard} onPress={() => router.push({ pathname: '/(tabs)/swipe', params: { section: 'teammates', search: opening.roleTitle } } as never)}><Avatar uri={opening.author.avatar} name={opening.author.name} size={38}/><View style={styles.resultInfo}><Text style={styles.resultName} numberOfLines={2}>{opening.roleTitle}{opening.isDemo ? ' · Demo' : ''}</Text><Text style={styles.resultSub} numberOfLines={2}>{opening.eventName} · {opening.skillsNeeded.join(', ')}</Text></View></Card>)}</View> : null}

            {(selectedTab === 'All' || selectedTab === 'Services') && matchedServices.length > 0 ? <View style={styles.resultGroup}><Text style={styles.groupHeader}>STUDENT SERVICES ({matchedServices.length})</Text>{matchedServices.map((service) => <Card key={service.id} variant="default" style={styles.resultCard} onPress={() => router.push({ pathname: '/(tabs)/swipe', params: { section: 'services', search: service.title } } as never)}><Avatar uri={service.provider.avatar} name={service.provider.name} size={38}/><View style={styles.resultInfo}><Text style={styles.resultName} numberOfLines={2}>{service.title}</Text><Text style={styles.resultSub} numberOfLines={2}>{service.category} · {service.provider.name}</Text></View>{service.startingPrice != null ? <Badge label={`From ${service.startingPrice}`} variant="outline" size="sm"/> : null}</Card>)}</View> : null}

            {(selectedTab === 'All' || selectedTab === 'Study resources') && matchedResources.length > 0 ? <View style={styles.resultGroup}><Text style={styles.groupHeader}>STUDY RESOURCES ({matchedResources.length})</Text>{matchedResources.map((resource) => <Card key={resource.id} variant="default" style={styles.resultCard} onPress={() => router.push(`/resource/${resource.id}` as never)}><View style={styles.resultInfo}><Text style={styles.resultName} numberOfLines={2}>{resource.title}</Text><Text style={styles.resultSub} numberOfLines={2}>{resource.subject} · {resource.studyYear || resource.academicYear} · {resource.semester || ''}</Text></View><Badge label="PDF" variant="outline" size="sm"/></Card>)}</View> : null}

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
                      <Text style={styles.resultName} numberOfLines={2}>{t.name}</Text>
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
                      <Text style={styles.resultName} numberOfLines={2}>{o.title}</Text>
                      <Text style={styles.resultSub} numberOfLines={2}>{o.organizer} · {o.deadline}</Text>
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
                    {r.membersCount !== undefined ? <Badge label={`${r.membersCount} students`} variant="cyan" size="sm" /> : null}
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
    paddingTop: 6,
    paddingBottom: 8,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchField: {
    flex: 1,
  },
  tabsRow: {
    marginBottom: 8,
  },
  tabsScroll: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  segmented: { flexDirection: 'row', padding: 4, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, gap: 2 },
  segment: { minWidth: 70, minHeight: 40, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, borderRadius: BorderRadius.sm },
  segmentActive: { backgroundColor: Colors.surfaceHighlight },
  segmentText: { color: Colors.textMuted, fontSize: Typography.caption, fontWeight: Typography.medium },
  segmentTextActive: { color: Colors.textPrimary, fontWeight: Typography.semiBold },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    width: '100%',
    maxWidth: 900,
    alignSelf: 'center',
  },
  loadError: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: 12, marginBottom: 12, borderRadius: BorderRadius.md, backgroundColor: Colors.errorSubtle },
  loadErrorText: { flex: 1, color: Colors.error, fontSize: Typography.caption, lineHeight: 17 },
  loadErrorAction: { color: Colors.error, fontSize: Typography.caption, fontWeight: Typography.bold, padding: 8 },
  partialNotice: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: 9, marginBottom: 12, borderRadius: BorderRadius.md, backgroundColor: Colors.surfaceElevated },
  partialText: { flex: 1, color: Colors.textMuted, fontSize: 11, lineHeight: 16 },
  searching: { alignItems: 'center', padding: 26 },
  searchingText: { color: Colors.textMuted, fontSize: Typography.footnote },
  emptyStateContainer: {
    flex: 1,
    gap: 24,
    paddingTop: 16,
  },
  searchHint: { alignItems: 'center', paddingHorizontal: 24, paddingVertical: 36, borderRadius: 18, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  searchHintIcon: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: Colors.primarySubtle, marginBottom: 14 },
  searchHintTitle: { color: Colors.textPrimary, fontSize: Typography.headline, fontWeight: Typography.bold },
  searchHintText: { maxWidth: 260, color: Colors.textMuted, fontSize: Typography.footnote, lineHeight: 20, textAlign: 'center', marginTop: 6 },
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
    minHeight: 44,
    paddingVertical: 8,
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
    minHeight: 72,
    gap: 8,
  },
  resultInfo: {
    flex: 1,
    minWidth: 0,
    marginHorizontal: 6,
  },
  resultName: {
    fontSize: Typography.body,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  resultSub: {
    fontSize: Typography.footnote,
    color: Colors.textMuted,
    marginTop: 2,
    lineHeight: 17,
  },
});
