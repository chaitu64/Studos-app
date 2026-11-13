import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme';

type Fields = { first: string; middle: string; last: string; college: string; degree: string; branch: string; year: string; gradYear: string; phone: string; avatar: string; bio: string; skills: string; interests: string; github: string; linkedin: string; portfolio: string };
const validWebUrl = (value: string) => !value.trim() || /^https:\/\//i.test(value.trim());
const normalizeList = (value: string) => [...new Set(value.split(',').map((item) => item.trim()).filter(Boolean))];
const fieldsFromUser = (user: ReturnType<typeof useApp>['user']): Fields => {
  const nameParts = user.name === 'Not provided' ? [] : user.name.trim().split(/\s+/);
  return {
    first: user.givenName || nameParts[0] || '', middle: user.middleName || (nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : ''),
    last: user.familyName || nameParts.slice(1).join(' '), college: user.college || '', degree: user.degree || '', branch: user.branch || '',
    year: user.studyYear || '', gradYear: user.gradYear || '', phone: user.phoneNumber || '', avatar: user.avatar || '', bio: user.shortBio || '',
    skills: user.skills.join(', '), interests: user.interests.join(', '), github: user.githubUrl || '', linkedin: user.linkedinUrl || '', portfolio: user.portfolioUrl || '',
  };
};

