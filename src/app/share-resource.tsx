import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { safeBack } from '@/navigation/safeBack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createStudyResource, fetchResource, ResourceInput, updateStudyResource } from '../services/resourceApi';
import { StudyResource, StudyResourceType } from '../types';

const categoryOptions: { value: StudyResourceType; label: string }[] = [
  { value: 'notes', label: 'Notes' }, { value: 'previous_paper', label: 'Past paper' },
  { value: 'important_questions', label: 'Important questions' }, { value: 'lab_manual', label: 'Lab manual' }, { value: 'study_guide', label: 'Study guide' },
];
const fields: { key: keyof ResourceInput; label: string; required?: boolean; multiline?: boolean }[] = [
  { key: 'title', label: 'PDF title', required: true }, { key: 'college', label: 'College' }, { key: 'university', label: 'University' },
  { key: 'degree', label: 'Degree / program' }, { key: 'branch', label: 'Branch' }, { key: 'study_year', label: 'Study year' },
  { key: 'semester', label: 'Semester' }, { key: 'subject', label: 'Subject', required: true }, { key: 'subject_code', label: 'Subject code' },
  { key: 'academic_year', label: 'Academic year', required: true }, { key: 'regulation', label: 'Regulation / syllabus version' },
  { key: 'unit_module', label: 'Unit / module' }, { key: 'description', label: 'Description', multiline: true }, { key: 'language', label: 'Language' },
  { key: 'drive_url', label: 'Google Drive shareable URL', required: true },
];
export default function ShareResourceScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [category, setCategory] = useState<StudyResourceType>('notes');
  const [values, setValues] = useState<Record<string, string>>({ language: 'English' });
  const [rights, setRights] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [loading, setLoading] = useState(Boolean(id));
  useEffect(() => { if (!id) return; let active = true; void fetchResource(id).then((resource: StudyResource) => { if (!active) return; setCategory(resource.type); setValues({ title: resource.title, college: resource.college || '', university: resource.university || '', degree: resource.degree || '', branch: resource.branch || '', study_year: resource.studyYear || '', semester: resource.semester || '', subject: resource.subject, subject_code: resource.subjectCode || '', academic_year: resource.academicYear, regulation: resource.regulation || '', unit_module: resource.unitModule || '', description: resource.description || '', language: resource.language || '', drive_url: resource.pdfUrl || '' }); setRights(true); }).catch((cause) => setError(cause instanceof Error ? cause.message : 'Could not load resource for editing.')).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [id]);
  const submit = async () => {
    if (!values.title?.trim() || !values.subject?.trim() || !values.academic_year?.trim() || !values.drive_url?.trim()) { setError('Complete the title, subject, academic year, and Drive URL.'); return; }
    if (!rights) { setError('Confirm you have permission to share this material.'); return; }
    setError(''); setBusy(true);
    try { const input = { ...values, title: values.title.trim(), subject: values.subject.trim(), academic_year: values.academic_year.trim(), category, drive_url: values.drive_url.trim(), rights_confirmed: rights }; if (id) await updateStudyResource(id, input); else await createStudyResource(input); Alert.alert(id ? 'Resource updated' : 'Resource shared', id ? 'Your Study Hub details have been updated.' : 'Your Drive link and study details are now in Study Hub.', [{ text: 'Done', onPress: () => safeBack() }]); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not share this resource.'); }
    finally { setBusy(false); }
  };
  if (loading) return <SafeAreaView style={styles.safe}><ActivityIndicator color="#FF3B30" style={{ flex: 1 }}/></SafeAreaView>;
  return <SafeAreaView style={styles.safe} edges={['bottom']}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <Text style={styles.intro}>Share metadata and a Drive link. STUDOS never uploads or downloads your PDF.</Text>
    <Text style={styles.label}>Resource category</Text><View style={styles.categories}>{categoryOptions.map((item) => <TouchableOpacity key={item.value} onPress={() => setCategory(item.value)} style={[styles.chip, category === item.value && styles.selected]}><Text style={[styles.chipText, category === item.value && styles.selectedText]}>{item.label}</Text></TouchableOpacity>)}</View>
    {fields.map((field) => <View key={field.key}><Text style={styles.label}>{field.label}{field.required ? ' *' : ' (optional)'}</Text><TextInput value={values[field.key as string] ?? ''} onChangeText={(text) => setValues((v) => ({ ...v, [field.key]: text }))} placeholder={field.label} placeholderTextColor="#777F90" autoCapitalize={field.key === 'drive_url' ? 'none' : 'sentences'} keyboardType={field.key === 'drive_url' ? 'url' : 'default'} multiline={field.multiline} style={[styles.input, field.multiline && styles.multiline]} /></View>)}
    <View style={styles.rights}><Switch value={rights} onValueChange={setRights} trackColor={{ true: '#FF3B30' }} accessibilityLabel="Confirm sharing rights"/><Text style={styles.rightsText}>I have the right to share this material and will respect its attribution and distribution terms.</Text></View>
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    <TouchableOpacity disabled={busy} style={[styles.submit, busy && { opacity: .6 }]} onPress={submit}>{busy ? <ActivityIndicator color="#FFF"/> : <Text style={styles.submitText}>{id ? 'Save resource changes' : 'Share to Study Hub'}</Text>}</TouchableOpacity>
  </ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: '#090B0F' }, content: { padding: 20, gap: 8, paddingBottom: 40 }, intro: { color: '#A5ACBA', fontSize: 13, lineHeight: 19, marginBottom: 12 }, label: { color: '#E9ECF3', fontSize: 13, fontWeight: '700', marginTop: 9, marginBottom: 5 }, categories: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, chip: { borderRadius: 20, borderWidth: 1, borderColor: '#303749', paddingVertical: 9, paddingHorizontal: 12, backgroundColor: '#121624' }, selected: { backgroundColor: '#FF3B30', borderColor: '#FF3B30' }, chipText: { color: '#A5ACBA', fontSize: 12, fontWeight: '600' }, selectedText: { color: '#FFF' }, input: { minHeight: 48, borderRadius: 10, borderWidth: 1, borderColor: '#252C3D', backgroundColor: '#121624', color: '#FFF', paddingHorizontal: 12, paddingVertical: 11, fontSize: 14 }, multiline: { minHeight: 90, textAlignVertical: 'top' }, rights: { flexDirection: 'row', gap: 10, alignItems: 'center', marginVertical: 12 }, rightsText: { flex: 1, color: '#A5ACBA', fontSize: 12, lineHeight: 18 }, submit: { minHeight: 52, borderRadius: 12, backgroundColor: '#FF3B30', justifyContent: 'center', alignItems: 'center', marginTop: 5 }, submitText: { color: '#FFF', fontWeight: '800', fontSize: 15 }, error: { color: '#FF8C86', fontSize: 13, lineHeight: 19 } });
