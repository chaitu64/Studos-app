import React from 'react';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '../ui/Avatar';
import { Colors, Spacing, Typography } from '../../constants/theme';
import { ChatConversation } from '../../types';
import { CommunityQuestionPreview, StudentProjectFeature, StudentService, StudentSpotlight } from '../../services/homeDiscoveryData';

function SectionHeader({ title, subtitle, action, onAction }: { title: string; subtitle: string; action?: string; onAction?: () => void }) {
  return <View style={styles.sectionHeader}><View style={styles.sectionCopy}><Text style={styles.sectionTitle}>{title}</Text><Text style={styles.sectionSubtitle}>{subtitle}</Text></View>{action ? <TouchableOpacity onPress={onAction}><Text style={styles.sectionAction}>{action}</Text></TouchableOpacity> : null}</View>;
}

export function StudentSpotlightSection({ students }: { students: StudentSpotlight[] }) {
  if (!students.length) return null;
  return <View style={styles.section}><SectionHeader title="Discover Student Talent" subtitle="Meet the people building, creating, and helping on campus." action="See all" onAction={() => router.push('/(tabs)/swipe' as never)} />
    <FlatList horizontal data={students} keyExtractor={(item) => item.id} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalContent} renderItem={({ item }) => <View style={styles.studentCard}>
      <View style={styles.studentTop}><Avatar uri={item.avatar} name={item.name} size={52} /><View style={styles.studentIdentity}><Text style={styles.studentName}>{item.name}</Text><Text style={styles.studentRole}>{item.role}</Text><Text style={styles.studentBranch}>{item.branchYear}</Text></View></View>
      <Text style={styles.studentIntro} numberOfLines={2}>{item.intro}</Text>
      <View style={styles.skills}>{item.skills.slice(0, 3).map((skill) => <Text key={skill} style={styles.skill}>{skill}</Text>)}</View>
      <View style={styles.currentWork}><Text style={styles.eyebrow}>WORKING ON</Text><Text style={styles.currentWorkText} numberOfLines={1}>{item.currentWork}</Text></View>
      {item.availability ? <View style={styles.available}><View style={styles.availableDot} /><Text style={styles.availableText}>Available for {item.availability}</Text></View> : null}
      <View style={styles.studentActions}><TouchableOpacity style={styles.secondaryAction} onPress={() => router.push('/(tabs)/swipe' as never)}><Text style={styles.secondaryActionText}>View profile</Text></TouchableOpacity><TouchableOpacity style={styles.iconAction} accessibilityLabel={`Message ${item.name}`} onPress={() => router.push('/(tabs)/chat' as never)}><Ionicons name="chatbubble-outline" size={17} color="#FFF" /></TouchableOpacity></View>
      <Text style={styles.previewLabel}>DEMO PROFILE · DEVELOPMENT ONLY</Text>
    </View>} />
  </View>;
}

export function SkillsServicesSection({ services }: { services: StudentService[] }) {
  if (!services.length) return null;
  return <View style={styles.section}><SectionHeader title="Skills & Services" subtitle="Find students who can help you build something." />
    <FlatList horizontal data={services} keyExtractor={(item) => item.id} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalContent} renderItem={({ item }) => <TouchableOpacity style={styles.serviceCard} activeOpacity={.88} onPress={() => router.push('/(tabs)/swipe' as never)}>
      <View style={styles.serviceProvider}><Avatar uri={item.provider.avatar} name={item.provider.name} size={34} /><View><Text style={styles.providerName}>{item.provider.name}</Text><Text style={styles.providerRole}>{item.provider.role}</Text></View></View>
      <Text style={styles.serviceTitle}>{item.title}</Text><Text style={styles.serviceDescription} numberOfLines={3}>{item.description}</Text>
      <View style={styles.serviceSkills}>{item.skills.map((skill) => <Text key={skill} style={styles.serviceSkill}>{skill}</Text>)}</View>
      <View style={styles.serviceFooter}><Text style={styles.availability}>{item.availability}</Text><View style={styles.arrowButton}><Ionicons name="arrow-forward" size={15} color="#FFF" /></View></View>
    </TouchableOpacity>} />
  </View>;
}

