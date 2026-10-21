import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
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

const CATEGORIES = [
  { id: 'all', label: 'All Feeds' },
  { id: 'ideas', label: '💡 Ideas' },
  { id: 'hackathons', label: '⚡ Hackathons' },
  { id: 'teams', label: '🤝 Teammates' },
  { id: 'projects', label: '🚀 Projects' },
  { id: 'fellowships', label: '🎓 Fellowships' },
];

export default function HomeScreen() {
  const {
    user,
    ideas,
    teams,
    opportunities,
    projects,
    leaderboard,
    refreshAll,
  } = useApp();

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshAll();
    setRefreshing(false);
  };

  // Filter ideas and opportunities
  const trendingIdeas = ideas.slice(0, 3);
  const featuredOpportunities = opportunities.slice(0, 3);
  const activeTeams = teams.slice(0, 2);
  const recentProjects = projects.slice(0, 2);
  const topStudents = MOCK_STUDENTS.slice(0, 4);

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
              <Text style={styles.heroBadgeText}>TREEHACKS 2026 REGISTRATION OPEN</Text>
            </View>
            <Text style={styles.heroTitle}>Turn your midnight ideas into deployed reality.</Text>
            <Text style={styles.heroSubtitle}>
              Find collaborators with complementary skills or apply to open student startup teams.
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
                onPress={() => router.push('/teams' as any)}
                style={{ marginLeft: 8 }}
              />
            </View>
          </View>
        </View>

        {/* Category Horizontal Filter Chips */}
        <View style={styles.categoriesSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
            {CATEGORIES.map((cat) => (
              <Chip
                key={cat.id}
                label={cat.label}
                selected={selectedCategory === cat.id}
                onPress={() => setSelectedCategory(cat.id)}
              />
            ))}
          </ScrollView>
        </View>

        {/* SECTION: Trending Ideas from Community */}
        {(selectedCategory === 'all' || selectedCategory === 'ideas') && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Trending Ideas</Text>
                <Text style={styles.sectionSubtitle}>Student initiatives seeking collaborators</Text>
              </View>
              <TouchableOpacity onPress={() => router.push('/ideahub' as any)}>
                <Text style={styles.seeAllText}>Explore Hub →</Text>
              </TouchableOpacity>
            </View>

            {trendingIdeas.map((idea) => (
              <IdeaCard key={idea.id} idea={idea} />
            ))}
          </View>
        )}

        {/* SECTION: Recommended Opportunities */}
        {(selectedCategory === 'all' || selectedCategory === 'hackathons' || selectedCategory === 'fellowships') && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Curated Opportunities</Text>
                <Text style={styles.sectionSubtitle}>Verified hackathons, grants & internships</Text>
              </View>
              <TouchableOpacity onPress={() => router.push('/opportunities' as any)}>
                <Text style={styles.seeAllText}>View All ({opportunities.length}) →</Text>
              </TouchableOpacity>
            </View>

            {featuredOpportunities.map((opp) => (
              <OpportunityCard key={opp.id} opportunity={opp} />
            ))}
          </View>
        )}

        {/* SECTION: Students Looking for Teammates */}
        {(selectedCategory === 'all' || selectedCategory === 'teams') && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Collaborator Spotlight</Text>
                <Text style={styles.sectionSubtitle}>Connect with builders possessing matching skills</Text>
              </View>
              <TouchableOpacity onPress={() => router.push('/(tabs)/discover' as any)}>
                <Text style={styles.seeAllText}>Swipe & Match →</Text>
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.collaboratorScroll}>
              {topStudents.map((s) => (
                <Card key={s.id} variant="default" style={styles.studentPreviewCard}>
                  <Avatar uri={s.avatar} name={s.name} size={50} isVerified={s.isVerified} />
                  <Text style={styles.studentCardName} numberOfLines={1}>{s.name}</Text>
                  <Text style={styles.studentCardCollege} numberOfLines={1}>{s.college}</Text>
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
                    onPress={() => router.push('/(tabs)/discover' as any)}
                    style={styles.studentConnectBtn}
                  />
                </Card>
              ))}
            </ScrollView>
          </View>
        )}

        {/* SECTION: Open Teams Recruiting */}
        {(selectedCategory === 'all' || selectedCategory === 'teams') && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Open Teams Recruiting</Text>
                <Text style={styles.sectionSubtitle}>Hackathon squads and startup crews with open seats</Text>
              </View>
              <TouchableOpacity onPress={() => router.push('/teams' as any)}>
                <Text style={styles.seeAllText}>All Teams →</Text>
              </TouchableOpacity>
            </View>

            {activeTeams.map((team) => (
              <TeamCard key={team.id} team={team} />
            ))}
          </View>
        )}

        {/* SECTION: Recent Project Showcases */}
        {(selectedCategory === 'all' || selectedCategory === 'projects') && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Project Showcase</Text>
                <Text style={styles.sectionSubtitle}>Prototypes & achievements built by peers</Text>
              </View>
              <TouchableOpacity onPress={() => router.push('/projects' as any)}>
                <Text style={styles.seeAllText}>All Projects →</Text>
              </TouchableOpacity>
            </View>

            {recentProjects.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </View>
        )}

        {/* SECTION: Community Leaderboard Preview */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Impact Leaderboard</Text>
              <Text style={styles.sectionSubtitle}>Recognizing real builders, mentors & researchers</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/leaderboard' as any)}>
              <Text style={styles.seeAllText}>Rankings →</Text>
            </TouchableOpacity>
          </View>

          <Card variant="elevated" style={styles.leaderboardPreviewCard}>
            {leaderboard.slice(0, 3).map((lead, idx) => (
              <View key={lead.id} style={styles.leaderboardRow}>
                <View style={styles.leadRankBadge}>
                  <Text style={styles.leadRankNumber}>#{lead.rank}</Text>
                </View>
                <Avatar uri={lead.avatar} name={lead.name} size={36} />
                <View style={styles.leadInfo}>
                  <Text style={styles.leadName}>{lead.name}</Text>
                  <Text style={styles.leadRole}>
                    {lead.college} • {lead.categoryRank}
                  </Text>
                </View>
                <View style={styles.leadPoints}>
                  <Text style={styles.pointsNumber}>{lead.points}</Text>
                  <Text style={styles.pointsLabel}>pts</Text>
                </View>
              </View>
            ))}

            <TouchableOpacity
              style={styles.leaderboardFooterBtn}
              onPress={() => router.push('/leaderboard' as any)}
            >
              <Text style={styles.leaderboardFooterText}>
                Your Rank: #{user.leaderboardRank} ({user.points} pts) • View Point Rules
              </Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
            </TouchableOpacity>
          </Card>
        </View>

        {/* Guided First-Time Path Checklist */}
        <View style={[styles.section, { marginBottom: 32 }]}>
          <Card variant="outline" style={styles.onboardingCard}>
            <View style={styles.onboardingHeader}>
              <Ionicons name="sparkles" size={18} color={Colors.primary} />
              <Text style={styles.onboardingTitle}>YOUR INNOVATION ROADMAP</Text>
            </View>
            <Text style={styles.onboardingSubtitle}>
              Complete these steps to unlock maximum student matchmaking and team invites:
            </Text>

            <View style={styles.checklist}>
              <View style={styles.checkItem}>
                <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
                <Text style={[styles.checkText, styles.checkTextDone]}>Complete student profile & academic branch</Text>
              </View>
              <View style={styles.checkItem}>
                <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
                <Text style={[styles.checkText, styles.checkTextDone]}>Tag skills & project availability</Text>
              </View>
              <TouchableOpacity
                style={styles.checkItem}
                onPress={() => router.push('/(tabs)/discover' as any)}
              >
                <Ionicons name="ellipse-outline" size={18} color={Colors.primary} />
                <Text style={styles.checkText}>Swipe and connect with your first 3 collaborators</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.checkItem}
                onPress={() => router.push('/ideahub/submit' as any)}
              >
                <Ionicons name="ellipse-outline" size={18} color={Colors.primary} />
                <Text style={styles.checkText}>Publish an idea or apply to an open team</Text>
              </TouchableOpacity>
            </View>
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
    paddingHorizontal: Spacing.screenPadding,
    paddingBottom: 40,
  },
  heroBanner: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginTop: 14,
    marginBottom: 16,
  },
  heroContent: {},
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primarySubtle,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: BorderRadius.xs,
    alignSelf: 'flex-start',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  heroBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.primary,
    marginLeft: 4,
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
    fontSize: Typography.body,
    color: Colors.textMuted,
    lineHeight: 20,
    marginBottom: 14,
  },
  heroActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoriesSection: {
    marginBottom: 20,
    marginHorizontal: -Spacing.screenPadding,
  },
  chipsScroll: {
    paddingHorizontal: Spacing.screenPadding,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: Typography.title3,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  sectionSubtitle: {
    fontSize: Typography.caption,
    color: Colors.textMuted,
    marginTop: 2,
  },
  seeAllText: {
    fontSize: Typography.footnote,
    color: Colors.primary,
    fontWeight: Typography.semiBold,
  },
  collaboratorScroll: {
    gap: 12,
    paddingRight: 16,
  },
  studentPreviewCard: {
    width: 170,
    alignItems: 'center',
    padding: 14,
  },
  studentCardName: {
    fontSize: Typography.body,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    marginTop: 8,
    textAlign: 'center',
  },
  studentCardCollege: {
    fontSize: Typography.caption,
    color: Colors.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
  studentCardSkills: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 8,
  },
  miniSkill: {
    backgroundColor: Colors.surfaceHighlight,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: BorderRadius.xs,
  },
  miniSkillText: {
    fontSize: 10,
    color: Colors.textSecondary,
  },
  studentConnectBtn: {
    marginTop: 10,
    width: '100%',
    paddingVertical: 5,
  },
  leaderboardPreviewCard: {
    padding: 12,
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  leadRankBadge: {
    width: 26,
    alignItems: 'center',
    marginRight: 8,
  },
  leadRankNumber: {
    fontSize: Typography.subhead,
    fontWeight: Typography.bold,
    color: Colors.primary,
  },
  leadInfo: {
    flex: 1,
    marginLeft: 10,
  },
  leadName: {
    fontSize: Typography.body,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  leadRole: {
    fontSize: Typography.caption,
    color: Colors.textMuted,
    marginTop: 2,
  },
  leadPoints: {
    alignItems: 'flex-end',
  },
  pointsNumber: {
    fontSize: Typography.headline,
    fontWeight: Typography.bold,
    color: Colors.accentAmber,
  },
  pointsLabel: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  leaderboardFooterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingHorizontal: 4,
  },
  leaderboardFooterText: {
    fontSize: Typography.footnote,
    color: Colors.textSecondary,
    fontWeight: Typography.medium,
  },
  onboardingCard: {
    backgroundColor: Colors.surfaceElevated,
    borderColor: Colors.borderLight,
  },
  onboardingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  onboardingTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.8,
    marginLeft: 6,
  },
  onboardingSubtitle: {
    fontSize: Typography.footnote,
    color: Colors.textMuted,
    lineHeight: 18,
    marginBottom: 12,
  },
  checklist: {
    gap: 10,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkText: {
    fontSize: Typography.body,
    color: Colors.textPrimary,
    marginLeft: 8,
    fontWeight: Typography.medium,
  },
  checkTextDone: {
    color: Colors.textMuted,
    textDecorationLine: 'line-through',
  },
});