export default function OnboardingRoute() {
  const { session } = useAuth();
  const { user, updateProfile } = useApp();
  const params = useLocalSearchParams<{ edit?: string }>();
  const editing = params.edit === '1';
  const [fields, setFields] = useState<Fields>(() => fieldsFromUser(user));
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const set = (key: keyof Fields, value: string) => setFields((current) => ({ ...current, [key]: value }));
  const validate = () => {
    if (step === 1) {
      if (!fields.college.trim() || !fields.degree.trim() || !fields.branch.trim()) return 'Add your college, degree and branch.';
      if (!/^[1-8]$/.test(fields.year)) return 'Study year must be from 1 to 8.';
      const year = Number(fields.gradYear);
      if (!/^\d{4}$/.test(fields.gradYear) || year < 2000 || year > 2200) return 'Enter a valid graduation year.';
    } else if (step === 2) {
      if (!fields.first.trim() || !fields.last.trim()) return 'Add your first and last name.';
      if (fields.phone.trim() && !/^[+\d().\-\s]{7,20}$/.test(fields.phone.trim())) return 'Enter a valid phone number.';
    } else if ([fields.github, fields.linkedin, fields.portfolio, fields.avatar].some((value) => !validWebUrl(value))) return 'Profile links and avatar must use HTTPS.';
    return '';
  };

  const save = async () => {
    const validation = validate();
    if (validation) { setError(validation); return; }
    if (step < 3) { setError(''); setStep((current) => current + 1); return; }
    if (!session) { setError('Your session has expired. Sign in again to save your profile.'); return; }
    setBusy(true); setError('');
    try {
      await updateProfile({
        name: [fields.first.trim(), fields.middle.trim(), fields.last.trim()].filter(Boolean).join(' '),
        givenName: fields.first.trim(), middleName: fields.middle.trim(), familyName: fields.last.trim(),
        college: fields.college.trim(), degree: fields.degree.trim(), branch: fields.branch.trim(), studyYear: fields.year, gradYear: fields.gradYear,
        phoneNumber: fields.phone.trim(), avatar: fields.avatar.trim(), shortBio: fields.bio.trim(), skills: normalizeList(fields.skills), interests: normalizeList(fields.interests),
        githubUrl: fields.github.trim(), linkedinUrl: fields.linkedin.trim(), portfolioUrl: fields.portfolio.trim(),
      });
      if (editing) router.back(); else router.replace('/(tabs)');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save your profile. Please try again.'); }
    finally { setBusy(false); }
  };

  const input = (key: keyof Fields, label: string, numeric = false, multiline = false) => <View style={styles.field} key={key}><Text style={styles.label}>{label}</Text><TextInput accessibilityLabel={label} value={fields[key]} onChangeText={(value) => set(key, value)} placeholder={label} placeholderTextColor={Colors.textSubtle} keyboardType={numeric ? 'number-pad' : 'default'} autoCapitalize={numeric ? 'none' : 'sentences'} multiline={multiline} style={[styles.input, multiline && styles.multiline]} /></View>;
  const stepLabels = ['Academic identity', 'About you', 'Skills & links'];

  return <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <Text style={styles.logo}>STUDOS</Text><Text style={styles.eyebrow}>{editing ? 'PROFILE SETTINGS' : 'STUDENT ONBOARDING'}</Text><Text style={styles.title}>{editing ? 'Edit your profile' : 'Make your profile yours'}</Text><Text style={styles.subtitle}>You can update these details any time from your profile.</Text>
    <View style={styles.progress} accessibilityLabel={`Profile step ${step} of 3`}>{stepLabels.map((label, index) => <View style={styles.progressItem} key={label}><View style={[styles.progressDot, index + 1 <= step && styles.activeDot]}><Text style={styles.dotText}>{index + 1}</Text></View><Text style={[styles.progressLabel, index + 1 === step && styles.currentLabel]}>{label}</Text></View>)}</View>
    {step === 1 ? <View style={styles.form}>{input('college', 'College or university')}{input('degree', 'Degree or program')}{input('branch', 'Branch / major')}{input('year', 'Current study year (1–8)', true)}{input('gradYear', 'Expected graduation year', true)}<Text style={styles.helper}>Custom college names are welcome.</Text></View> : null}
    {step === 2 ? <View style={styles.form}>{input('first', 'First name')}{input('middle', 'Middle name (optional)')}{input('last', 'Last name')}{input('phone', 'Phone number (private, optional)', true)}{input('avatar', 'Profile image URL (optional)')}{input('bio', 'Short introduction (optional)', false, true)}<Text style={styles.helper}>Your phone number is stored in the owner-only private profile record.</Text></View> : null}
    {step === 3 ? <View style={styles.form}>{input('skills', 'Skills, separated by commas (optional)')}{input('interests', 'Interests, separated by commas (optional)')}{input('github', 'GitHub HTTPS link (optional)')}{input('linkedin', 'LinkedIn HTTPS link (optional)')}{input('portfolio', 'Portfolio HTTPS link (optional)')}</View> : null}
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    <View style={styles.actions}>{step > 1 ? <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={() => { setError(''); setStep((current) => current - 1); }} style={styles.back}><Text style={styles.backText}>Back</Text></TouchableOpacity> : null}<TouchableOpacity accessibilityRole="button" disabled={busy} onPress={() => void save()} style={[styles.primary, busy && { opacity: 0.6 }]}>{busy ? <ActivityIndicator color="#FFF"/> : <Text style={styles.primaryText}>{step === 3 ? editing ? 'Save changes' : 'Finish profile' : 'Continue'}</Text>}</TouchableOpacity></View>
  </ScrollView></KeyboardAvoidingView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background }, content: { flexGrow: 1, width: '100%', maxWidth: 600, alignSelf: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl, paddingVertical: 28, gap: 14 },
  logo: { color: Colors.primary, fontWeight: Typography.bold, letterSpacing: 3, fontSize: 13 }, eyebrow: { color: Colors.textMuted, fontSize: 10, letterSpacing: 1.5, marginTop: 9 }, title: { color: Colors.textPrimary, fontSize: 29, lineHeight: 36, fontWeight: Typography.bold }, subtitle: { color: Colors.textMuted, fontSize: 13, lineHeight: 20, marginTop: -8 },
  progress: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 8 }, progressItem: { alignItems: 'center', gap: 6 }, progressDot: { width: 27, height: 27, borderRadius: 14, backgroundColor: Colors.surfaceHighlight, alignItems: 'center', justifyContent: 'center' }, activeDot: { backgroundColor: Colors.primary }, dotText: { color: '#FFF', fontSize: 11, fontWeight: Typography.bold }, progressLabel: { color: Colors.textSubtle, fontSize: 9 }, currentLabel: { color: Colors.textPrimary },
  form: { gap: 12 }, field: { gap: 6 }, label: { color: Colors.textSecondary, fontSize: 12, fontWeight: Typography.semiBold }, input: { minHeight: 49, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface, color: Colors.textPrimary, paddingHorizontal: 14, fontSize: 14 }, multiline: { minHeight: 84, paddingTop: 12, textAlignVertical: 'top' }, helper: { color: Colors.textMuted, fontSize: 11, lineHeight: 17 }, actions: { flexDirection: 'row', gap: 10, marginTop: 4 }, back: { minHeight: 51, paddingHorizontal: 22, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border, justifyContent: 'center', alignItems: 'center' }, backText: { color: Colors.textSecondary, fontWeight: Typography.semiBold }, primary: { flex: 1, minHeight: 51, borderRadius: BorderRadius.md, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' }, primaryText: { color: '#FFF', fontWeight: Typography.bold, fontSize: 14 }, error: { color: Colors.error, fontSize: 12, lineHeight: 18 },
});