export function BuiltByStudentsSection({ projects }: { projects: StudentProjectFeature[] }) {
  if (!projects.length) return null;
  return <View style={styles.section}><SectionHeader title="Built by Students" subtitle="Projects, launches, and milestones from campus builders." action="Explore" onAction={() => router.push('/projects' as never)} />
    <FlatList horizontal data={projects} keyExtractor={(item) => item.id} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalContent} renderItem={({ item, index }) => <TouchableOpacity style={[styles.projectCard, index % 2 === 1 && styles.projectCardCompact]} activeOpacity={.9} onPress={() => router.push('/projects' as never)}>
      {item.image ? <Image source={{ uri: item.image }} style={[styles.projectImage, index % 2 === 1 && styles.projectImageCompact]} resizeMode="cover" /> : null}
      <View style={styles.projectBody}>{item.achievement ? <Text style={styles.achievement}>{item.achievement}</Text> : null}<Text style={styles.projectTitle}>{item.title}</Text><Text style={styles.projectAuthor}>{item.author} · {item.branchYear}</Text><Text style={styles.projectSummary} numberOfLines={2}>{item.summary}</Text><View style={styles.techRow}>{item.technologies.slice(0, 3).map((tech) => <Text key={tech} style={styles.tech}>{tech}</Text>)}</View>{item.seeking ? <View style={styles.seeking}><Ionicons name="people-outline" size={14} color="#FF7A7A" /><Text style={styles.seekingText}>Seeking {item.seeking}</Text></View> : null}</View>
    </TouchableOpacity>} />
  </View>;
}

export function AskCommunitySection({ questions, onAsk }: { questions: CommunityQuestionPreview[]; onAsk: () => void }) {
  return <View style={styles.section}><SectionHeader title="Ask the Community" subtitle="Recent questions from students who need a second brain." action="Ask" onAction={onAsk} />
    <View style={styles.questionList}>{questions.map((item) => <TouchableOpacity key={item.id} style={styles.questionRow} onPress={() => router.push('/chat-rooms' as never)}><View style={styles.questionIcon}><Ionicons name="help" size={16} color="#FF7777" /></View><View style={styles.questionCopy}><Text style={styles.questionTitle} numberOfLines={2}>{item.title}</Text><Text style={styles.questionMeta}>{item.author} · {item.branchYear} · {item.replies} replies</Text></View><Text style={styles.questionTopic}>{item.topic}</Text></TouchableOpacity>)}</View>
  </View>;
}

export function CommunityChatSection({ conversations }: { conversations: ChatConversation[] }) {
  return <View style={styles.section}><SectionHeader title="Community Chat" subtitle="Continue a conversation or find an active student room." action="Chat rooms" onAction={() => router.push('/chat-rooms' as never)} />
    <View style={styles.chatCard}>{conversations.slice(0, 3).map((conversation) => <TouchableOpacity key={conversation.id} style={styles.chatRow} onPress={() => router.push(`/chat/${conversation.id}` as never)}><Avatar uri={conversation.avatar} name={conversation.name} size={36} /><View style={styles.chatCopy}><Text style={styles.chatName}>{conversation.name}</Text><Text style={styles.chatMessage} numberOfLines={1}>{conversation.lastMessage}</Text></View><Text style={styles.chatTime}>{conversation.lastMessageTime}</Text></TouchableOpacity>)}<TouchableOpacity style={styles.collabButton} onPress={() => router.push('/teams' as never)}><Ionicons name="people-outline" size={18} color="#FFF" /><View style={{ flex: 1 }}><Text style={styles.collabTitle}>Looking for collaborators?</Text><Text style={styles.collabSubtitle}>Browse open student teams and project roles.</Text></View><Ionicons name="chevron-forward" size={18} color={Colors.textMuted} /></TouchableOpacity></View>
  </View>;
}

