import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Linking,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { Header } from '../../components/navigation/Header';
import { Chip } from '../../components/ui/Chip';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { IdeaCard } from '../../components/cards/IdeaCard';
import { OpportunityCard } from '../../components/cards/OpportunityCard';
import { TeamCard } from '../../components/cards/TeamCard';
import { ProjectCard } from '../../components/cards/ProjectCard';
import { useApp } from '../../context/AppContext';
import { MOCK_STUDENTS } from '../../services/mockData';
import { Opportunity } from '../../types';

const HOME_OPPORTUNITY_CATEGORIES = [
  'Hackathons',
  'Internships',
  'Jobs',
  'Competitions',
  'Quizzes',
  'Scholarships',
  'Workshops',
  'Conferences / Meets',
];

export default function HomeScreen() {
  const {
    user,
    ideas,
    teams,
    opportunities,
    projects,
    leaderboard,
    toggleSaveOpportunity,
    refreshAll,
  } = useApp();

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshAll();
    setRefreshing(false);
  };

  // Category navigation: Selecting any category opens Explore with that category pre-selected
  const handleSelectCategory = (category: string) => {
    router.push({
      pathname: '/(tabs)/explore',
      params: { category },
    } as any);
  };

  // 1. Closing Soon: Opportunities with nearest valid upcoming registration deadlines
  const closingSoonOpportunities = useMemo(() => {
    return [...opportunities]
      .filter((o) => (o.daysRemaining !== undefined ? o.daysRemaining >= 0 : true))
      .sort((a, b) => (a.daysRemaining || 999) - (b.daysRemaining || 999))
      .slice(0, 3);
  }, [opportunities]);

  // 2. Featured Hackathons and Internships
  const featuredHackathonsAndInternships = useMemo(() => {
    return opportunities
      .filter(
        (o) =>
          o.type === 'Hackathon' ||
          o.type === 'Internship' ||
          o.category === 'Hackathons' ||
          o.category === 'Internships'
      )
      .slice(0, 3);
  }, [opportunities]);

  // 3. Recommended Opportunities: Matched by user primaryRole/skills or curated top
  const recommendedOpportunities = useMemo(() => {
    const userRole = user.primaryRole?.toLowerCase() || '';
    const userSkills = user.skills?.map((s) => s.toLowerCase()) || [];

    const matched = opportunities.filter((o) => {
      const skillsMatch = o.requiredSkills?.some((sk) =>
        userSkills.includes(sk.toLowerCase())
      );
      const titleMatch =
        o.title.toLowerCase().includes(userRole) ||
        o.description.toLowerCase().includes(userRole);
      return skillsMatch || titleMatch;
    });

    return (matched.length > 0 ? matched : opportunities).slice(0, 3);
  }, [opportunities, user]);

  // 4. Saved Opportunities
  const savedOpportunities = useMemo(() => {
    return opportunities.filter((o) => o.isSaved);
  }, [opportunities]);

  // 5. Trending Ideas, Teams & Collaborators
  const trendingIdeas = ideas.slice(0, 3);
  const activeTeams = teams.slice(0, 2);
  const topStudents = MOCK_STUDENTS.slice(0, 4);
  const recentProjects = projects.slice(0, 2);

  const handleRegisterDirect = async (opp: Opportunity) => {
    try {
      const supported = await Linking.canOpenURL(opp.officialUrl);
      if (supported) {
        await Linking.openURL(opp.officialUrl);
      } else {
        Alert.alert('Official Portal', `Opening portal: ${opp.officialUrl}`);
      }
    } catch {
      Alert.alert('Notice', `Please visit portal at: ${opp.officialUrl}`);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <Header />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Quick Innovation Hero Banner */}
        <View style={styles.heroBanner}>
          <View style={styles.heroContent}>
            <View style={styles.heroBadge}>
              <Ionicons name="flash" size={12} color={Colors.primary} />
              <Text style={styles.heroBadgeText}>LIVE STUDENT DISCOVERY</Text>
            </View>
            <Text style={styles.heroTitle}>Turn your midnight ideas into deployed reality.</Text>
            <Text style={styles.heroSubtitle}>
              Find verified hackathons, internships, scholarships, and collaborators with matching skills.
            </Text>

            <View style={styles.heroActions}>
              <Button
                title="Post an Idea"
                size="sm"
                variant="primary"
                icon={<Ionicons name="add-circle-outline" size={16} color="#FFF" />}
                onPress={() => router.push('/ideahub/submit' as any)}
              />
              <Button
                title="Find Teammates"
                size="sm"
                variant="secondary"
                onPress={() => router.push('/(tabs)/swipe' as any)}
                style={{ marginLeft: 8 }}
              />
            </View>
          </View>
        </View>

        {/* HORIZONTALLY SCROLLABLE OPPORTUNITY CATEGORIES */}
        <View style={styles.categoriesSection}>
          <View style={styles.categoriesHeader}>
            <Text style={styles.categoriesSectionTitle}>EXPLORE BY CATEGORY</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/explore' as any)}>
              <Text style={styles.seeAllText}>All →</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsScroll}
          >
            {HOME_OPPORTUNITY_CATEGORIES.map((catName) => (
              <Chip
                key={catName}
                label={catName}
                selected={false}
                onPress={() => handleSelectCategory(catName)}
                style={styles.categoryChip}
              />
            ))}
          </ScrollView>
        </View>

        {/* SECTION 1: CLOSING SOON (Highest Priority Section) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <View style={styles.urgentHeaderRow}>
                <View style={styles.urgentDot} />
                <Text style={styles.sectionTitle}>Closing Soon</Text>
              </View>
              <Text style={styles.sectionSubtitle}>
                Verified deadlines approaching within days — register before slots fill
              </Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/(tabs)/explore' as any)}>
              <Text style={styles.seeAllUrgentText}>Explore All →</Text>
            </TouchableOpacity>
          </View>

          {closingSoonOpportunities.map((opp) => (
            <Card key={opp.id} variant="default" style={styles.closingSoonCard}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.typeBadgeRow}>
                  <Badge label={opp.type} variant="primary" size="sm" />
                  <Badge label={opp.format} variant="neutral" size="sm" style={{ marginLeft: 6 }} />
                </View>

                {/* Prominent Deadline Pill */}
                <View style={styles.countdownPill}>
                  <Ionicons name="alarm-outline" size={14} color={Colors.primary} />
                  <Text style={styles.countdownText}>
                    {opp.daysRemaining !== undefined && opp.daysRemaining <= 0
                      ? 'Closing Today'
                      : `${opp.daysRemaining} days left`}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => router.push(`/opportunities/${opp.id}` as any)}
                activeOpacity={0.8}
              >
                <Text style={styles.oppTitle}>{opp.title}</Text>
              </TouchableOpacity>

              {/* Organizer Row */}
              <View style={styles.organizerRow}>
                <Ionicons name="business-outline" size={14} color={Colors.textMuted} />
                <Text style={styles.organizerText}>{opp.organizer}</Text>
                {opp.isVerified ? (
                  <Ionicons
                    name="checkmark-circle"
                    size={14}
                    color={Colors.primary}
                    style={{ marginLeft: 4 }}
                  />
                ) : null}
              </View>

              {/* Metrics Grid */}
              <View style={styles.oppMetricsGrid}>
                {opp.prizeOrCompensation ? (
                  <View style={styles.metricItem}>
                    <Ionicons name="trophy-outline" size={14} color={Colors.accentAmber} />
                    <Text style={[styles.metricText, { color: Colors.accentAmber }]} numberOfLines={1}>
                      {opp.prizeOrCompensation}
                    </Text>
                  </View>
                ) : null}

                <View style={styles.metricItem}>
                  <Ionicons name="calendar-outline" size={14} color={Colors.textMuted} />
                  <Text style={styles.metricText} numberOfLines={1}>
                    Deadline: {opp.deadline}
                  </Text>
                </View>
              </View>

              {/* Card Actions */}
              <View style={styles.oppActionsRow}>
                <TouchableOpacity
                  style={[styles.saveBtn, opp.isSaved && styles.saveBtnActive]}
                  onPress={() => toggleSaveOpportunity(opp.id)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={opp.isSaved ? 'bookmark' : 'bookmark-outline'}
                    size={18}
                    color={opp.isSaved ? Colors.primary : Colors.textMuted}
                  />
                  <Text style={[styles.saveBtnText, opp.isSaved && { color: Colors.primary }]}>
                    {opp.isSaved ? 'Saved' : 'Save'}
                  </Text>
                </TouchableOpacity>

                <Button
                  title="View Details"
                  size="sm"
                  variant="outline"
                  onPress={() => router.push(`/opportunities/${opp.id}` as any)}
                  style={{ flex: 1, marginHorizontal: 6 }}
                />

                <Button
                  title="Apply"
                  size="sm"
                  variant="primary"
                  onPress={() => handleRegisterDirect(opp)}
                  style={{ flex: 1 }}
                />
              </View>
            </Card>
          ))}
        </View>

        {/* SECTION 2: FEATURED HACKATHONS AND INTERNSHIPS */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Featured Hackathons & Internships</Text>
              <Text style={styles.sectionSubtitle}>Premier technical challenges and paid industry roles</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/(tabs)/explore' as any)}>
              <Text style={styles.seeAllText}>View All ({featuredHackathonsAndInternships.length}) →</Text>
            </TouchableOpacity>
          </View>

          {featuredHackathonsAndInternships.map((opp) => (
            <OpportunityCard key={opp.id} opportunity={opp} />
          ))}
        </View>

        {/* SECTION 3: RECOMMENDED OPPORTUNITIES */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Recommended For You</Text>
              <Text style={styles.sectionSubtitle}>
                Matched with your skills ({user.primaryRole})
              </Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/(tabs)/explore' as any)}>
              <Text style={styles.seeAllText}>Explore Feed →</Text>
            </TouchableOpacity>
          </View>

          {recommendedOpportunities.map((opp) => (
            <OpportunityCard key={opp.id} opportunity={opp} />
          ))}
        </View>

        {/* SECTION 4: TRENDING STUDENT IDEAS */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Trending Student Ideas</Text>
              <Text style={styles.sectionSubtitle}>Concepts seeking co-builders and feedback</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/ideahub' as any)}>
              <Text style={styles.seeAllText}>Explore IdeaHub →</Text>
            </TouchableOpacity>
          </View>

          {trendingIdeas.map((idea) => (
            <IdeaCard key={idea.id} idea={idea} />
          ))}
        </View>

        {/* SECTION 5: FIND TEAMMATES (Collaborators Spotlight & Teams) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Find Teammates</Text>
              <Text style={styles.sectionSubtitle}>Connect with builders possessing matching skills</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/(tabs)/swipe' as any)}>
              <Text style={styles.seeAllText}>Swipe & Connect →</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.collaboratorScroll}
          >
            {topStudents.map((s) => (
              <Card key={s.id} variant="default" style={styles.studentPreviewCard}>
                <Avatar uri={s.avatar} name={s.name} size={50} isVerified={s.isVerified} />
                <Text style={styles.studentCardName} numberOfLines={1}>
                  {s.name}
                </Text>
                <Text style={styles.studentCardCollege} numberOfLines={1}>
                  {s.college}
                </Text>
                <Badge label={s.primaryRole} variant="primary" size="sm" style={{ marginTop: 6 }} />

                <View style={styles.studentCardSkills}>
                  {s.skills.slice(0, 2).map((sk) => (
                    <View key={sk} style={styles.miniSkill}>
                      <Text style={styles.miniSkillText}>{sk}</Text>
                    </View>
                  ))}
                </View>

                <Button
                  title="Connect"
                  size="sm"
                  variant="outline"
                  onPress={() => router.push('/(tabs)/swipe' as any)}
                  style={styles.studentConnectBtn}
                />
              </Card>
            ))}
          </ScrollView>

          {/* Open Teams */}
          <View style={{ marginTop: 14 }}>
            {activeTeams.map((team) => (
              <TeamCard key={team.id} team={team} />
            ))}
          </View>
        </View>

        {/* SECTION 6: SAVED OPPORTUNITIES */}
        {savedOpportunities.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Saved Opportunities</Text>
                <Text style={styles.sectionSubtitle}>
                  {savedOpportunities.length} opportunities bookmarked for your application schedule
                </Text>
              </View>
              <TouchableOpacity onPress={() => router.push('/(tabs)/explore' as any)}>
                <Text style={styles.seeAllText}>Manage All →</Text>
              </TouchableOpacity>
            </View>

            {savedOpportunities.slice(0, 2).map((opp) => (
              <OpportunityCard key={opp.id} opportunity={opp} />
            ))}
          </View>
        ) : null}

        {/* SECTION: Recent Project Showcases */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Project Showcase</Text>
              <Text style={styles.sectionSubtitle}>Prototypes & achievements built by student peers</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/projects' as any)}>
              <Text style={styles.seeAllText}>All Projects →</Text>
            </TouchableOpacity>
          </View>

          {recentProjects.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </View>

        {/* Community Leaderboard Preview */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Impact Leaderboard</Text>
              <Text style={styles.sectionSubtitle}>Recognizing verified builders & researchers</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/leaderboard' as any)}>
              <Text style={styles.seeAllText}>Rankings →</Text>
            </TouchableOpacity>
          </View>

          <Card variant="outline" style={styles.leaderboardPreviewCard}>
            {leaderboard.slice(0, 3).map((item, idx) => (
              <View
                key={item.id}
                style={[
                  styles.leaderboardRow,
                  idx < 2 && { borderBottomWidth: 1, borderBottomColor: Colors.border },
                ]}
              >
                <View style={styles.rankBadge}>
                  <Text style={styles.rankNum}>{idx + 1}</Text>
                </View>
                <Avatar uri={item.avatar} name={item.name} size={36} />
                <View style={styles.leaderboardInfo}>
                  <Text style={styles.leaderboardName}>{item.name}</Text>
                  <Text style={styles.leaderboardSub}>
                    {item.role} • {item.college}
                  </Text>
                </View>
                <View style={styles.leaderboardPoints}>
                  <Text style={styles.pointsNum}>{item.points.toLocaleString()}</Text>
                  <Text style={styles.pointsLabel}>pts</Text>
                </View>
              </View>
            ))}
          </Card>
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
    paddingBottom: 32,
  },
  heroBanner: {
    marginHorizontal: Spacing.screenPadding,
    marginTop: 12,
    marginBottom: 16,
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    padding: 16,
    ...Shadows.card,
  },
  heroContent: {
    alignItems: 'flex-start',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primarySubtle,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    marginBottom: 8,
    gap: 4,
  },
  heroBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: Typography.title3,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    lineHeight: 24,
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: Typography.footnote,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 14,
  },
  heroActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoriesSection: {
    marginBottom: 18,
  },
  categoriesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenPadding,
    marginBottom: 8,
  },
  categoriesSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 0.8,
  },
  chipsScroll: {
    paddingHorizontal: Spacing.screenPadding,
    gap: 8,
  },
  categoryChip: {
    marginRight: 2,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: Spacing.screenPadding,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: Typography.title3,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: Typography.caption,
    color: Colors.textMuted,
    marginTop: 2,
  },
  urgentHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  urgentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  seeAllText: {
    fontSize: Typography.caption,
    fontWeight: Typography.semiBold,
    color: Colors.textSecondary,
    paddingTop: 4,
  },
  seeAllUrgentText: {
    fontSize: Typography.caption,
    fontWeight: Typography.bold,
    color: Colors.primary,
    paddingTop: 4,
  },
  closingSoonCard: {
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
    padding: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countdownPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primarySubtle,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  countdownText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.primary,
  },
  oppTitle: {
    fontSize: Typography.title3,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    lineHeight: 22,
    marginBottom: 6,
  },
  organizerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 4,
  },
  organizerText: {
    fontSize: Typography.caption,
    color: Colors.textMuted,
    fontWeight: Typography.medium,
  },
  oppMetricsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricText: {
    fontSize: Typography.caption,
    color: Colors.textSecondary,
    fontWeight: Typography.medium,
  },
  oppActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 12,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 4,
  },
  saveBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primarySubtle,
  },
  saveBtnText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: Typography.semiBold,
  },
  collaboratorScroll: {
    gap: 12,
    paddingBottom: 4,
  },
  studentPreviewCard: {
    width: 150,
    alignItems: 'center',
    padding: 12,
  },
  studentCardName: {
    fontSize: Typography.body,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    marginTop: 8,
  },
  studentCardCollege: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  studentCardSkills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 4,
    marginTop: 8,
    marginBottom: 10,
  },
  miniSkill: {
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  miniSkillText: {
    fontSize: 10,
    color: Colors.textSecondary,
  },
  studentConnectBtn: {
    width: '100%',
  },
  leaderboardPreviewCard: {
    padding: 0,
    overflow: 'hidden',
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  rankBadge: {
    width: 24,
    alignItems: 'center',
  },
  rankNum: {
    fontSize: 14,
    fontWeight: '900',
    color: Colors.primary,
  },
  leaderboardInfo: {
    flex: 1,
  },
  leaderboardName: {
    fontSize: Typography.body,
    fontWeight: Typography.semiBold,
    color: Colors.textPrimary,
  },
  leaderboardSub: {
    fontSize: Typography.caption,
    color: Colors.textMuted,
  },
  leaderboardPoints: {
    alignItems: 'flex-end',
  },
  pointsNum: {
    fontSize: Typography.body,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  pointsLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    textTransform: 'uppercase',
  },
});
