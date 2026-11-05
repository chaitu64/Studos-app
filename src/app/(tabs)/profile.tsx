import React, { useEffect, useState } from 'react';
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
import { ActionSheet } from '../../components/ui/ActionSheet';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { postService } from '../../services/postService';
import { listStudyResources } from '../../services/resourceApi';
import { supabaseConfigured } from '../../services/supabase';
import { CommunityPost, StudyResource } from '../../types';

export default function ProfileScreen() {
  const { user: appUser, ideas, projects, studentServices, updateProfile, conversations, unreadNotifsCount, communityPosts } = useApp();
  const { session } = useAuth();
  const user = session ? appUser : { ...appUser, name: 'Not provided', givenName: '', familyName: '', email: '', emailVerified: false, avatar: '', college: '', collegeEmail: '', dateOfBirth: '', branch: '', degree: '', studyYear: '', gradYear: '', shortBio: '', goals: '', skills: [], interests: [], githubUrl: undefined, linkedinUrl: undefined, portfolioUrl: undefined, badges: [], isVerified: false };
  const profileCompletion = Math.round([user.name !== 'Not provided', Boolean(user.email), Boolean(user.college), Boolean(user.branch), Boolean(user.degree), Boolean(user.studyYear)].filter(Boolean).length / 6 * 100);

  const [showEditModal, setShowEditModal] = useState(false);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [bioInput, setBioInput] = useState(user.shortBio);
  const [goalsInput, setGoalsInput] = useState(user.goals);
  const [skillsInput, setSkillsInput] = useState(user.skills.join(', '));
  const [interestsInput, setInterestsInput] = useState(user.interests.join(', '));
  const [nameInput, setNameInput] = useState(user.name);
  const [avatarInput, setAvatarInput] = useState(user.avatar);
  const [collegeInput, setCollegeInput] = useState(user.college);
  const [branchInput, setBranchInput] = useState(user.branch || '');
  const [degreeInput, setDegreeInput] = useState(user.degree);
  const [studyYearInput, setStudyYearInput] = useState(user.studyYear || '');
  const [graduationYearInput, setGraduationYearInput] = useState(user.gradYear);
  const [collegeEmailInput, setCollegeEmailInput] = useState(user.collegeEmail || '');
  const [dateOfBirthInput, setDateOfBirthInput] = useState(user.dateOfBirth || '');
  const [activeTab, setActiveTab] = useState<'overview' | 'projects' | 'ideas' | 'contributions' | 'achievements'>('overview');
  const [myPosts, setMyPosts] = useState<CommunityPost[]>([]);
  const [myResources, setMyResources] = useState<StudyResource[]>([]);
  const [myDataUserId, setMyDataUserId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setBioInput(user.shortBio); setGoalsInput(user.goals); setSkillsInput(user.skills.join(', '));
      setInterestsInput(user.interests.join(', ')); setNameInput(user.name); setAvatarInput(user.avatar);
      setCollegeInput(user.college); setBranchInput(user.branch || ''); setDegreeInput(user.degree);
      setStudyYearInput(user.studyYear || ''); setGraduationYearInput(user.gradYear);
      setCollegeEmailInput(user.collegeEmail || ''); setDateOfBirthInput(user.dateOfBirth || '');
    }, 0);
    return () => clearTimeout(timer);
  }, [user.id, user.name, user.avatar, user.shortBio, user.goals, user.skills, user.interests, user.college, user.branch, user.degree, user.studyYear, user.gradYear, user.collegeEmail, user.dateOfBirth]);

  useEffect(() => {
    let active = true;
    if (!session || !supabaseConfigured) {
      void Promise.resolve().then(() => { if (active) { setMyPosts(communityPosts.filter((post) => post.author.id === user.id)); setMyResources([]); setMyDataUserId(user.id); } });
      return () => { active = false; };
    }
    void Promise.all([postService.feed(1, 40, undefined, session.user.id), listStudyResources({ ownerId: session.user.id })])
      .then(([posts, resources]) => { if (active) { setMyPosts(posts.posts); setMyResources(resources); setMyDataUserId(session.user.id); } })
      .catch(() => { if (active) { setMyPosts(communityPosts.filter((post) => post.author.id === user.id)); setMyResources([]); setMyDataUserId(session.user.id); } });
    return () => { active = false; };
  }, [communityPosts, session, user.id]);

  const myIdeas = ideas.filter((i) => i.creator.id === user.id);
  const myProjects = projects.filter((p) => p.contributors.some((c) => c.id === user.id));
  const myServices = studentServices.filter((service) => service.provider.id === user.id);
  const visibleMyPosts = myDataUserId === user.id ? myPosts : [];
  const visibleMyResources = myDataUserId === user.id ? myResources : [];
  const totalUnreadChat = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);

  const handleSaveProfile = async () => {
    const updatedSkills = skillsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const updatedInterests = interestsInput.split(',').map((item) => item.trim()).filter(Boolean);

    await updateProfile({
      shortBio: bioInput,
      goals: goalsInput,
      skills: updatedSkills,
      interests: updatedInterests,
      name: nameInput.trim(),
      avatar: avatarInput.trim(),
      college: collegeInput,
      branch: branchInput,
      degree: degreeInput,
      studyYear: studyYearInput,
      gradYear: graduationYearInput,
      collegeEmail: collegeEmailInput.trim(),
      dateOfBirth: dateOfBirthInput.trim(),
    });
    setShowEditModal(false);
    Alert.alert('Profile Updated', 'Your profile details have been saved.');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Top Bar with Plus Action & Settings */}
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>Student Profile</Text>
        <View style={styles.topBarActions}>
          <TouchableOpacity
            style={styles.plusActionBtn}
            onPress={() => setShowActionSheet(true)}
            activeOpacity={0.8}
            accessibilityLabel="Create Action"
          >
            <Ionicons name="add" size={20} color="#FFF" />
          </TouchableOpacity>

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
            <Avatar uri={user.avatar} name={user.name} size={76} isVerified={Boolean(session && user.emailVerified)} />
            <View style={styles.headerRightInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.userName}>{user.name}</Text>
              {session && user.emailVerified ? (
                  <Ionicons name="checkmark-circle" size={18} color={Colors.primary} style={{ marginLeft: 4 }} />
                ) : null}
              </View>
              <Text style={styles.userCollege}>{session ? (user.email || 'Not provided') : (user.college || 'Not provided')}</Text>
              <Text style={styles.userDegree}>{session ? (user.emailVerified ? 'Verified account' : 'Email not verified') : (user.degree || 'Not provided')}</Text>
            </View>
          </View>

          {/* Short Bio */}
          <Text style={styles.bioText}>{user.shortBio || 'Not provided'}</Text>

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
              <Text style={styles.completionPercent}>{profileCompletion}%</Text>
            </View>
            <View style={styles.completionTrack}>
              <View style={[styles.completionFill, { width: `${profileCompletion}%` }]} />
            </View>
          </View>

          {session ? <Button
            title="Edit Profile & Skills"
            variant="secondary"
            size="sm"
            icon={<Ionicons name="pencil" size={14} color={Colors.textPrimary} />}
            onPress={() => setShowEditModal(true)}
            style={{ marginTop: 14 }}
          /> : <Text style={styles.detailLine}>Sign in to add or edit your profile details.</Text>}
        </Card>

        {(user.email || user.college || user.collegeEmail || user.degree || user.branch || user.studyYear) ? <Card variant="default" style={{ marginTop: 14, marginBottom: 14 }}>
          <Text style={styles.cardSectionTitle}>PERSONAL DETAILS</Text>
          {[
            ['Email', user.email], ['College', user.college], ['College email', user.collegeEmail],
            ['Program', [user.degree, user.branch].filter(Boolean).join(' · ')],
            ['Study year', user.studyYear ? `Year ${user.studyYear}` : ''],
          ].filter(([, value]) => Boolean(value)).map(([label, value]) => (
            <View key={label} style={styles.detailRow}>
              <Text style={styles.detailLabel}>{label}</Text>
              <Text style={styles.detailValue}>{value}</Text>
            </View>
          ))}
        </Card> : null}

        {/* Stats Grid */}
        <Text style={[styles.cardSectionTitle, { marginBottom: 8 }]}>ACTIVITY FROM STUDOS</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{user.leaderboardRank ? `#${user.leaderboardRank}` : '—'}</Text>
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
            <Text style={styles.statValue}>{communityPosts.filter((post) => post.author.id === user.id).length}</Text>
            <Text style={styles.statLabel}>Posts</Text>
          </View>
        </View>

        {/* Network & Actions Hub: Chat near top, Leaderboard, Idea Hub, Projects, Teams, Saved, Notifs, Settings */}
        <View style={styles.hubSection}>
          <Text style={styles.hubSectionTitle}>STUDOS NETWORK & ACTIONS</Text>

          {/* 1. Chat / Messages (At the top of the hub) */}
          <TouchableOpacity
            style={styles.hubItemHighlight}
            onPress={() => router.push('/(tabs)/chat' as any)}
            activeOpacity={0.8}
          >
            <View style={styles.hubItemLeft}>
              <View style={[styles.hubIconWrap, { backgroundColor: Colors.primarySubtle }]}>
                <Ionicons name="chatbubbles" size={20} color={Colors.primary} />
              </View>
              <View>
                <Text style={styles.hubItemTitle}>Chat & Messages</Text>
                <Text style={styles.hubItemSub}>Collaborator direct messages & squads</Text>
              </View>
            </View>
            <View style={styles.hubItemRight}>
              {totalUnreadChat > 0 ? (
                <View style={styles.hubBadge}>
                  <Text style={styles.hubBadgeText}>{totalUnreadChat} new</Text>
                </View>
              ) : null}
              <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
            </View>
          </TouchableOpacity>

          {/* 2-8 Other Hub Destinations in a clean 2-column grid */}
          <View style={styles.hubGrid}>
            {/* 2. Leaderboard */}
            <TouchableOpacity
              style={styles.hubGridCard}
              onPress={() => router.push('/leaderboard' as any)}
              activeOpacity={0.8}
            >
              <View style={[styles.miniIconWrap, { backgroundColor: Colors.accentAmberSubtle }]}>
                <Ionicons name="trophy-outline" size={18} color={Colors.accentAmber} />
              </View>
              <Text style={styles.hubGridTitle}>Leaderboard</Text>
              <Text style={styles.hubGridSub}>{user.leaderboardRank ? `Rank #${user.leaderboardRank}` : 'No leaderboard rank'}</Text>
            </TouchableOpacity>

            {/* 3. Idea Hub / Submit an Idea */}
            <TouchableOpacity
              style={styles.hubGridCard}
              onPress={() => router.push('/ideahub' as any)}
              activeOpacity={0.8}
            >
              <View style={[styles.miniIconWrap, { backgroundColor: Colors.primarySubtle }]}>
                <Ionicons name="bulb-outline" size={18} color={Colors.primary} />
              </View>
              <Text style={styles.hubGridTitle}>Idea Hub</Text>
              <Text style={styles.hubGridSub}>Submit an Idea</Text>
            </TouchableOpacity>

            {/* 4. Project Showcase */}
            <TouchableOpacity
              style={styles.hubGridCard}
              onPress={() => router.push('/projects' as any)}
              activeOpacity={0.8}
            >
              <View style={[styles.miniIconWrap, { backgroundColor: Colors.accentGreenSubtle }]}>
                <Ionicons name="rocket-outline" size={18} color={Colors.accentGreen} />
              </View>
              <Text style={styles.hubGridTitle}>Projects</Text>
              <Text style={styles.hubGridSub}>Showcase Work</Text>
            </TouchableOpacity>

            {/* 5. Find Teammates */}
            <TouchableOpacity
              style={styles.hubGridCard}
              onPress={() => router.push('/teams' as any)}
              activeOpacity={0.8}
            >
              <View style={[styles.miniIconWrap, { backgroundColor: Colors.accentCyanSubtle }]}>
                <Ionicons name="people-outline" size={18} color={Colors.accentCyan} />
              </View>
              <Text style={styles.hubGridTitle}>Find Teammates</Text>
              <Text style={styles.hubGridSub}>Recruit / Apply</Text>
            </TouchableOpacity>

            {/* 6. Saved Opportunities */}
            <TouchableOpacity
              style={styles.hubGridCard}
              onPress={() => router.push('/(tabs)/explore' as any)}
              activeOpacity={0.8}
            >
              <View style={[styles.miniIconWrap, { backgroundColor: Colors.accentPurpleSubtle }]}>
                <Ionicons name="bookmark-outline" size={18} color={Colors.accentPurple} />
              </View>
              <Text style={styles.hubGridTitle}>Saved Opps</Text>
              <Text style={styles.hubGridSub}>Deadlines</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.hubGridCard} onPress={() => router.push('/saved' as any)} activeOpacity={0.8}>
              <View style={[styles.miniIconWrap, { backgroundColor: Colors.accentPurpleSubtle }]}>
                <Ionicons name="bookmark" size={18} color={Colors.accentPurple} />
              </View>
              <Text style={styles.hubGridTitle}>Saved Content</Text>
              <Text style={styles.hubGridSub}>Posts & study PDFs</Text>
            </TouchableOpacity>

            {/* 7. Notifications */}
            <TouchableOpacity
              style={styles.hubGridCard}
              onPress={() => router.push('/notifications' as any)}
              activeOpacity={0.8}
            >
              <View style={[styles.miniIconWrap, { backgroundColor: Colors.primarySubtle }]}>
                <Ionicons name="notifications-outline" size={18} color={Colors.primary} />
              </View>
              <Text style={styles.hubGridTitle}>Notifications</Text>
              <Text style={styles.hubGridSub}>
                {unreadNotifsCount > 0 ? `${unreadNotifsCount} unread` : 'All caught up'}
              </Text>
            </TouchableOpacity>

            {/* 8. Settings */}
            <TouchableOpacity
              style={styles.hubGridCard}
              onPress={() => router.push('/settings' as any)}
              activeOpacity={0.8}
            >
              <View style={[styles.miniIconWrap, { backgroundColor: Colors.surfaceHighlight }]}>
                <Ionicons name="settings-outline" size={18} color={Colors.textSecondary} />
              </View>
              <Text style={styles.hubGridTitle}>Settings</Text>
              <Text style={styles.hubGridSub}>Account & Prefs</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab Controls: Overview / Projects / Ideas / Badges */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBar}>
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
            style={[styles.tabItem, activeTab === 'contributions' ? styles.tabItemActive : undefined]}
            onPress={() => setActiveTab('contributions')}
          >
            <Text style={[styles.tabText, activeTab === 'contributions' ? styles.tabTextActive : undefined]}>
              Contributions
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'achievements' ? styles.tabItemActive : undefined]}
            onPress={() => setActiveTab('achievements')}
          >
            <Text style={[styles.tabText, activeTab === 'achievements' ? styles.tabTextActive : undefined]}>
              Badges ({(user.badges || []).length})
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <View style={styles.tabContent}>
            {/* Goals */}
            {(user.goals || user.availability) ? <Card variant="default" style={styles.sectionCard}>
              <Text style={styles.cardSectionTitle}>CURRENT GOALS & SQUAD FOCUS</Text>
              <Text style={styles.goalsText}>{user.goals}</Text>
              {user.availability ? <View style={styles.availabilityRow}>
                <Ionicons name="time-outline" size={16} color={Colors.accentCyan} />
                <Text style={styles.availabilityText}>Available: {user.availability}</Text>
              </View> : null}
            </Card> : null}

            {/* Skills & Technologies */}
            {user.skills.length ? <Card variant="default" style={styles.sectionCard}>
              <Text style={styles.cardSectionTitle}>VERIFIED SKILLS</Text>
              <View style={styles.chipsWrap}>
                {user.skills.map((skill) => (
                  <View key={skill} style={styles.skillPill}>
                    <Text style={styles.skillText}>{skill}</Text>
                  </View>
                ))}
              </View>
            </Card> : null}

            {/* Interests & Domains */}
            {user.interests.length ? <Card variant="default" style={styles.sectionCard}>
              <Text style={styles.cardSectionTitle}>PASSION DOMAINS</Text>
              <View style={styles.chipsWrap}>
                {user.interests.map((interest) => (
                  <Badge key={interest} label={interest} variant="cyan" size="sm" />
                ))}
              </View>
            </Card> : null}
            {!user.goals && !user.availability && !user.skills.length && !user.interests.length ? (
              <Text style={styles.goalsText}>Add a short bio, goals, skills, or interests to show what you’re working toward.</Text>
            ) : null}
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

        {activeTab === 'contributions' && <View style={styles.tabContent}>
          <Text style={styles.cardSectionTitle}>MY COMMUNITY POSTS ({visibleMyPosts.length})</Text>
          {visibleMyPosts.map((post) => <Card key={post.id} variant="default" style={{ marginBottom: 10 }}><Text style={styles.projectTitle}>{post.title}</Text><Text style={styles.projectTagline} numberOfLines={3}>{post.content}</Text></Card>)}
          {!visibleMyPosts.length ? <Text style={styles.goalsText}>You have not shared a community post yet.</Text> : null}
          <Text style={[styles.cardSectionTitle, { marginTop: 18 }]}>MY ACTIVE SERVICES ({myServices.length})</Text>
          {myServices.map((service) => <Card key={service.id} variant="default" style={{ marginBottom: 10 }}><Text style={styles.projectTitle}>{service.title}</Text><Text style={styles.projectTagline}>{service.description}</Text>{service.startingPrice != null ? <Text style={styles.projectTagline}>Starting at ₹{service.startingPrice.toLocaleString('en-IN')}</Text> : null}</Card>)}
          {!myServices.length ? <Text style={styles.goalsText}>No active services listed.</Text> : null}
          <Text style={[styles.cardSectionTitle, { marginTop: 18 }]}>MY STUDY RESOURCES ({visibleMyResources.length})</Text>
          {visibleMyResources.map((resource) => <Card key={resource.id} variant="default" style={{ marginBottom: 10 }} onPress={() => router.push({ pathname: '/resource/[id]', params: { id: resource.id } } as never)}><Text style={styles.projectTitle}>{resource.title}</Text><Text style={styles.projectTagline}>{resource.subject} · {resource.academicYear}</Text></Card>)}
          {!visibleMyResources.length ? <Text style={styles.goalsText}>Study PDFs you share will appear here.</Text> : null}
        </View>}

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
                {(user.badges || []).map((b) => (
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
              <Input label="Student name" value={nameInput} onChangeText={setNameInput} placeholder="Your name" />
              <Input label="Avatar image URL" value={avatarInput} onChangeText={setAvatarInput} placeholder="https://..." />
              <Text style={styles.detailLine}>Sign-in email: {user.email || 'Not provided'}</Text>
              <Input label="College email" value={collegeEmailInput} onChangeText={setCollegeEmailInput} placeholder="Not provided" />
              <Input label="Date of birth (YYYY-MM-DD)" value={dateOfBirthInput} onChangeText={setDateOfBirthInput} placeholder="Not provided" />
              <Input label="College" value={collegeInput} onChangeText={setCollegeInput} placeholder="Your college" />
              <Input label="Degree / Program" value={degreeInput} onChangeText={setDegreeInput} placeholder="B.Tech Computer Science" />
              <Input label="Branch" value={branchInput} onChangeText={setBranchInput} placeholder="Computer Science" />
              <View style={{ flexDirection: 'row' }}>
                <View style={{ flex: 1, marginRight: 8 }}><Input label="Study year" value={studyYearInput} onChangeText={setStudyYearInput} placeholder="2" /></View>
                <View style={{ flex: 1 }}><Input label="Graduation year" value={graduationYearInput} onChangeText={setGraduationYearInput} placeholder="2028" /></View>
              </View>
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
              <Input label="Interests (Comma-separated)" value={interestsInput} onChangeText={setInterestsInput} placeholder="AI, robotics, climate tech" helperText="Separate multiple interests with commas" />

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

      {/* ACTION SHEET FOR SUBMIT IDEA / SHOWCASE / RECRUIT */}
      <ActionSheet
        visible={showActionSheet}
        onClose={() => setShowActionSheet(false)}
      />
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
  plusActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  hubSection: {
    marginBottom: 20,
  },
  hubSectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  hubItemHighlight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.primary,
    padding: 14,
    marginBottom: 10,
  },
  hubItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  hubIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  hubItemTitle: {
    fontSize: Typography.body,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  hubItemSub: {
    fontSize: Typography.caption,
    color: Colors.textMuted,
    marginTop: 2,
  },
  hubItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hubBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  hubBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
  },
  hubGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  hubGridCard: {
    width: '48.5%',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 12,
  },
  miniIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  hubGridTitle: {
    fontSize: Typography.footnote,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  hubGridSub: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 2,
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
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginBottom: 16,
    gap: 4,
  },
  tabItem: {
    minHeight: 48,
    justifyContent: 'center',
    paddingVertical: 8,
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
  detailLine: { color: Colors.textSecondary, fontSize: Typography.footnote, lineHeight: 22 },
  detailRow: { paddingVertical: 11, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border, gap: 4 },
  detailLabel: { color: Colors.textMuted, fontSize: Typography.caption, fontWeight: Typography.semiBold, textTransform: 'uppercase', letterSpacing: 0.4 },
  detailValue: { color: Colors.textPrimary, fontSize: Typography.body, lineHeight: 21 },
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
