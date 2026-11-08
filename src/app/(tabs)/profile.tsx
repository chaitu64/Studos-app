import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Modal, Pressable, ScrollView, Share, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, Typography } from '../../constants/theme';
import { Avatar } from '../../components/ui/Avatar';
import { Input } from '../../components/ui/Input';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { CommunityPost } from '../../types';
import { postService } from '../../services/postService';

type ProfileSection = 'about' | 'work' | 'contributions';
const validHttps = (value?: string) => Boolean(value && /^https:\/\//i.test(value));

export default function ProfileScreen() {
  const { width: viewportWidth } = useWindowDimensions();
  const wideLayout = viewportWidth >= 760;
  const { user, ideas, studentServices, updateProfile } = useApp();
  const { session } = useAuth();
  const [section, setSection] = useState<ProfileSection>('about');
  const [editing, setEditing] = useState(false);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [workLoading, setWorkLoading] = useState(false);
  const [workError, setWorkError] = useState('');
  const [name, setName] = useState(user.name);
  const [bio, setBio] = useState(user.shortBio);
  const [college, setCollege] = useState(user.college);
  const [degree, setDegree] = useState(user.degree);
  const [branch, setBranch] = useState(user.branch || '');
  const [year, setYear] = useState(user.studyYear || '');
  const [skills, setSkills] = useState(user.skills.join(', '));
  const [interests, setInterests] = useState(user.interests.join(', '));
  const [github, setGithub] = useState(user.githubUrl || '');
  const [linkedin, setLinkedin] = useState(user.linkedinUrl || '');
  const [portfolio, setPortfolio] = useState(user.portfolioUrl || '');
  const authenticatedId = session?.user.id;

  useEffect(() => {
    let active = true;
    if (!authenticatedId) return () => { active = false; };
    const timer = setTimeout(() => {
      if (!active) return;
      setWorkLoading(true); setWorkError('');
      void postService.feed(1, 100, undefined, authenticatedId).then((result) => {
        if (active) setPosts(result.posts.filter((post) => post.author.id === authenticatedId));
      }).catch((error) => {
        if (active) { console.error('Profile work load failed:', error); setWorkError(error instanceof Error ? error.message : 'Your work could not be loaded.'); }
      }).finally(() => { if (active) setWorkLoading(false); });
    }, 0);
    return () => { active = false; clearTimeout(timer); };
  }, [authenticatedId]);

  const ownedIdeas = useMemo(() => ideas.filter((idea) => idea.creator.identity?.type === 'real' && idea.creator.identity.id === authenticatedId), [ideas, authenticatedId]);
  const ownedServices = useMemo(() => studentServices.filter((service) => service.provider.identity?.type === 'real' && service.provider.identity.id === authenticatedId && service.isActive !== false), [studentServices, authenticatedId]);
  const authenticatedPosts = authenticatedId ? posts.filter((post) => post.author.id === authenticatedId) : [];
  const featuredWork = authenticatedPosts.filter((post) => post.type === 'project');
  const otherContributions = authenticatedPosts.filter((post) => post.type !== 'project');
  const academicLine = [user.degree, user.branch, user.studyYear ? `Year ${user.studyYear}` : '', user.college].filter(Boolean).join(' · ');

  const save = async () => {
    const links = [github, linkedin, portfolio].map((value) => value.trim()).filter(Boolean);
    if (links.some((value) => !validHttps(value))) { Alert.alert('Check your links', 'Professional links must use HTTPS.'); return; }
    try {
      const refreshed = await updateProfile({ name: name.trim(), shortBio: bio.trim(), college: college.trim(), degree: degree.trim(), branch: branch.trim(), studyYear: year.trim(), skills: skills.split(',').map((v) => v.trim()).filter(Boolean), interests: interests.split(',').map((v) => v.trim()).filter(Boolean), githubUrl: github.trim(), linkedinUrl: linkedin.trim(), portfolioUrl: portfolio.trim() });
      setEditing(false);
      Alert.alert('Profile updated', refreshed.profileLinksAvailable === false ? 'Your profile details were saved. Professional links will save after migration 010 is deployed.' : 'Your portfolio information has been saved.');
    } catch (error) { Alert.alert('Could not update profile', error instanceof Error ? error.message : 'Please try again.'); }
  };
  const shareProfile = async () => {
    const url = typeof window !== 'undefined' ? `${window.location.origin}/student/real/${user.id}` : `studos://student/real/${user.id}`;
    try { await Share.share({ message: `${user.name} on STUDOS: ${url}`, url }); } catch (error) { console.error('Profile share failed:', error); }
  };
  const openLink = (url?: string) => { if (validHttps(url)) void Linking.openURL(url!); };
  const openEditor = () => {
    if (!session) { router.push('/login' as never); return; }
    setName(user.name); setBio(user.shortBio); setCollege(user.college); setDegree(user.degree); setBranch(user.branch || '');
    setYear(user.studyYear || ''); setSkills(user.skills.join(', ')); setInterests(user.interests.join(', '));
    setGithub(user.githubUrl || ''); setLinkedin(user.linkedinUrl || ''); setPortfolio(user.portfolioUrl || ''); setEditing(true);
  };

  return <SafeAreaView style={styles.safe} edges={['top']}>
    <View style={styles.topBar}><Text style={styles.pageTitle}>Profile</Text><View style={styles.topActions}><Pressable accessibilityRole="button" accessibilityLabel="Open messages" onPress={() => router.push('/messages' as never)} style={styles.iconButton}><Ionicons name="chatbubble-ellipses-outline" size={17} color={Colors.textPrimary}/></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Notifications" onPress={() => router.push('/notifications' as never)} style={styles.iconButton}><Ionicons name="notifications-outline" size={17} color={Colors.textPrimary}/></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Edit profile" onPress={openEditor} style={styles.iconButton}><Ionicons name="create-outline" size={19} color={Colors.textPrimary}/></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Settings" onPress={() => router.push('/settings' as never)} style={styles.iconButton}><Ionicons name="settings-outline" size={18} color={Colors.textPrimary}/></Pressable></View></View>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.identityPanel}>
        <View style={styles.identityTop}><Avatar uri={user.avatar} name={user.name} size={82}/><View style={styles.identityCopy}><Text style={styles.name}>{user.name || 'Student'}</Text><Text style={styles.headline}>{user.primaryRole || [user.degree, user.branch].filter(Boolean).join(' · ') || 'Student portfolio'}</Text><Text style={styles.academic} numberOfLines={3}>{academicLine || 'Add your academic details to introduce yourself.'}</Text></View></View>
        <Text style={styles.bio}>{user.shortBio || 'Share what you are learning, building, and hoping to work on.'}</Text>
        <View style={styles.profileActions}><Pressable accessibilityRole="button" onPress={openEditor} style={styles.editButton}><Ionicons name="create-outline" size={16} color={Colors.textOnPrimary}/><Text style={styles.editText}>Edit Profile</Text></Pressable><Pressable accessibilityRole="button" onPress={() => void shareProfile()} style={styles.shareButton}><Ionicons name="share-outline" size={16} color={Colors.textPrimary}/><Text style={styles.shareText}>Share</Text></Pressable></View>
        {(validHttps(user.githubUrl) || validHttps(user.linkedinUrl) || validHttps(user.portfolioUrl)) && <View style={styles.links}>{validHttps(user.githubUrl) && <Pressable accessibilityRole="link" onPress={() => openLink(user.githubUrl)} style={styles.linkChip}><Ionicons name="logo-github" size={15} color={Colors.textPrimary}/><Text style={styles.linkText}>GitHub</Text></Pressable>}{validHttps(user.linkedinUrl) && <Pressable accessibilityRole="link" onPress={() => openLink(user.linkedinUrl)} style={styles.linkChip}><Ionicons name="logo-linkedin" size={15} color={Colors.textPrimary}/><Text style={styles.linkText}>LinkedIn</Text></Pressable>}{validHttps(user.portfolioUrl) && <Pressable accessibilityRole="link" onPress={() => openLink(user.portfolioUrl)} style={styles.linkChip}><Ionicons name="globe-outline" size={15} color={Colors.textPrimary}/><Text style={styles.linkText}>Portfolio</Text></Pressable>}</View>}
      </View>
      <View style={styles.sectionTabs}>{(['about', 'work', 'contributions'] as const).map((tab) => <Pressable key={tab} accessibilityRole="tab" accessibilityState={{ selected: section === tab }} onPress={() => setSection(tab)} style={[styles.sectionTab, section === tab && styles.sectionTabActive]}><Text style={[styles.sectionTabText, section === tab && styles.sectionTabTextActive]}>{tab === 'about' ? 'About' : tab === 'work' ? 'Work' : 'Contributions'}</Text></Pressable>)}</View>
      {section === 'about' ? <View style={styles.sectionBody}>
        <SectionTitle title="Introduction"/><Text style={styles.bodyText}>{user.shortBio || 'Add a short introduction about your interests and the kind of work you want to do.'}</Text>
        <SectionTitle title="Skills & expertise"/>{user.skills.length ? <View style={styles.skills}>{user.skills.map((skill) => <View key={skill} style={styles.skill}><Text style={styles.skillText}>{skill}</Text></View>)}</View> : <Text style={styles.muted}>Add skills you use or are learning.</Text>}
        <SectionTitle title="Interests"/>{user.interests.length ? <Text style={styles.bodyText}>{user.interests.join(' · ')}</Text> : <Text style={styles.muted}>Add areas you would like to explore.</Text>}
        <SectionTitle title="Education"/>{academicLine ? <Text style={styles.bodyText}>{academicLine}</Text> : <Text style={styles.muted}>Education details have not been added.</Text>}
      </View> : null}
      {section === 'work' ? <View style={styles.sectionBody}>
        <View style={styles.workHeading}><View><SectionTitle title="Featured work"/><Text style={styles.muted}>Builds and work you have shared on STUDOS.</Text></View><Pressable accessibilityRole="button" onPress={() => router.push('/profile/add-work' as never)} style={styles.addWork}><Ionicons name="add" size={17} color={Colors.primary}/><Text style={styles.addWorkText}>Add work</Text></Pressable></View>
        {workLoading ? <ActivityIndicator color={Colors.primary} style={{ marginVertical: 22 }}/> : workError ? <Text style={styles.error}>{workError}</Text> : featuredWork.length ? <View style={wideLayout ? styles.workGrid : undefined}>{featuredWork.map((post) => <Pressable key={post.id} onPress={() => router.push(`/post/${post.id}` as never)} style={[styles.workCard, wideLayout && styles.workCardWide]}><View style={styles.workIcon}><Ionicons name="code-slash-outline" size={20} color={Colors.primary}/></View><View style={{ flex: 1 }}><Text style={styles.workTitle}>{post.title}</Text><Text style={styles.bodyText} numberOfLines={3}>{post.content}</Text>{post.technologies?.length || post.tags?.length ? <Text style={styles.workTags}>{(post.technologies || post.tags || []).join(' · ')}</Text> : null}</View><Ionicons name="arrow-up-right-box" size={17} color={Colors.textMuted}/></Pressable>)}</View> : <View style={styles.emptyWork}><Ionicons name="layers-outline" size={24} color={Colors.primary}/><Text style={styles.emptyTitle}>Your work deserves a place here.</Text><Text style={styles.muted}>Share a build update to feature a real project and its progress.</Text><Pressable accessibilityRole="button" onPress={() => router.push('/profile/add-work' as never)} style={styles.addWorkCta}><Text style={styles.editText}>Add your first project</Text></Pressable></View>}
        <SectionTitle title="Services"/>{ownedServices.length ? ownedServices.map((service) => <View key={service.id} style={styles.serviceRow}><View style={styles.workIcon}><Ionicons name="construct-outline" size={18} color={Colors.primary}/></View><View style={{ flex: 1 }}><Text style={styles.workTitle}>{service.title}</Text><Text style={styles.muted}>{service.category}{service.startingPrice != null ? ` · From ₹${service.startingPrice.toLocaleString('en-IN')}` : ''}</Text></View></View>) : <Text style={styles.muted}>No active service offers are linked to this account.</Text>}
      </View> : null}
      {section === 'contributions' ? <View style={styles.sectionBody}>
        <SectionTitle title="Ideas shared"/>{ownedIdeas.length ? ownedIdeas.map((idea) => <Pressable key={idea.id} onPress={() => router.push(`/ideahub/${idea.id}` as never)} style={styles.contribution}><Text style={styles.workTitle}>{idea.title}</Text><Text style={styles.muted}>{idea.category} · {idea.stage}</Text></Pressable>) : <Text style={styles.muted}>No Auth-owned ideas are linked to this profile yet.</Text>}
        <SectionTitle title="Community contributions"/>{otherContributions.length ? otherContributions.map((post) => <Pressable key={post.id} onPress={() => router.push(`/post/${post.id}` as never)} style={styles.contribution}><Text style={styles.workTitle}>{post.title}</Text><Text style={styles.muted}>{post.type.replace('_', ' ')} · {post.category || 'Community'}</Text></Pressable>) : <Text style={styles.muted}>Posts you share will appear here.</Text>}
      </View> : null}
      <Pressable accessibilityRole="button" onPress={() => router.push('/saved' as never)} style={styles.savedLink}><Ionicons name="bookmark-outline" size={17} color={Colors.textMuted}/><Text style={styles.savedText}>Saved items</Text><Ionicons name="chevron-forward" size={17} color={Colors.textMuted}/></Pressable>
      {!session && <Text style={styles.muted}>Sign in to edit your portfolio and publish work.</Text>}
    </ScrollView>
    <Modal visible={editing} transparent animationType="slide" onRequestClose={() => setEditing(false)}><View style={styles.scrim}><View style={styles.editor}><View style={styles.editorHead}><Text style={styles.editorTitle}>Edit Profile</Text><Pressable accessibilityRole="button" onPress={() => setEditing(false)}><Ionicons name="close" size={22} color={Colors.textMuted}/></Pressable></View><ScrollView keyboardShouldPersistTaps="handled"><Input label="Full name" value={name} onChangeText={setName}/><Input label="College" value={college} onChangeText={setCollege}/><Input label="Degree" value={degree} onChangeText={setDegree}/><Input label="Branch" value={branch} onChangeText={setBranch}/><Input label="Study year" value={year} onChangeText={setYear} keyboardType="numeric"/><Input label="Short bio" value={bio} onChangeText={setBio} multiline/><Input label="Skills (comma separated)" value={skills} onChangeText={setSkills}/><Input label="Interests (comma separated)" value={interests} onChangeText={setInterests}/><Input label="GitHub HTTPS URL" value={github} onChangeText={setGithub}/><Input label="LinkedIn HTTPS URL" value={linkedin} onChangeText={setLinkedin}/><Input label="Portfolio HTTPS URL" value={portfolio} onChangeText={setPortfolio}/><Pressable accessibilityRole="button" onPress={() => void save()} style={styles.saveButton}><Text style={styles.editText}>Save Profile</Text></Pressable></ScrollView></View></View></Modal>
  </SafeAreaView>;
}

function SectionTitle({ title }: { title: string }) { return <Text style={styles.sectionTitle}>{title}</Text>; }

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background }, topBar: { height: 54, maxWidth: 880, width: '100%', alignSelf: 'center', paddingHorizontal: Spacing.screenPadding, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pageTitle: { color: Colors.textPrimary, fontSize: 19, fontWeight: Typography.bold }, topActions: { flexDirection: 'row', gap: 8 }, iconButton: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface },
  content: { width: '100%', maxWidth: 880, alignSelf: 'center', paddingHorizontal: Spacing.screenPadding, paddingBottom: 50 }, identityPanel: { paddingTop: 20, paddingBottom: 18, borderBottomWidth: 1, borderBottomColor: Colors.border }, identityTop: { flexDirection: 'row', alignItems: 'center', gap: 17 }, identityCopy: { flex: 1, minWidth: 0 }, name: { color: Colors.textPrimary, fontSize: 26, lineHeight: 32, fontWeight: Typography.bold }, headline: { color: Colors.primary, fontSize: 14, lineHeight: 19, fontWeight: Typography.semiBold, marginTop: 3 }, academic: { color: Colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: 4 }, bio: { color: Colors.textSecondary, fontSize: 14, lineHeight: 22, marginTop: 17, maxWidth: 680 }, profileActions: { flexDirection: 'row', gap: 9, marginTop: 15 }, editButton: { minHeight: 40, paddingHorizontal: 13, borderRadius: 12, backgroundColor: Colors.primary, flexDirection: 'row', alignItems: 'center', gap: 7 }, editText: { color: Colors.textOnPrimary, fontSize: 12, fontWeight: Typography.bold }, shareButton: { minHeight: 40, paddingHorizontal: 13, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface, flexDirection: 'row', alignItems: 'center', gap: 7 }, shareText: { color: Colors.textPrimary, fontSize: 12, fontWeight: Typography.semiBold }, links: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 13 }, linkChip: { minHeight: 34, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, flexDirection: 'row', alignItems: 'center', gap: 6 }, linkText: { color: Colors.textSecondary, fontSize: 11, fontWeight: Typography.medium },
  sectionTabs: { flexDirection: 'row', gap: 20, borderBottomWidth: 1, borderBottomColor: Colors.border, marginTop: 8 }, sectionTab: { minHeight: 48, justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent', paddingHorizontal: 2 }, sectionTabActive: { borderBottomColor: Colors.primary }, sectionTabText: { color: Colors.textMuted, fontSize: 13, fontWeight: Typography.medium }, sectionTabTextActive: { color: Colors.textPrimary, fontWeight: Typography.semiBold }, sectionBody: { paddingTop: 21, paddingBottom: 20 }, sectionTitle: { color: Colors.textPrimary, fontSize: 16, fontWeight: Typography.bold, marginTop: 19, marginBottom: 9 }, bodyText: { color: Colors.textSecondary, fontSize: 13, lineHeight: 21 }, muted: { color: Colors.textMuted, fontSize: 12, lineHeight: 19 }, skills: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, skill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 9, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border }, skillText: { color: Colors.textSecondary, fontSize: 11 }, workHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, addWork: { minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10 }, addWorkText: { color: Colors.primary, fontSize: 12, fontWeight: Typography.semiBold }, workCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14, marginTop: 12, borderWidth: 1, borderColor: Colors.border, borderRadius: 15, backgroundColor: Colors.surface }, workIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: Colors.primarySubtle, alignItems: 'center', justifyContent: 'center' }, workTitle: { color: Colors.textPrimary, fontSize: 14, fontWeight: Typography.semiBold, marginBottom: 4 }, workTags: { color: Colors.primary, fontSize: 11, marginTop: 6 }, emptyWork: { alignItems: 'flex-start', gap: 8, padding: 18, marginTop: 13, borderWidth: 1, borderColor: Colors.border, borderRadius: 16, backgroundColor: Colors.surface }, emptyTitle: { color: Colors.textPrimary, fontSize: 15, fontWeight: Typography.semiBold }, addWorkCta: { minHeight: 40, paddingHorizontal: 13, borderRadius: 11, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 5 }, serviceRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 11, borderTopWidth: 1, borderTopColor: Colors.border }, contribution: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border }, error: { color: Colors.primary, fontSize: 12, marginVertical: 12 }, savedLink: { minHeight: 48, paddingHorizontal: 3, borderTopWidth: 1, borderTopColor: Colors.border, flexDirection: 'row', alignItems: 'center', gap: 10 }, savedText: { flex: 1, color: Colors.textSecondary, fontSize: 12 },
  workGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, workCardWide: { width: '48%', minWidth: 280, flexGrow: 1 },
  scrim: { flex: 1, justifyContent: 'flex-end', backgroundColor: Colors.overlay }, editor: { width: '100%', maxWidth: 680, alignSelf: 'center', maxHeight: '90%', paddingHorizontal: 20, paddingTop: 18, paddingBottom: 28, backgroundColor: Colors.surfaceElevated, borderTopLeftRadius: 22, borderTopRightRadius: 22 }, editorHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12 }, editorTitle: { color: Colors.textPrimary, fontSize: 18, fontWeight: Typography.bold }, saveButton: { minHeight: 48, marginTop: 16, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: Colors.primary },
});
