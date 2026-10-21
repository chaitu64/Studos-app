import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Modal,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { useApp } from '../../context/AppContext';

export default function ProfileScreen() {
  const { user, ideas, projects, updateProfile } = useApp();

  const [showEditModal, setShowEditModal] = useState(false);
  const [bioInput, setBioInput] = useState(user.shortBio);
  const [goalsInput, setGoalsInput] = useState(user.goals);
  const [skillsInput, setSkillsInput] = useState(user.skills.join(', '));
  const [activeTab, setActiveTab] = useState<'overview' | 'projects' | 'ideas' | 'achievements'>('overview');

  const myIdeas = ideas.filter((i) => i.creator.id === user.id);
  const myProjects = projects.filter((p) => p.contributors.some((c) => c.id === user.id));

  const handleSaveProfile = async () => {
    const updatedSkills = skillsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    await updateProfile({
      shortBio: bioInput,
      goals: goalsInput,
      skills: updatedSkills,
    });
    setShowEditModal(false);
    Alert.alert('Profile Updated', 'Your profile details have been saved.');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Top Bar with Settings */}
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>Student Profile</Text>
        <View style={styles.topBarActions}>
          <TouchableOpacity
            style={styles.iconCircle}
            onPress={() => router.push('/settings' as any)}
          >
            <Ionicons name="settings-outline" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Profile Card Header */}
        <Card variant="elevated" style={styles.profileHeaderCard}>
          <View style={styles.avatarRow}>
            <Avatar uri={user.avatar} name={user.name} size={76} isVerified={user.isVerified} />
            <View style={styles.headerRightInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.userName}>{user.name}</Text>
                {user.isVerified ? (
                  <Ionicons name="checkmark-circle" size={18} color={Colors.primary} style={{ marginLeft: 4 }} />
                ) : null}
              </View>
              <Text style={styles.userCollege}>{user.college}</Text>
              <Text style={styles.userDegree}>{user.degree} • {user.gradYear}</Text>
              <Badge label={user.primaryRole} variant="primary" size="sm" style={{ marginTop: 6 }} />
            </View>
          </View>

          {/* Short Bio */}
          <Text style={styles.bioText}>{user.shortBio}</Text>

          {/* Social Links */}
          <View style={styles.socialRow}>
            {user.githubUrl ? (
              <TouchableOpacity
                style={styles.socialPill}
                onPress={() => Linking.openURL(user.githubUrl!)}
              >
                <Ionicons name="logo-github" size={16} color={Colors.textPrimary} />
                <Text style={styles.socialText}>GitHub</Text>
              </TouchableOpacity>
            ) : null}

            {user.linkedinUrl ? (
              <TouchableOpacity
                style={styles.socialPill}
                onPress={() => Linking.openURL(user.linkedinUrl!)}
              >
                <Ionicons name="logo-linkedin" size={16} color={Colors.accentCyan} />
                <Text style={styles.socialText}>LinkedIn</Text>
              </TouchableOpacity>
            ) : null}

            {user.portfolioUrl ? (
              <TouchableOpacity
                style={styles.socialPill}
                onPress={() => Linking.openURL(user.portfolioUrl!)}
              >
                <Ionicons name="globe-outline" size={16} color={Colors.accentGreen} />
                <Text style={styles.socialText}>Portfolio</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Profile Completion Bar */}
          <View style={styles.completionBox}>
            <View style={styles.completionHeader}>
              <Text style={styles.completionTitle}>PROFILE COMPLETION</Text>
              <Text style={styles.completionPercent}>95%</Text>
            </View>
            <View style={styles.completionTrack}>
              <View style={[styles.completionFill, { width: '95%' }]} />
            </View>
          </View>

          <Button
            title="Edit Profile & Skills"
            variant="secondary"
            size="sm"
            icon={<Ionicons name="pencil" size={14} color={Colors.textPrimary} />}
            onPress={() => setShowEditModal(true)}
            style={{ marginTop: 14 }}
          />
        </Card>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>#{user.leaderboardRank}</Text>
            <Text style={styles.statLabel}>Leaderboard</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: Colors.accentAmber }]}>{user.points}</Text>
            <Text style={styles.statLabel}>Impact Points</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{user.projectsCount}</Text>
            <Text style={styles.statLabel}>Projects</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{user.hackathonsCount}</Text>
            <Text style={styles.statLabel}>Hackathons</Text>
          </View>
        </View>

        {/* Tab Controls: Overview / Projects / Ideas / Badges */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'overview' ? styles.tabItemActive : undefined]}
            onPress={() => setActiveTab('overview')}
          >
            <Text style={[styles.tabText, activeTab === 'overview' ? styles.tabTextActive : undefined]}>
              Overview
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'projects' ? styles.tabItemActive : undefined]}
            onPress={() => setActiveTab('projects')}
          >
            <Text style={[styles.tabText, activeTab === 'projects' ? styles.tabTextActive : undefined]}>
              Projects ({myProjects.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'ideas' ? styles.tabItemActive : undefined]}
            onPress={() => setActiveTab('ideas')}
          >
            <Text style={[styles.tabText, activeTab === 'ideas' ? styles.tabTextActive : undefined]}>
              Ideas ({myIdeas.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'achievements' ? styles.tabItemActive : undefined]}
            onPress={() => setActiveTab('achievements')}
          >
            <Text style={[styles.tabText, activeTab === 'achievements' ? styles.tabTextActive : undefined]}>
              Badges ({user.badges.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <View style={styles.tabContent}>
            {/* Goals */}
            <Card variant="default" style={styles.sectionCard}>
              <Text style={styles.cardSectionTitle}>CURRENT GOALS & SQUAD FOCUS</Text>
              <Text style={styles.goalsText}>{user.goals}</Text>
              <View style={styles.availabilityRow}>
                <Ionicons name="time-outline" size={16} color={Colors.accentCyan} />
                <Text style={styles.availabilityText}>Available: {user.availability}</Text>
              </View>
            </Card>

            {/* Skills & Technologies */}
            <Card variant="default" style={styles.sectionCard}>
              <Text style={styles.cardSectionTitle}>VERIFIED SKILLS</Text>
              <View style={styles.chipsWrap}>
                {user.skills.map((skill) => (
                  <View key={skill} style={styles.skillPill}>
                    <Text style={styles.skillText}>{skill}</Text>
                  </View>
                ))}
              </View>
            </Card>

            {/* Interests & Domains */}
            <Card variant="default" style={styles.sectionCard}>
              <Text style={styles.cardSectionTitle}>PASSION DOMAINS</Text>
              <View style={styles.chipsWrap}>
                {user.interests.map((interest) => (
                  <Badge key={interest} label={interest} variant="cyan" size="sm" />
                ))}
              </View>
            </Card>
          </View>
        )}

        {activeTab === 'projects' && (
          <View style={styles.tabContent}>
            {myProjects.map((p) => (
              <Card
                key={p.id}
                variant="default"
                style={{ marginBottom: 12 }}
                onPress={() => router.push(`/projects/${p.id}` as any)}
              >
                <Text style={styles.projectTitle}>{p.title}</Text>
                <Text style={styles.projectTagline}>{p.tagline}</Text>
                <View style={styles.chipsWrap}>
                  {p.technologies.map((t) => (
                    <Badge key={t} label={t} variant="outline" size="sm" />
                  ))}
                </View>
              </Card>
            ))}
            <Button
              title="Add New Project"
              variant="outline"
              size="sm"
              icon={<Ionicons name="add" size={16} color={Colors.primary} />}
              onPress={() => router.push('/projects/create' as any)}
              style={{ marginTop: 8 }}
            />
          </View>
        )}

        {activeTab === 'ideas' && (
          <View style={styles.tabContent}>
            {myIdeas.map((idea) => (
              <Card
                key={idea.id}
                variant="default"
                style={{ marginBottom: 12 }}
                onPress={() => router.push(`/ideahub/${idea.id}` as any)}
              >
                <View style={styles.ideaHeaderRow}>
                  <Text style={styles.ideaTitle}>{idea.title}</Text>
                  <Badge label={idea.stage} variant="purple" size="sm" />
                </View>
                <Text style={styles.ideaTagline}>{idea.tagline}</Text>
                <Text style={styles.ideaStats}>
                  🚀 {idea.upvotes} upvotes • 💬 {idea.commentsCount} comments
                </Text>
              </Card>
            ))}
            <Button
              title="Submit New Idea"
              variant="outline"
              size="sm"
              icon={<Ionicons name="add" size={16} color={Colors.primary} />}
              onPress={() => router.push('/ideahub/submit' as any)}
              style={{ marginTop: 8 }}
            />
          </View>
        )}

        {activeTab === 'achievements' && (
          <View style={styles.tabContent}>
            <Card variant="default" style={styles.sectionCard}>
              <Text style={styles.cardSectionTitle}>VERIFIED BADGES & ACCOMPLISHMENTS</Text>
              <View style={styles.badgesList}>
                {user.badges.map((b) => (
                  <View key={b} style={styles.badgeItem}>
                    <View style={styles.badgeIconCircle}>
                      <Ionicons name="ribbon" size={20} color={Colors.accentAmber} />
                    </View>
                    <View style={styles.badgeInfo}>
                      <Text style={styles.badgeName}>{b}</Text>
                      <Text style={styles.badgeDesc}>Validated by Hackathon judges & Peer Code Reviews</Text>
                    </View>
                  </View>
                ))}
              </View>
            </Card>
          </View>
        )}
      </ScrollView>

      {/* EDIT PROFILE MODAL */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.editModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Input
                label="Short Bio"
                multiline
                numberOfLines={3}
                value={bioInput}
                onChangeText={setBioInput}
                placeholder="What are you currently building or learning?"
              />

              <Input
                label="Current Goals & Focus"
                multiline
                numberOfLines={2}
                value={goalsInput}
                onChangeText={setGoalsInput}
                placeholder="e.g. Founding a robotics startup, TreeHacks team"
              />

              <Input
                label="Skills (Comma-separated)"
                value={skillsInput}
                onChangeText={setSkillsInput}
                placeholder="PyTorch, React Native, Rust, CUDA"
                helperText="Separate multiple skills with commas"
              />

              <Button
                title="Save Profile Changes"
                variant="primary"
                size="lg"
                onPress={handleSaveProfile}
                style={{ marginTop: 16, marginBottom: 20 }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  topBarTitle: {
    fontSize: Typography.title3,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  topBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  scrollContainer: {
    padding: Spacing.screenPadding,
    paddingBottom: 40,
  },
  profileHeaderCard: {
    marginBottom: 16,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerRightInfo: {
    flex: 1,
    marginLeft: 14,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userName: {
    fontSize: Typography.title3,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  userCollege: {
    fontSize: Typography.body,
    fontWeight: Typography.semiBold,
    color: Colors.primary,
    marginTop: 2,
  },
  userDegree: {
    fontSize: Typography.caption,
    color: Colors.textMuted,
    marginTop: 1,
  },
  bioText: {
    fontSize: Typography.body,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 14,
  },
  socialRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  socialPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceHighlight,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  socialText: {
    fontSize: Typography.caption,
    color: Colors.textPrimary,
    marginLeft: 6,
    fontWeight: Typography.medium,
  },
  completionBox: {
    backgroundColor: Colors.surfaceElevated,
    padding: 10,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  completionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  completionTitle: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 0.8,
  },
  completionPercent: {
    fontSize: 10,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  completionTrack: {
    height: 4,
    backgroundColor: Colors.surfaceHighlight,
    borderRadius: 2,
    overflow: 'hidden',
  },
  completionFill: {
    height: '100%',
    backgroundColor: Colors.primary,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingVertical: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: Typography.headline,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  statLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 2,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginBottom: 16,
  },
  tabItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: Colors.primary,
  },
  tabText: {
    fontSize: Typography.subhead,
    color: Colors.textMuted,
    fontWeight: Typography.medium,
  },
  tabTextActive: {
    color: Colors.primary,
    fontWeight: Typography.bold,
  },
  tabContent: {
    gap: 12,
  },
  sectionCard: {
    padding: 14,
  },
  cardSectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  goalsText: {
    fontSize: Typography.body,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 10,
  },
  availabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  availabilityText: {
    fontSize: Typography.footnote,
    color: Colors.accentCyan,
    marginLeft: 6,
    fontWeight: Typography.medium,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillPill: {
    backgroundColor: Colors.surfaceHighlight,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: BorderRadius.xs,
  },
  skillText: {
    fontSize: Typography.caption,
    color: Colors.textPrimary,
  },
  projectTitle: {
    fontSize: Typography.body,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  projectTagline: {
    fontSize: Typography.footnote,
    color: Colors.textMuted,
    marginBottom: 8,
  },
  ideaHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  ideaTitle: {
    fontSize: Typography.body,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    flex: 1,
    marginRight: 6,
  },
  ideaTagline: {
    fontSize: Typography.footnote,
    color: Colors.textMuted,
    marginBottom: 8,
  },
  ideaStats: {
    fontSize: Typography.caption,
    color: Colors.textSubtle,
  },
  badgesList: {
    gap: 12,
  },
  badgeItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.accentAmberSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  badgeInfo: {
    flex: 1,
  },
  badgeName: {
    fontSize: Typography.body,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  badgeDesc: {
    fontSize: Typography.caption,
    color: Colors.textMuted,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  editModalContent: {
    backgroundColor: Colors.surfaceElevated,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: Typography.title3,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
});
