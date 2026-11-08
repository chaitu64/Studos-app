import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '../ui/Avatar';
import { Colors, Spacing, Typography } from '../../constants/theme';
import { SectionHeader } from '../ui/SectionHeader';
import { ChatConversation } from '../../types';
import { CommunityQuestionPreview, StudentService, StudentSpotlight } from '../../services/homeDiscoveryData';

export function StudentSpotlightSection({ students, loading = false, error = '' }: { students: StudentSpotlight[]; loading?: boolean; error?: string }) {
  const { width } = useWindowDimensions();
  return <View style={styles.section}><SectionHeader title="Discover students" subtitle="Meet the students building, creating, and learning on campus." actionLabel="See all" onAction={() => router.push('/students' as never)} />
    {loading ? <Text style={{ color: Colors.textMuted, paddingHorizontal: 16 }}>Loading students…</Text> : error ? <Text style={{ color: Colors.textMuted, paddingHorizontal: 16 }}>{error}</Text> : students.length === 0 ? <Text style={{ color: Colors.textMuted, paddingHorizontal: 16 }}>No student profiles to show yet.</Text> : <FlatList horizontal data={students} keyExtractor={(item) => `${item.identity?.type || 'real'}:${item.id}`} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalContent} renderItem={({ item }) => <TouchableOpacity activeOpacity={.9} onPress={() => item.identity && router.push(`/student/${item.identity.type}/${item.identity.id}` as never)} style={[styles.studentCard, { width: Math.min(310, width - 56) }]}>
      <View style={styles.studentTop}><Avatar uri={item.avatar} name={item.name} size={48} /><View style={styles.studentIdentity}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Text style={styles.studentName} numberOfLines={1}>{item.name}</Text>{item.isDemo ? <Text style={styles.demoLabel}>DEMO</Text> : null}</View><Text style={styles.studentRole} numberOfLines={1}>{item.role}</Text><Text style={styles.studentBranch} numberOfLines={1}>{item.branchYear}</Text></View></View>
      <Text style={styles.studentIntro} numberOfLines={2}>{item.intro}</Text>
      <View style={styles.skills}>{item.skills.slice(0, 3).map((skill) => <Text key={skill} style={styles.skill}>{skill}</Text>)}</View>
      {item.currentWork ? <View style={styles.currentWork}><Text style={styles.eyebrow}>INTERESTS</Text><Text style={styles.currentWorkText} numberOfLines={1}>{item.currentWork}</Text></View> : null}
      {item.availability ? <View style={styles.available}><View style={styles.availableDot} /><Text style={styles.availableText}>Available for {item.availability}</Text></View> : null}
      <View style={styles.studentActions}><View style={styles.secondaryAction}><Text style={styles.secondaryActionText}>View profile</Text></View></View>
    </TouchableOpacity>} />}
  </View>;
}

export function SkillsServicesSection({ services }: { services: StudentService[] }) {
  if (!services.length) return null;
  return <View style={styles.compactServices}>
    <SectionHeader title="Student services" actionLabel="Explore" onAction={() => router.push('/(tabs)/swipe' as never)} />
    <View style={styles.serviceList}>{services.map((item) => <TouchableOpacity key={item.id} style={styles.serviceRow} activeOpacity={.85} onPress={() => router.push('/(tabs)/swipe' as never)}>
      <Avatar uri={item.provider.avatar} name={item.provider.name} size={34} />
      <View style={styles.serviceCopy}><Text style={styles.serviceTitleCompact} numberOfLines={1}>{item.title}</Text><Text style={styles.serviceMeta} numberOfLines={1}>{item.provider.name} � {item.category || item.provider.role}</Text></View>
      <Text style={styles.servicePrice} numberOfLines={1}>{item.startingPrice == null ? 'View' : `INR ${item.startingPrice.toLocaleString('en-IN')}`}</Text>
    </TouchableOpacity>)}</View>
  </View>;
}
export function AskCommunitySection({ questions, onAsk }: { questions: CommunityQuestionPreview[]; onAsk: () => void }) {
  return <View style={styles.section}><SectionHeader title="Ask the community" subtitle="Recent questions from students who need a second brain." actionLabel="Ask" onAction={onAsk} />
    <View style={styles.questionList}>{questions.map((item) => <TouchableOpacity key={item.id} style={styles.questionRow} onPress={() => router.push('/chat-rooms' as never)}><View style={styles.questionIcon}><Ionicons name="help" size={16} color="#FF7777" /></View><View style={styles.questionCopy}><Text style={styles.questionTitle} numberOfLines={2}>{item.title}</Text><Text style={styles.questionMeta}>{item.author} · {item.branchYear} · {item.replies} replies</Text></View><Text style={styles.questionTopic}>{item.topic}</Text></TouchableOpacity>)}</View>
  </View>;
}

