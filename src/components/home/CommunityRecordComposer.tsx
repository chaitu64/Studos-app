import React, { useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, BorderRadius, Spacing, Typography } from '../../constants/theme';
import type { StudentHelpRequest, StudentProblem } from '../../services/studentCommunityService';

export type CommunityDraft = { title: string; description: string; category: string; tags: string[]; skillsNeeded: string[]; helpType: string };
type Props = { visible: boolean; kind: 'problem' | 'help'; initial?: StudentProblem | StudentHelpRequest; onClose: () => void; onSubmit: (draft: CommunityDraft) => Promise<void> };

export function CommunityRecordComposer({ visible, kind, initial, onClose, onSubmit }: Props) {
  const help = kind === 'help';
  const [title, setTitle] = useState(initial?.title || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [category, setCategory] = useState(initial?.category || '');
  const [tags, setTags] = useState('tags' in (initial || {}) ? ((initial as StudentProblem | undefined)?.tags || []).join(', ') : '');
  const [skills, setSkills] = useState('skillsNeeded' in (initial || {}) ? ((initial as StudentHelpRequest | undefined)?.skillsNeeded || []).join(', ') : '');
  const [helpType, setHelpType] = useState('helpType' in (initial || {}) ? (initial as StudentHelpRequest | undefined)?.helpType || '' : '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => {
      setTitle(initial?.title || ''); setDescription(initial?.description || ''); setCategory(initial?.category || '');
      setTags('tags' in (initial || {}) ? ((initial as StudentProblem | undefined)?.tags || []).join(', ') : '');
      setSkills('skillsNeeded' in (initial || {}) ? ((initial as StudentHelpRequest | undefined)?.skillsNeeded || []).join(', ') : '');
      setHelpType('helpType' in (initial || {}) ? (initial as StudentHelpRequest | undefined)?.helpType || '' : '');
      setError('');
    }, 0);
    return () => clearTimeout(timer);
  }, [visible, initial]);

  const submit = async () => {
    if (saving) return;
    setError(''); setSaving(true);
    try {
      await onSubmit({ title, description, category, tags: tags.split(',').map((item) => item.trim()).filter(Boolean), skillsNeeded: skills.split(',').map((item) => item.trim()).filter(Boolean), helpType });
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Your request could not be saved.'); }
    finally { setSaving(false); }
  };

  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={styles.scrim}><SafeAreaView style={styles.safe} edges={['bottom']}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.sheet}>
      <View style={styles.handle}/><View style={styles.heading}><View style={styles.headingCopy}><Text style={styles.title}>{initial ? 'Edit problem' : help ? 'Ask for help' : 'Post a problem'}</Text><Text style={styles.subtitle}>{help ? 'Describe what you are building and the specific support you need.' : 'Explain the real problem and the context that would help others understand it.'}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Close form" onPress={onClose} style={styles.close}><Ionicons name="close" size={21} color={Colors.textMuted}/></Pressable></View>
      <Text style={styles.label}>{help ? 'What do you need help with?' : 'Title'}</Text><TextInput value={title} onChangeText={setTitle} placeholder={help ? 'e.g. Help optimize an image model for mobile' : 'e.g. Improve campus transportation updates'} placeholderTextColor={Colors.textSubtle} style={styles.input}/>
      <Text style={styles.label}>{help ? 'Describe your work and the specific problem' : 'Description'}</Text><TextInput value={description} onChangeText={setDescription} multiline textAlignVertical="top" placeholder={help ? 'Share relevant context, what you have tried, and what support would help.' : 'Keep the details and context that matter to solving this problem.'} placeholderTextColor={Colors.textSubtle} style={[styles.input, styles.multiline]}/>
      <Text style={styles.label}>Category</Text><TextInput value={category} onChangeText={setCategory} placeholder="e.g. Campus, Technology, Learning" placeholderTextColor={Colors.textSubtle} style={styles.input}/>
      {help ? <><Text style={styles.label}>Skills needed</Text><TextInput value={skills} onChangeText={setSkills} placeholder="Separate skills with commas" placeholderTextColor={Colors.textSubtle} style={styles.input}/><Text style={styles.label}>Type of help</Text><TextInput value={helpType} onChangeText={setHelpType} placeholder="e.g. Technical mentorship" placeholderTextColor={Colors.textSubtle} style={styles.input}/></> : <><Text style={styles.label}>Tags</Text><TextInput value={tags} onChangeText={setTags} placeholder="Separate tags with commas" placeholderTextColor={Colors.textSubtle} style={styles.input}/></>}
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      <Text style={styles.note}>Your post is attached to your signed-in STUDOS account.</Text>
      <Pressable accessibilityRole="button" onPress={() => void submit()} disabled={saving || !title.trim() || !description.trim() || !category.trim() || (help && !helpType.trim())} style={[styles.submit, (saving || !title.trim() || !description.trim() || !category.trim() || (help && !helpType.trim())) && styles.disabled]}>{saving ? <ActivityIndicator color={Colors.textOnPrimary}/> : <Text style={styles.submitText}>{initial ? 'Save changes' : help ? 'Post help request' : 'Publish problem'}</Text>}</Pressable>
      {Platform.OS === 'web' ? <View style={{ height: 6 }}/> : null}
    </ScrollView></SafeAreaView></View>
  </Modal>;
}

const styles = StyleSheet.create({
  scrim: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,.62)' }, safe: { maxHeight: '94%', backgroundColor: Colors.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, overflow: 'hidden' }, sheet: { padding: Spacing.screenPadding, paddingTop: 11, paddingBottom: 20 }, handle: { width: 38, height: 4, borderRadius: 2, backgroundColor: Colors.textSubtle, alignSelf: 'center', marginBottom: 16 }, heading: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 16 }, headingCopy: { flex: 1 }, title: { color: Colors.textPrimary, fontSize: Typography.title3, fontWeight: Typography.bold }, subtitle: { color: Colors.textMuted, fontSize: Typography.footnote, lineHeight: 19, marginTop: 5 }, close: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }, label: { color: Colors.textSecondary, fontSize: Typography.caption, fontWeight: Typography.semiBold, marginTop: 12, marginBottom: 6 }, input: { minHeight: 46, paddingHorizontal: 12, paddingVertical: 10, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.background, color: Colors.textPrimary, fontSize: Typography.footnote, outlineStyle: 'none' as any }, multiline: { minHeight: 125, maxHeight: 240, lineHeight: 20 }, note: { color: Colors.textMuted, fontSize: Typography.caption, marginTop: 13 }, error: { color: Colors.error, fontSize: Typography.footnote, lineHeight: 19, marginTop: 10 }, submit: { minHeight: 48, marginTop: 13, alignItems: 'center', justifyContent: 'center', borderRadius: BorderRadius.md, backgroundColor: Colors.primary }, disabled: { opacity: 0.5 }, submitText: { color: Colors.textOnPrimary, fontSize: Typography.footnote, fontWeight: Typography.bold },
});