const styles = StyleSheet.create({
  section: { marginTop: 28 }, sectionHeader: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: Spacing.screenPadding, marginBottom: 13 }, sectionCopy: { flex: 1, paddingRight: 12 }, sectionTitle: { color: '#FFF', fontSize: 20, fontWeight: Typography.bold, letterSpacing: -.4 }, sectionSubtitle: { color: Colors.textMuted, fontSize: 12, lineHeight: 17, marginTop: 3 }, sectionAction: { color: '#FF6D6D', fontSize: 11, fontWeight: Typography.bold }, horizontalContent: { paddingHorizontal: Spacing.screenPadding },
  studentCard: { width: 280, backgroundColor: '#121624', borderWidth: 1, borderColor: '#252C3D', borderRadius: 16, padding: 14, marginRight: 12 }, studentTop: { flexDirection: 'row', alignItems: 'center' }, studentIdentity: { marginLeft: 11, flex: 1 }, studentName: { color: '#FFF', fontSize: 16, fontWeight: Typography.bold }, studentRole: { color: '#FF8181', fontSize: 11, fontWeight: Typography.semiBold, marginTop: 2 }, studentBranch: { color: Colors.textMuted, fontSize: 10, marginTop: 2 }, studentIntro: { color: Colors.textSecondary, fontSize: 12, lineHeight: 17, marginTop: 12 }, skills: { flexDirection: 'row', gap: 5, marginTop: 10 }, skill: { color: Colors.textSecondary, backgroundColor: '#171D2D', fontSize: 9, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 6 }, currentWork: { marginTop: 12 }, eyebrow: { color: Colors.textSubtle, fontSize: 8, fontWeight: '800', letterSpacing: .7 }, currentWorkText: { color: '#FFF', fontSize: 11, fontWeight: Typography.semiBold, marginTop: 3 }, available: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 9 }, availableDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.success }, availableText: { color: Colors.textMuted, fontSize: 9 }, studentActions: { flexDirection: 'row', alignItems: 'center', marginTop: 13, gap: 8 }, secondaryAction: { flex: 1, height: 34, borderWidth: 1, borderColor: '#30384B', borderRadius: 8, alignItems: 'center', justifyContent: 'center' }, secondaryActionText: { color: '#FFF', fontSize: 10, fontWeight: Typography.bold }, iconAction: { width: 36, height: 34, backgroundColor: Colors.primary, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }, previewLabel: { color: '#9B7845', fontSize: 7, letterSpacing: .45, marginTop: 10 },
  serviceCard: { width: 252, minHeight: 210, backgroundColor: '#121624', borderWidth: 1, borderColor: '#252C3D', borderRadius: 15, padding: 14, marginRight: 12 }, serviceProvider: { flexDirection: 'row', alignItems: 'center', gap: 9 }, providerName: { color: '#FFF', fontSize: 11, fontWeight: Typography.bold }, providerRole: { color: Colors.textMuted, fontSize: 9, marginTop: 1 }, serviceTitle: { color: '#FFF', fontSize: 16, fontWeight: Typography.bold, marginTop: 14 }, serviceDescription: { color: Colors.textSecondary, fontSize: 11, lineHeight: 16, marginTop: 6 }, serviceSkills: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 11 }, serviceSkill: { color: '#A0A9BB', fontSize: 9 }, serviceFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 'auto', paddingTop: 13 }, availability: { color: Colors.textMuted, fontSize: 9, flex: 1 }, arrowButton: { width: 29, height: 29, borderRadius: 8, backgroundColor: '#252C3D', alignItems: 'center', justifyContent: 'center' },
  projectCard: { width: 300, backgroundColor: '#121624', borderWidth: 1, borderColor: '#252C3D', borderRadius: 16, overflow: 'hidden', marginRight: 12 }, projectCardCompact: { width: 270 }, projectImage: { width: '100%', height: 158, backgroundColor: '#171D2D' }, projectImageCompact: { height: 118 }, projectBody: { padding: 14 }, achievement: { color: '#FF8585', fontSize: 9, fontWeight: '800', textTransform: 'uppercase', marginBottom: 7 }, projectTitle: { color: '#FFF', fontSize: 16, lineHeight: 21, fontWeight: Typography.bold }, projectAuthor: { color: Colors.textMuted, fontSize: 9, marginTop: 4 }, projectSummary: { color: Colors.textSecondary, fontSize: 11, lineHeight: 16, marginTop: 8 }, techRow: { flexDirection: 'row', gap: 9, marginTop: 10 }, tech: { color: Colors.textMuted, fontSize: 9 }, seeking: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10 }, seekingText: { color: '#FF8D8D', fontSize: 9, fontWeight: Typography.semiBold },
  questionList: { marginHorizontal: 16, backgroundColor: '#121624', borderWidth: 1, borderColor: '#252C3D', borderRadius: 15, overflow: 'hidden' }, questionRow: { flexDirection: 'row', alignItems: 'center', minHeight: 68, padding: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#252C3D' }, questionIcon: { width: 30, height: 30, borderRadius: 9, backgroundColor: '#2A1B22', alignItems: 'center', justifyContent: 'center' }, questionCopy: { flex: 1, marginLeft: 10, marginRight: 8 }, questionTitle: { color: '#FFF', fontSize: 11, lineHeight: 15, fontWeight: Typography.semiBold }, questionMeta: { color: Colors.textSubtle, fontSize: 8, marginTop: 4 }, questionTopic: { color: Colors.textMuted, fontSize: 8 },
  chatCard: { marginHorizontal: 16, backgroundColor: '#121624', borderWidth: 1, borderColor: '#252C3D', borderRadius: 15, padding: 12 }, chatRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }, chatCopy: { flex: 1, marginLeft: 10 }, chatName: { color: '#FFF', fontSize: 11, fontWeight: Typography.semiBold }, chatMessage: { color: Colors.textMuted, fontSize: 9, marginTop: 3 }, chatTime: { color: Colors.textSubtle, fontSize: 8 }, collabButton: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#171D2D', borderRadius: 11, padding: 12, marginTop: 8 }, collabTitle: { color: '#FFF', fontSize: 11, fontWeight: Typography.bold }, collabSubtitle: { color: Colors.textMuted, fontSize: 9, marginTop: 2 },
});