export function CommunityChatSection({ conversations }: { conversations: ChatConversation[] }) {
  return <View style={styles.section}><SectionHeader title="Community chat" subtitle="Continue a conversation or find an active student room." actionLabel="Chat rooms" onAction={() => router.push('/chat-rooms' as never)} />
    <View style={styles.chatCard}>{conversations.slice(0, 3).map((conversation) => <TouchableOpacity key={conversation.id} style={styles.chatRow} onPress={() => router.push(`/chat/${conversation.id}` as never)}><Avatar uri={conversation.avatar} name={conversation.name} size={36} /><View style={styles.chatCopy}><Text style={styles.chatName}>{conversation.name}</Text><Text style={styles.chatMessage} numberOfLines={1}>{conversation.lastMessage}</Text></View><Text style={styles.chatTime}>{conversation.lastMessageTime}</Text></TouchableOpacity>)}<TouchableOpacity style={styles.collabButton} onPress={() => router.push('/teams' as never)}><Ionicons name="people-outline" size={18} color="#FFF" /><View style={{ flex: 1 }}><Text style={styles.collabTitle}>Looking for collaborators?</Text><Text style={styles.collabSubtitle}>Browse open student teams and project roles.</Text></View><Ionicons name="chevron-forward" size={18} color={Colors.textMuted} /></TouchableOpacity></View>
  </View>;
}

