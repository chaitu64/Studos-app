import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Link, router } from 'expo-router';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { authService, SignupInput } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';

type Mode = 'login' | 'signup' | 'forgot' | 'reset';
export default function AuthScreen({ mode }: { mode: Mode }) {
  const [fields, setFields] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [needsVerification, setNeedsVerification] = useState(false);
  const { configurationError } = useAuth();
  const set = (key: string, value: string) => setFields((current) => ({ ...current, [key]: value }));
  const signInWithGoogle = async () => {
    setError('');
    setBusy(true);
    try {
      const redirectTo = Platform.OS === 'web' ? undefined : Linking.createURL('auth-callback');
      if (__DEV__ && redirectTo) console.info('[auth] Google redirect URL:', redirectTo);
      const { data, error: authError } = await authService.signInWithGoogle(redirectTo ?? '', Platform.OS !== 'web');
      if (authError) throw authError;
      if (Platform.OS === 'web') return;
      if (!data.url || !redirectTo) throw new Error('Could not start Google sign-in. Check your Supabase Google provider settings.');

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type !== 'success') return;
      const callback = new URL(result.url);
      const callbackError = callback.searchParams.get('error_description') || callback.searchParams.get('error');
      if (callbackError) throw new Error(callbackError);
      const code = callback.searchParams.get('code');
      if (!code) throw new Error('Google sign-in did not return an authorization code.');
      router.replace({ pathname: '/auth-callback', params: { code } });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Google sign-in failed. Try again.');
    } finally {
      setBusy(false);
    }
  };
  const submit = async () => {
    setError('');
    setNotice('');
    if (mode !== 'reset' && !fields.email?.trim() || (mode !== 'forgot' && !fields.password)) return setError('Enter your email and password.');
    if (mode === 'signup' && (!fields.first_name?.trim() || !fields.last_name?.trim())) return setError('Enter your first and last name.');
    if (mode === 'signup' && fields.study_year && (!/^\d+$/.test(fields.study_year) || Number(fields.study_year) < 1 || Number(fields.study_year) > 8)) return setError('Study year must be a number from 1 to 8.');
    if (mode === 'signup' && fields.graduation_year && (!/^\d{4}$/.test(fields.graduation_year) || Number(fields.graduation_year) < 2000 || Number(fields.graduation_year) > 2200)) return setError('Enter a valid four-digit graduation year.');
    if (mode !== 'forgot' && (fields.password?.length ?? 0) < 8) return setError('Use a password with at least 8 characters.');
    setBusy(true);
    try {
      if (mode === 'login') {
        const { error: authError } = await authService.signIn(fields.email, fields.password);
        if (authError) { if ('code' in authError && authError.code === 'email_not_confirmed') setNeedsVerification(true); throw authError; }
      } else if (mode === 'signup') {
        const payload: SignupInput = { first_name: fields.first_name.trim(), middle_name: fields.middle_name?.trim(), last_name: fields.last_name.trim(), email: fields.email, password: fields.password, college: fields.college?.trim(), degree: fields.degree?.trim(), branch: fields.branch?.trim(), study_year: fields.study_year ? Number(fields.study_year) : undefined, graduation_year: fields.graduation_year ? Number(fields.graduation_year) : undefined };
        const { data, error: authError } = await authService.signUp(payload);
        if (authError) throw authError;
        if (!data.session) setNotice('We sent a verification link. Confirm your email, then sign in.');
        else router.replace('/(tabs)');
      } else if (mode === 'forgot') {
        const { error: authError } = await authService.resetPassword(fields.email);
        if (authError) throw authError;
        setNotice('If an account uses that email, a password reset link is on its way.');
      } else {
        const { error: authError } = await authService.updatePassword(fields.password);
        if (authError) throw authError;
        setNotice('Your password has been updated.');
        router.replace('/(tabs)');
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Authentication failed. Try again.'); }
    finally { setBusy(false); }
  };
  const input = (key: string, placeholder: string, secure = false, keyboardType?: 'email-address' | 'numeric') => <TextInput accessibilityLabel={placeholder} autoCapitalize={keyboardType === 'email-address' || secure ? 'none' : 'sentences'} keyboardType={keyboardType ?? 'default'} secureTextEntry={secure} placeholder={placeholder} placeholderTextColor={Colors.textSubtle} value={fields[key] ?? ''} onChangeText={(value) => set(key, value)} style={styles.input} />;
  const title = mode === 'login' ? 'Welcome back' : mode === 'signup' ? 'Join StuDos' : mode === 'reset' ? 'Choose a new password' : 'Reset your password';
  return <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"><View style={styles.brand}><Text style={styles.logo}>STUDOS</Text><Text style={styles.title}>{title}</Text><Text style={styles.subtitle}>Your student innovation community.</Text></View>
    {configurationError ? <Text style={styles.error}>{configurationError}</Text> : null}
    {mode === 'login' || mode === 'signup' ? <><TouchableOpacity accessibilityRole="button" accessibilityLabel="Continue with Google" disabled={busy || Boolean(configurationError)} onPress={signInWithGoogle} style={[styles.googleButton, (busy || Boolean(configurationError)) && { opacity: .55 }]}><Text style={styles.googleMark}>G</Text><Text style={styles.googleText}>{busy ? 'Connecting…' : 'Continue with Google'}</Text></TouchableOpacity><View style={styles.divider}><View style={styles.dividerLine} /><Text style={styles.dividerText}>or continue with email</Text><View style={styles.dividerLine} /></View></> : null}
    {mode === 'signup' ? <><Text style={styles.formSection}>YOUR NAME</Text>{input('first_name', 'First name')}{input('middle_name', 'Middle name (optional)')}{input('last_name', 'Last name')}<Text style={styles.formSection}>YOUR STUDIES</Text>{input('college', 'College')}{input('degree', 'Degree / program')}{input('branch', 'Branch')}{input('study_year', 'Study year', false, 'numeric')}{input('graduation_year', 'Graduation year', false, 'numeric')}</> : null}
    {mode !== 'reset' ? input('email', 'Email address', false, 'email-address') : null}{mode !== 'forgot' ? input('password', mode === 'reset' ? 'New password (8+ characters)' : 'Password (8+ characters)', true) : null}
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    {notice ? <Text accessibilityRole="alert" style={styles.success}>{notice}</Text> : null}
    {needsVerification ? <TouchableOpacity accessibilityRole="button" onPress={async () => { try { const { error: resendError } = await authService.resendVerification(fields.email); if (resendError) throw resendError; setNotice('Verification email sent. Check your inbox and spam folder.'); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not resend verification.'); } }}><Text style={styles.link}>Resend verification email</Text></TouchableOpacity> : null}
    <TouchableOpacity disabled={busy || Boolean(configurationError)} onPress={submit} accessibilityRole="button" style={[styles.primary, (busy || Boolean(configurationError)) && { opacity: .55 }]}>{busy ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryText}>{mode === 'login' ? 'Log in' : mode === 'signup' ? 'Create account' : mode === 'reset' ? 'Update password' : 'Send reset link'}</Text>}</TouchableOpacity>
    {mode === 'login' ? <Link href="/forgot-password" style={styles.link}>Forgot password?</Link> : null}
    {mode !== 'reset' && mode !== 'forgot' ? <View style={styles.footer}><Text style={styles.subtitle}>{mode === 'login' ? 'New to StuDos? ' : 'Already have an account? '}</Text><Link href={mode === 'login' ? '/signup' : '/login'} style={styles.link}>{mode === 'login' ? 'Create account' : 'Log in'}</Link></View> : null}
  </ScrollView></KeyboardAvoidingView>;
}
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: Colors.background }, content: { flexGrow: 1, justifyContent: 'center', padding: Spacing.xxl, gap: 12 }, brand: { marginBottom: 18 }, logo: { color: Colors.primary, fontWeight: Typography.bold, letterSpacing: 3, fontSize: Typography.footnote, marginBottom: 20 }, title: { color: Colors.textPrimary, fontSize: Typography.title1, fontWeight: Typography.bold }, subtitle: { color: Colors.textMuted, fontSize: Typography.subhead, lineHeight: 21 }, formSection: { color: Colors.textMuted, fontSize: Typography.caption, letterSpacing: 0.8, fontWeight: Typography.bold, marginTop: 4 }, googleButton: { minHeight: 52, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: '#D9DEE7', backgroundColor: '#FFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 }, googleMark: { color: '#4285F4', fontWeight: Typography.bold, fontSize: Typography.title3 }, googleText: { color: '#202124', fontWeight: Typography.semiBold, fontSize: Typography.body }, divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 2 }, dividerLine: { height: 1, flex: 1, backgroundColor: Colors.border }, dividerText: { color: Colors.textSubtle, fontSize: Typography.caption }, input: { minHeight: 52, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface, color: Colors.textPrimary, paddingHorizontal: 15, fontSize: Typography.body }, primary: { minHeight: 52, borderRadius: BorderRadius.md, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 6 }, primaryText: { color: Colors.textOnPrimary, fontWeight: Typography.bold, fontSize: Typography.body }, link: { color: Colors.primary, fontWeight: Typography.bold, textAlign: 'center', paddingVertical: 8 }, footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 14 }, error: { color: Colors.error, fontSize: Typography.footnote, lineHeight: 19 }, success: { color: Colors.success, fontSize: Typography.footnote, lineHeight: 19, padding: 12, borderRadius: BorderRadius.md, backgroundColor: Colors.successSubtle } });
