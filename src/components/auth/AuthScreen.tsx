import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Link, router } from 'expo-router';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { authService, SignupInput } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';
import { Colors, Typography, Spacing } from '../../constants/theme';
import AcademicIdentityFields from '../academic/AcademicIdentityFields';
import SearchableMultiSelect from '../academic/SearchableMultiSelect';
import { interestSuggestions, normalizeSelections, skillSuggestions, validProfileUrl } from '../../data/profileOptions';

type Mode = 'login' | 'signup' | 'forgot' | 'reset';
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const signupSteps = ['Account', 'Academic Identity', 'Your Profile'];

export default function AuthScreen({ mode }: { mode: Mode }) {
  const [fields, setFields] = useState<Record<string, string>>({});
  const [step, setStep] = useState(1);
  const [passwordVisible, setPasswordVisible] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [branchNeedsReview, setBranchNeedsReview] = useState(false);
  const [studyYearNeedsReview, setStudyYearNeedsReview] = useState(false);
  const [notice, setNotice] = useState('');
  const [needsVerification, setNeedsVerification] = useState(false);
  const { configurationError, authError } = useAuth();
  const set = (key: string, value: string) => setFields((current) => ({ ...current, [key]: value }));
  const fieldValue = (key: string) => fields[key] ?? '';
  const setAcademicField = (key: 'college' | 'degree' | 'branch' | 'studyYear' | 'graduationYear', value: string) => {
    const fieldKey = key === 'studyYear' ? 'study_year' : key === 'graduationYear' ? 'graduation_year' : key;
    set(fieldKey, value);
  };

  const signInWithGoogle = async () => {
    setError(''); setNotice(''); setBusy(true);
    try {
      const redirectTo = Linking.createURL('auth-callback');
      const { data, error: authError } = await authService.signInWithGoogle(redirectTo, Platform.OS !== 'web');
      if (authError) throw authError;
      if (Platform.OS === 'web') return;
      if (!data.url) throw new Error('Google sign-in could not start. Check the Supabase Google provider settings.');
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type === 'cancel' || result.type === 'dismiss') return;
      if (result.type !== 'success') throw new Error('Google sign-in did not complete. Please try again.');
      const callback = new URL(result.url);
      const callbackError = callback.searchParams.get('error_description') || callback.searchParams.get('error');
      if (callbackError) throw new Error(callbackError);
      const code = callback.searchParams.get('code');
      if (!code) throw new Error('Google sign-in did not return an authorization code.');
      router.replace({ pathname: '/auth-callback', params: { code } });
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Google sign-in failed. Try again.'); }
    finally { setBusy(false); }
  };

  const validateStep = () => {
    if (step === 1) {
      if (!emailPattern.test((fields.email || '').trim())) return 'Enter a valid email address.';
      if ((fields.password || '').length < 8) return 'Use a password with at least 8 characters.';
      if (fields.password !== fields.confirmPassword) return 'Your passwords do not match.';
    } else if (step === 2) {
      if (!fields.college?.trim() || !fields.degree?.trim() || !fields.branch?.trim()) return 'Add your college, degree and branch to continue.';
      if (branchNeedsReview) return 'Review the saved branch for your selected degree. Choose a relevant option or re-enter it manually.';
      if (studyYearNeedsReview) return 'Choose a study year for the selected degree.';
      if (!/^[1-8]$/.test(fields.study_year || '')) return 'Study year must be from 1 to 8.';
      const gradYear = Number(fields.graduation_year);
      if (!/^\d{4}$/.test(fields.graduation_year || '') || gradYear < 2000 || gradYear > 2200) return 'Enter a valid graduation year.';
    } else {
      if (!fields.first_name?.trim() || !fields.last_name?.trim()) return 'Add your first and last name.';
      if (!validProfileUrl('github', fields.github_url || '')) return 'Enter a valid GitHub profile URL using https://github.com/username.';
      if (!validProfileUrl('linkedin', fields.linkedin_url || '')) return 'Enter a valid LinkedIn profile URL.';
      if (!validProfileUrl('portfolio', fields.portfolio_url || '')) return 'Enter a valid HTTPS portfolio URL.';
    }
    return '';
  };

  const submitSignup = async () => {
    const payload: SignupInput = {
      email: fieldValue('email').trim(), password: fieldValue('password'),
      first_name: fieldValue('first_name').trim(), middle_name: fieldValue('middle_name').trim(), last_name: fieldValue('last_name').trim(),
      college: fieldValue('college').trim(), degree: fieldValue('degree').trim(), branch: fieldValue('branch').trim(),
      study_year: Number(fieldValue('study_year')), graduation_year: Number(fieldValue('graduation_year')),
      bio: fieldValue('bio').trim(), phone_number: fieldValue('phone_number').trim(),
      skills: normalizeSelections(splitList(fieldValue('skills'))), interests: normalizeSelections(splitList(fieldValue('interests'))),
      github_url: fieldValue('github_url').trim(), linkedin_url: fieldValue('linkedin_url').trim(), portfolio_url: fieldValue('portfolio_url').trim(),
    };
    setBusy(true); setError(''); setNotice('');
    try {
      const { data, error: authError } = await authService.signUp(payload, Linking.createURL('auth-callback'));
      if (authError) throw authError;
      if (!data.session) setNotice('Your account is ready. Check your email to confirm it, then sign in to finish your profile.');
      else router.replace('/onboarding');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Account creation failed. Please try again.'); }
    finally { setBusy(false); }
  };

  const submit = async () => {
    setError(''); setNotice('');
    if (mode === 'signup') {
      const validation = validateStep();
      if (validation) { setError(validation); return; }
      if (step < 3) { setStep((current) => current + 1); return; }
      await submitSignup(); return;
    }
    if (mode !== 'reset' && !emailPattern.test((fields.email || '').trim())) return setError('Enter a valid email address.');
    if (mode !== 'forgot' && (fields.password || '').length < 8) return setError('Use a password with at least 8 characters.');
    setBusy(true);
    try {
      if (mode === 'login') {
        const { error: authError } = await authService.signIn(fields.email, fields.password);
        if (authError) { if ('code' in authError && authError.code === 'email_not_confirmed') setNeedsVerification(true); throw authError; }
      } else if (mode === 'forgot') {
        const { error: resetError } = await authService.resetPassword(fields.email, Linking.createURL('reset-password'));
        if (resetError) throw resetError;
        setNotice('If an account uses that email, a password reset link is on its way.');
      } else {
        const { error: authError } = await authService.updatePassword(fields.password);
        if (authError) throw authError;
        setNotice('Your password has been updated.'); router.replace('/(tabs)');
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Authentication failed. Try again.'); }
    finally { setBusy(false); }
  };

  const input = (key: string, label: string, options: { secure?: boolean; numeric?: boolean; email?: boolean; multiline?: boolean } = {}) => {
    const secure = Boolean(options.secure && !passwordVisible[key]);
    return <View style={styles.field} key={key}><Text style={styles.label}>{label}</Text><View style={styles.inputRow}><TextInput accessibilityLabel={label} autoCapitalize={options.email || options.secure ? 'none' : 'sentences'} autoCorrect={!options.email && !options.secure} keyboardType={options.email ? 'email-address' : options.numeric ? 'number-pad' : 'default'} secureTextEntry={secure} multiline={options.multiline} value={fields[key] ?? ''} onChangeText={(value) => set(key, value)} placeholder={label} placeholderTextColor={Colors.textSubtle} style={[styles.input, options.secure && styles.passwordInput, options.multiline && styles.multiline]} />{options.secure ? <TouchableOpacity accessibilityRole="button" accessibilityLabel={passwordVisible[key] ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`} onPress={() => setPasswordVisible((current) => ({ ...current, [key]: !current[key] }))} style={styles.passwordToggle}><Text style={styles.passwordToggleText}>{passwordVisible[key] ? 'Hide' : 'Show'}</Text></TouchableOpacity> : null}</View></View>;
  };
  const authMode = mode === 'login' || mode === 'signup';
  const title = mode === 'login' ? 'Welcome back' : mode === 'signup' ? 'Create your account' : mode === 'reset' ? 'Choose a new password' : 'Reset your password';

  return <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
    <View style={styles.brand}><Text style={styles.logo}>STUDOS</Text><Text style={styles.eyebrow}>LEARN · BUILD · CONNECT</Text><Text style={styles.title}>{title}</Text><Text style={styles.subtitle}>{mode === 'signup' ? 'Find your people. Build what matters.' : 'Your student community, ready when you are.'}</Text></View>
    {configurationError ? <Text accessibilityRole="alert" style={styles.error}>{configurationError}</Text> : null}{authError ? <Text accessibilityRole="alert" style={styles.error}>{authError}</Text> : null}
    {mode === 'signup' ? <View style={styles.progress} accessibilityLabel={`Step ${step} of 3 - ${signupSteps[step - 1]}`}><Text style={styles.stepCaption}>Step {step} of 3 - {signupSteps[step - 1]}</Text><View style={styles.progressTrack}>{signupSteps.map((label, index) => <View key={label} accessibilityLabel={label} style={[styles.progressSegment, index < step && styles.progressActive]}/>)}</View></View> : null}
    {authMode && (mode === 'login' || step === 1) ? <>
      <View style={styles.emailForm}>{input('email', 'Email address', { email: true })}{input('password', 'Password', { secure: true })}{mode === 'signup' ? input('confirmPassword', 'Confirm password', { secure: true }) : null}</View>
      {mode === 'signup' ? <View style={styles.actions}><TouchableOpacity disabled={busy || Boolean(configurationError)} onPress={() => void submit()} accessibilityRole="button" style={[styles.primary, (busy || Boolean(configurationError)) && styles.disabled]}>{busy ? <ActivityIndicator color="#FFF"/> : <Text style={styles.primaryText}>Create account</Text>}</TouchableOpacity></View> : null}
      {mode === 'signup' ? <View style={styles.divider}><View style={styles.dividerLine}/><Text style={styles.dividerText}>or continue with</Text><View style={styles.dividerLine}/></View> : null}
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Continue with Google" disabled={busy || Boolean(configurationError)} onPress={() => void signInWithGoogle()} style={styles.googleButton}><Text style={styles.googleMark}>G</Text><Text style={styles.googleText}>{busy ? 'Connecting to Google...' : 'Continue with Google'}</Text>{busy ? <ActivityIndicator size="small" color={Colors.primary}/> : null}</TouchableOpacity>
    </> : null}
    {mode === 'signup' && step === 2 ? <AcademicIdentityFields college={fieldValue('college')} degree={fieldValue('degree')} branch={fieldValue('branch')} studyYear={fieldValue('study_year')} graduationYear={fieldValue('graduation_year')} onChange={setAcademicField} onBranchReviewChange={setBranchNeedsReview} onStudyYearReviewChange={setStudyYearNeedsReview}/> : null}
    {mode === 'signup' && step === 3 ? <View style={styles.form}>{input('first_name', 'First name')}{input('middle_name', 'Middle name (optional)')}{input('last_name', 'Last name')}{input('phone_number', 'Phone number (private, optional)', { numeric: true })}{input('bio', 'A little about you (optional)', { multiline: true })}<SearchableMultiSelect label="Skills" values={splitList(fieldValue('skills'))} suggestions={skillSuggestions} onChange={(values) => set('skills', values.join(', '))}/><SearchableMultiSelect label="Interests" values={splitList(fieldValue('interests'))} suggestions={interestSuggestions} onChange={(values) => set('interests', values.join(', '))}/>{input('github_url', 'GitHub URL (optional)')}{input('linkedin_url', 'LinkedIn URL (optional)')}{input('portfolio_url', 'Portfolio URL (optional)')}</View> : null}
    {mode !== 'login' && mode !== 'signup' ? <View style={styles.form}>{mode !== 'reset' ? input('email', 'Email address', { email: true }) : null}{mode !== 'forgot' ? input('password', 'New password (8+ characters)', { secure: true }) : null}</View> : null}
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}{notice ? <Text accessibilityRole="alert" style={styles.success}>{notice}</Text> : null}
    {needsVerification ? <TouchableOpacity accessibilityRole="button" onPress={async () => { try { const { error: resendError } = await authService.resendVerification(fields.email); if (resendError) throw resendError; setNotice('Verification email sent. Check your inbox and spam folder.'); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not resend verification.'); } }}><Text style={styles.link}>Resend verification email</Text></TouchableOpacity> : null}
    {mode !== 'signup' || step > 1 ? <View style={styles.actions}>{mode === 'signup' && step > 1 ? <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={() => { setError(''); setStep((current) => current - 1); }} style={styles.back}><Text style={styles.backText}>Back</Text></TouchableOpacity> : null}<TouchableOpacity disabled={busy || Boolean(configurationError)} onPress={() => void submit()} accessibilityRole="button" style={[styles.primary, (busy || Boolean(configurationError)) && styles.disabled]}>{busy ? <ActivityIndicator color="#FFF"/> : <Text style={styles.primaryText}>{mode === 'signup' ? step === 3 ? 'Create account' : 'Continue' : mode === 'login' ? 'Log in' : mode === 'reset' ? 'Update password' : 'Send reset link'}</Text>}</TouchableOpacity></View> : null}
    {mode === 'login' ? <Link href="/forgot-password" style={styles.link}>Forgot password?</Link> : null}
    {mode !== 'reset' && mode !== 'forgot' ? <View style={styles.footer}><Text style={styles.subtitle}>{mode === 'login' ? 'New to StuDos? ' : 'Already have an account? '}</Text><Link href={mode === 'login' ? '/signup' : '/login'} style={mode === 'signup' ? styles.signupLoginLink : styles.link}>{mode === 'login' ? 'Create account' : 'Log in'}</Link></View> : null}
  </ScrollView></KeyboardAvoidingView>;
}

function splitList(value?: string) { return [...new Set((value || '').split(',').map((item) => item.trim()).filter(Boolean))]; }

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background }, content: { flexGrow: 1, width: '100%', maxWidth: 480, alignSelf: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl, paddingVertical: 24, gap: 12 },
  brand: { marginBottom: 2 }, logo: { color: Colors.textPrimary, fontWeight: Typography.bold, letterSpacing: 3, fontSize: 13, marginBottom: 12 }, eyebrow: { color: Colors.textMuted, fontSize: 10, letterSpacing: 1.6, marginTop: 8, marginBottom: 8 }, title: { color: Colors.textPrimary, fontSize: 28, lineHeight: 34, fontWeight: Typography.bold }, subtitle: { color: Colors.textMuted, fontSize: 14, lineHeight: 21, marginTop: 4 },
  progress: { gap: 8, marginVertical: 2 }, stepCaption: { color: Colors.textSecondary, fontSize: 12, fontWeight: Typography.semiBold }, progressTrack: { flexDirection: 'row', gap: 6 }, progressSegment: { height: 3, flex: 1, borderRadius: 2, backgroundColor: Colors.surfaceHighlight }, progressActive: { backgroundColor: Colors.primary },
  googleButton: { minHeight: 52, borderRadius: 11, borderWidth: 1, borderColor: Colors.borderLight, backgroundColor: Colors.background, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 }, googleMark: { color: '#4285F4', fontWeight: Typography.bold, fontSize: 19 }, googleText: { color: Colors.textPrimary, fontWeight: Typography.semiBold, fontSize: 14 }, emailForm: { gap: 10 }, divider: { flexDirection: 'row', alignItems: 'center', gap: 10 }, dividerLine: { height: 1, flex: 1, backgroundColor: Colors.border }, dividerText: { color: Colors.textSubtle, fontSize: 11 },
  form: { gap: 2 }, field: { gap: 5 }, label: { color: Colors.textSecondary, fontSize: 12, fontWeight: Typography.semiBold }, inputRow: { position: 'relative', justifyContent: 'center' }, input: { minHeight: 52, borderRadius: 11, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface, color: Colors.textPrimary, paddingHorizontal: 13, fontSize: 14 }, passwordInput: { paddingRight: 62 }, passwordToggle: { position: 'absolute', right: 4, height: 44, minWidth: 52, alignItems: 'center', justifyContent: 'center' }, passwordToggleText: { color: Colors.textMuted, fontSize: 12, fontWeight: Typography.semiBold }, multiline: { minHeight: 86, paddingTop: 12, textAlignVertical: 'top' }, helper: { color: Colors.textMuted, fontSize: 11, marginTop: 5 }, actions: { flexDirection: 'row', gap: 10, marginTop: 1 }, back: { minHeight: 52, paddingHorizontal: 22, borderRadius: 11, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' }, backText: { color: Colors.textSecondary, fontWeight: Typography.semiBold }, primary: { flex: 1, minHeight: 52, borderRadius: 11, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' }, disabled: { opacity: 0.55 }, primaryText: { color: '#FFF', fontWeight: Typography.bold, fontSize: 14 }, link: { color: Colors.primary, fontWeight: Typography.bold, textAlign: 'center', paddingVertical: 8 }, signupLoginLink: { color: Colors.textPrimary, fontWeight: Typography.bold, textAlign: 'center', paddingVertical: 8 }, footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 0 }, error: { color: Colors.error, fontSize: 12, lineHeight: 18 }, success: { color: Colors.success, fontSize: 12, lineHeight: 18, padding: 12, borderRadius: 11, backgroundColor: Colors.successSubtle },
});