const styles = StyleSheet.create({
  compactServices: { marginHorizontal: Spacing.screenPadding, marginTop: 4, marginBottom: 10 },
  serviceList: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 14, overflow: 'hidden' },
  serviceRow: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  serviceCopy: { flex: 1, minWidth: 0 },
  serviceTitleCompact: { color: Colors.textPrimary, fontSize: 13, lineHeight: 18, fontWeight: Typography.semiBold },
  serviceMeta: { color: Colors.textMuted, fontSize: 11, lineHeight: 16, marginTop: 2 },
  servicePrice: { color: Colors.primary, fontSize: 12, lineHeight: 17, fontWeight: Typography.bold, maxWidth: 85, textAlign: 'right' },
  section: { marginTop: 28 },
  horizontalContent: { paddingHorizontal: Spacing.screenPadding },
  demoLabel: { color: Colors.accentPurple, fontSize: 10, lineHeight: 15, fontWeight: Typography.bold },
  studentCard: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: 18, padding: 16, marginRight: 12 },
  studentTop: { flexDirection: 'row', alignItems: 'center' },
  studentIdentity: { marginLeft: 11, flex: 1, minWidth: 0 },
  studentName: { color: Colors.textPrimary, fontSize: 15, lineHeight: 20, fontWeight: Typography.bold },
  studentRole: { color: Colors.primary, fontSize: 13, lineHeight: 18, fontWeight: Typography.semiBold, marginTop: 2 },
  studentBranch: { color: Colors.textMuted, fontSize: 12, lineHeight: 17, marginTop: 2 },
  studentIntro: { color: Colors.textSecondary, fontSize: 14, lineHeight: 21, marginTop: 12 },
  skills: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 10 },
  skill: { color: Colors.textSecondary, backgroundColor: Colors.surfaceHighlight, fontSize: 12, lineHeight: 17, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 9 },
  currentWork: { marginTop: 12 },
  eyebrow: { color: Colors.textSubtle, fontSize: 10, lineHeight: 15, fontWeight: Typography.bold, letterSpacing: 0.7 },
  currentWorkText: { color: Colors.textPrimary, fontSize: 13, lineHeight: 18, fontWeight: Typography.semiBold, marginTop: 3 },
  available: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  availableDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.success },
  availableText: { color: Colors.textMuted, fontSize: 12, lineHeight: 17 },
  studentActions: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  secondaryAction: { flex: 1, minHeight: 44, borderWidth: 1, borderColor: Colors.border, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  secondaryActionText: { color: Colors.textPrimary, fontSize: 13, fontWeight: Typography.bold },
  iconAction: { width: 44, height: 44, backgroundColor: Colors.primary, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  serviceCard: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: 18, padding: 16, marginRight: 12 },
  serviceProvider: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  providerName: { color: Colors.textPrimary, fontSize: 14, lineHeight: 19, fontWeight: Typography.bold },
  providerRole: { color: Colors.textMuted, fontSize: 12, lineHeight: 16, marginTop: 2 },
  serviceTitle: { color: Colors.textPrimary, fontSize: 18, lineHeight: 24, fontWeight: Typography.bold, marginTop: 14 },
  serviceDescription: { color: Colors.textSecondary, fontSize: 14, lineHeight: 21, marginTop: 6 },
  serviceSkills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  serviceSkill: { color: Colors.textMuted, fontSize: 12, lineHeight: 17 },
  serviceFooter: { flexDirection: 'row', alignItems: 'center', paddingTop: 14 },
  availability: { color: Colors.textMuted, fontSize: 12, lineHeight: 17, flex: 1 },
  arrowButton: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.surfaceHighlight, alignItems: 'center', justifyContent: 'center' },
  projectCard: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: 18, overflow: 'hidden', marginRight: 12 },
  projectImage: { width: '100%', height: 138, backgroundColor: Colors.surfaceElevated },
  projectBody: { padding: 16 },
  achievement: { color: Colors.primary, fontSize: 11, lineHeight: 16, fontWeight: Typography.bold, textTransform: 'uppercase', marginBottom: 6 },
  projectTitle: { color: Colors.textPrimary, fontSize: 17, lineHeight: 23, fontWeight: Typography.bold },
  projectAuthor: { color: Colors.textMuted, fontSize: 12, lineHeight: 17, marginTop: 5 },
  projectSummary: { color: Colors.textSecondary, fontSize: 14, lineHeight: 20, marginTop: 8 },
  techRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 10 },
  tech: { color: Colors.textMuted, fontSize: 12, lineHeight: 17 },
  seeking: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10 },
  seekingText: { color: Colors.primary, fontSize: 13, lineHeight: 18, fontWeight: Typography.semiBold },
  questionList: { marginHorizontal: 16, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 18, overflow: 'hidden' },
  questionRow: { flexDirection: 'row', alignItems: 'center', minHeight: 72, padding: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border, gap: 8 },
  questionIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: Colors.primarySubtle, alignItems: 'center', justifyContent: 'center' },
  questionCopy: { flex: 1, minWidth: 0, marginLeft: 2, marginRight: 6 },
  questionTitle: { color: Colors.textPrimary, fontSize: 14, lineHeight: 20, fontWeight: Typography.semiBold },
  questionMeta: { color: Colors.textMuted, fontSize: 11, lineHeight: 16, marginTop: 4 },
  questionTopic: { color: Colors.textMuted, fontSize: 10, lineHeight: 15 },
  chatCard: { marginHorizontal: 16, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 18, padding: 14 },
  chatRow: { flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingVertical: 8 },
  chatCopy: { flex: 1, minWidth: 0, marginLeft: 10 },
  chatName: { color: Colors.textPrimary, fontSize: 14, lineHeight: 19, fontWeight: Typography.semiBold },
  chatMessage: { color: Colors.textMuted, fontSize: 12, lineHeight: 17, marginTop: 3 },
  chatTime: { color: Colors.textSubtle, fontSize: 10, lineHeight: 15 },
  collabButton: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.surfaceHighlight, borderRadius: 12, padding: 14, marginTop: 10, minHeight: 64 },
  collabTitle: { color: Colors.textPrimary, fontSize: 14, lineHeight: 19, fontWeight: Typography.bold },
  collabSubtitle: { color: Colors.textMuted, fontSize: 12, lineHeight: 17, marginTop: 3 },
});
