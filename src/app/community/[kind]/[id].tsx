import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '../../../components/ui/Avatar';
import { CommunityRecordComposer, CommunityDraft } from '../../../components/home/CommunityRecordComposer';
import { Colors, BorderRadius, Spacing, Typography } from '../../../constants/theme';
import { safeBack } from '../../../navigation/safeBack';
import { useAuth } from '../../../context/AuthContext';
import { studentCommunityService, StudentHelpRequest, StudentProblem } from '../../../services/studentCommunityService';

type Kind = 'problem' | 'help';
export default function StudentCommunityDetailsScreen() {
  const params = useLocalSearchParams<{ kind: string; id: string }>();
  const kind: Kind = params.kind === 'help' ? 'help' : 'problem';
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { session } = useAuth();
  const [record, setRecord] = useState<StudentProblem | StudentHelpRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setRecord(kind === 'problem' ? await studentCommunityService.problem(id) : await studentCommunityService.helpRequest(id)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'This community record could not be loaded.'); }
    finally { setLoading(false); }
  }, [id, kind]);
  useEffect(() => { const timer = setTimeout(() => { void load(); }, 0); return () => clearTimeout(timer); }, [load]);
  const isOwner = Boolean(session?.user.id && record?.authorId === session.user.id && !record.isDemo);
  const paragraphs = (record?.description || '').split(/\n\s*\n/).filter(Boolean);
  const saveProblem = async (draft: CommunityDraft) => {
    if (kind !== 'problem' || !record) return;
    await studentCommunityService.updateProblem(record.id, draft);
    await load(); setEditing(false);
  };
  const saveHelpRequest = async (draft: CommunityDraft) => {
    if (kind !== 'help' || !record) return;
    await studentCommunityService.updateHelpRequest(record.id, draft);
    await load(); setEditing(false);
  };
  const removeRecord = async () => {
    if (!record || busy) return;
    setBusy(true);
    try { if (kind === 'problem') await studentCommunityService.deleteProblem(record.id); else await studentCommunityService.deleteHelpRequest(record.id); setConfirmDelete(false); safeBack('/(tabs)'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'This community post could not be deleted.'); setConfirmDelete(false); }
    finally { setBusy(false); }
  };

  return <SafeAreaView style={styles.safe} edges={['top','bottom']}>
    <View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => safeBack('/(tabs)')} style={styles.iconButton}><Ionicons name="arrow-back" size={20} color={Colors.textPrimary}/></Pressable><Text style={styles.headerTitle}>{kind === 'problem' ? 'Problem Details' : 'Help Request'}</Text>{isOwner ? <Pressable accessibilityRole="button" accessibilityLabel="More community post actions" onPress={() => setConfirmDelete(true)} style={styles.iconButton}><Ionicons name="ellipsis-horizontal" size={20} color={Colors.textPrimary}/></Pressable> : <View style={styles.iconButton}/>}</View>
    {loading ? <View style={styles.state}><ActivityIndicator color={Colors.primary}/><Text style={styles.muted}>Loading details…</Text></View> : error && !record ? <View style={styles.state}><Text style={styles.error}>{error}</Text><Pressable onPress={() => void load()}><Text style={styles.link}>Retry</Text></Pressable></View> : record ? <ScrollView contentContainerStyle={styles.content}>
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      <View style={styles.kindTag}><Ionicons name={kind === 'problem' ? 'help-circle-outline' : 'hand-right-outline'} size={15} color={Colors.primary}/><Text style={styles.kindText}>{kind === 'problem' ? 'STUDENT PROBLEM' : 'HELP NEEDED'}</Text>{record.isDemo ? <Text style={styles.demoTag}>DEMO</Text> : null}</View>
      <Text style={styles.title}>{record.title}</Text>
      <View style={styles.authorRow}><Pressable accessibilityRole="button" onPress={() => router.push(`/student/${record.author.identity.type}/${record.author.id}` as never)}><Avatar uri={record.author.avatar} name={record.author.name} size={44}/></Pressable><View style={styles.authorCopy}><Pressable accessibilityRole="button" onPress={() => router.push(`/student/${record.author.identity.type}/${record.author.id}` as never)}><Text style={styles.author}>{record.author.name}</Text></Pressable><Text style={styles.authorMeta}>{[record.author.college,record.author.degree,record.author.branch,record.author.studyYear ? `Year ${record.author.studyYear}` : null].filter(Boolean).join(' · ') || (record.isDemo ? 'Sample student profile' : 'STUDOS student')}</Text></View></View>
      <View style={styles.metadata}><Text style={styles.metaChip}>{record.category || 'Community'}</Text><Text style={styles.status}>{record.status || 'Open'}</Text></View>
      <View style={styles.description}>{paragraphs.map((paragraph, index) => <Text key={`${index}-${paragraph.slice(0,12)}`} style={styles.paragraph}>{paragraph}</Text>)}</View>
      {kind === 'problem' && (record as StudentProblem).context ? <><Text style={styles.sectionTitle}>Context</Text><Text style={styles.secondary}>{(record as StudentProblem).context}</Text></> : null}
      {kind === 'problem' && (record as StudentProblem).expectedSolution ? <><Text style={styles.sectionTitle}>Expected solution</Text><Text style={styles.secondary}>{(record as StudentProblem).expectedSolution}</Text></> : null}
      {record.attachments.length ? <><Text style={styles.sectionTitle}>Attachments & links</Text>{record.attachments.map((url) => <Pressable key={url} accessibilityRole="link" onPress={() => void Linking.openURL(url)}><Text style={styles.link}>{url}</Text></Pressable>)}</> : null}
      {kind === 'problem' ? <View style={styles.tags}>{(record as StudentProblem).tags.map((tag) => <Text key={tag} style={styles.tag}>#{tag.replace(/^#/, '')}</Text>)}</View> : <>
        <Text style={styles.sectionTitle}>Help type</Text><Text style={styles.secondary}>{(record as StudentHelpRequest).helpType || 'Not specified'}</Text>
        <Text style={styles.sectionTitle}>Skills needed</Text><View style={styles.tags}>{(record as StudentHelpRequest).skillsNeeded.map((skill) => <Text key={skill} style={styles.skill}>{skill}</Text>)}</View>
        <View style={styles.notice}><Ionicons name="information-circle-outline" size={17} color={Colors.accentAmber}/><Text style={styles.noticeText}>Help response requests are not yet connected to a secure backend workflow, so this sample request is read-only for now.</Text></View>
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: true }} disabled style={[styles.primaryButton,styles.disabled]}><Text style={styles.primaryText}>Offer Help (not available yet)</Text></Pressable>
      </>}
      {isOwner ? <View style={styles.ownerActions}><Pressable accessibilityRole="button" onPress={() => setEditing(true)} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>{kind === 'problem' ? 'Edit problem' : 'Edit request'}</Text></Pressable><Pressable accessibilityRole="button" onPress={() => setConfirmDelete(true)} style={styles.deleteButton}><Text style={styles.deleteText}>Delete</Text></Pressable></View> : null}
    </ScrollView> : null}
    {record ? <CommunityRecordComposer visible={editing} kind={kind} initial={record} onClose={() => setEditing(false)} onSubmit={kind === 'problem' ? saveProblem : saveHelpRequest}/> : null}
    <Modal visible={confirmDelete} transparent animationType="fade" onRequestClose={() => setConfirmDelete(false)}><View style={styles.scrim}><View style={styles.confirm}><Text style={styles.confirmTitle}>Delete this {kind === 'problem' ? 'problem' : 'help request'}?</Text><Text style={styles.muted}>This removes your post from the community feed.</Text><View style={styles.ownerActions}><Pressable onPress={() => setConfirmDelete(false)} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Cancel</Text></Pressable><Pressable disabled={busy} onPress={() => void removeRecord()} style={styles.deleteButton}><Text style={styles.deleteText}>{busy ? 'Deleting…' : 'Delete'}</Text></Pressable></View></View></View></Modal>
  </SafeAreaView>;
}

const styles=StyleSheet.create({safe:{flex:1,backgroundColor:Colors.background},header:{minHeight:54,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:Spacing.screenPadding,borderBottomWidth:1,borderBottomColor:Colors.border},iconButton:{width:42,height:42,alignItems:'center',justifyContent:'center'},headerTitle:{flex:1,textAlign:'center',color:Colors.textPrimary,fontSize:Typography.headline,fontWeight:Typography.bold},content:{width:'100%',maxWidth:760,alignSelf:'center',padding:Spacing.screenPadding,paddingBottom:40},state:{flex:1,justifyContent:'center',alignItems:'center',gap:12,padding:24},muted:{color:Colors.textMuted,fontSize:Typography.footnote,lineHeight:20,textAlign:'center'},error:{color:Colors.error,fontSize:Typography.footnote,lineHeight:20},link:{color:Colors.primary,fontWeight:Typography.bold},kindTag:{flexDirection:'row',alignItems:'center',gap:7,marginTop:10,marginBottom:12},kindText:{color:Colors.primary,fontSize:10,fontWeight:Typography.bold,letterSpacing:.7},demoTag:{color:Colors.accentAmber,fontSize:9,fontWeight:Typography.bold,backgroundColor:Colors.surfaceElevated,paddingHorizontal:7,paddingVertical:4,borderRadius:10},title:{color:Colors.textPrimary,fontSize:26,lineHeight:33,fontWeight:Typography.bold,marginBottom:17},authorRow:{flexDirection:'row',alignItems:'center',gap:11},authorCopy:{flex:1,minWidth:0},author:{color:Colors.textPrimary,fontSize:Typography.body,fontWeight:Typography.semiBold},authorMeta:{color:Colors.textMuted,fontSize:Typography.caption,lineHeight:17,marginTop:3},metadata:{flexDirection:'row',alignItems:'center',gap:10,marginTop:18},metaChip:{color:Colors.textSecondary,fontSize:Typography.caption,backgroundColor:Colors.surface,paddingHorizontal:10,paddingVertical:6,borderRadius:20},status:{color:Colors.textMuted,fontSize:Typography.caption,textTransform:'capitalize'},description:{marginTop:20},paragraph:{color:Colors.textSecondary,fontSize:Typography.body,lineHeight:25,marginBottom:15},tags:{flexDirection:'row',flexWrap:'wrap',gap:9,marginTop:14},tag:{color:Colors.accentCyan,fontSize:Typography.footnote},sectionTitle:{color:Colors.textPrimary,fontSize:Typography.subhead,fontWeight:Typography.bold,marginTop:20,marginBottom:8},secondary:{color:Colors.textSecondary,fontSize:Typography.body},skill:{color:Colors.textSecondary,borderWidth:1,borderColor:Colors.border,backgroundColor:Colors.surface,paddingHorizontal:10,paddingVertical:6,borderRadius:20,fontSize:Typography.caption},notice:{flexDirection:'row',gap:9,alignItems:'flex-start',padding:12,marginTop:20,borderRadius:12,borderWidth:1,borderColor:Colors.border,backgroundColor:Colors.surface},noticeText:{flex:1,color:Colors.textMuted,fontSize:Typography.caption,lineHeight:18},primaryButton:{minHeight:48,alignItems:'center',justifyContent:'center',paddingHorizontal:16,marginTop:14,borderRadius:BorderRadius.md,backgroundColor:Colors.primary},disabled:{opacity:.55},primaryText:{color:Colors.textOnPrimary,fontSize:Typography.footnote,fontWeight:Typography.bold},ownerActions:{flexDirection:'row',gap:10,marginTop:20},secondaryButton:{flex:1,minHeight:44,alignItems:'center',justifyContent:'center',borderRadius:BorderRadius.md,borderWidth:1,borderColor:Colors.border},secondaryButtonText:{color:Colors.textPrimary,fontSize:Typography.footnote,fontWeight:Typography.semiBold},deleteButton:{minWidth:100,minHeight:44,alignItems:'center',justifyContent:'center',paddingHorizontal:14,borderRadius:BorderRadius.md,backgroundColor:Colors.errorSubtle},deleteText:{color:Colors.error,fontSize:Typography.footnote,fontWeight:Typography.bold},scrim:{flex:1,justifyContent:'center',padding:24,backgroundColor:'rgba(0,0,0,.65)'},confirm:{padding:20,backgroundColor:Colors.surface,borderRadius:18,borderWidth:1,borderColor:Colors.border},confirmTitle:{color:Colors.textPrimary,fontSize:Typography.title3,fontWeight:Typography.bold,marginBottom:8}});
