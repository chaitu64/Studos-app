import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { authService } from '../services/authService';

export default function AuthCallbackRoute() {
  const { code, error_description, error } = useLocalSearchParams<{ code?: string; error_description?: string; error?: string }>();
  const [message, setMessage] = useState('Completing sign-in…');

  useEffect(() => {
    let active = true;
    const finishSignIn = async () => {
      if (error || error_description) {
        setMessage(error_description || error || 'Sign-in failed.');
        return;
      }
      if (!code || Array.isArray(code)) {
        setMessage('Sign-in did not return an authorization code.');
        return;
      }
      try {
        const result = await completeWithTimeout(authService.completeOAuthSignIn(code), 20000);
        const { error: exchangeError } = result;
        if (exchangeError) throw exchangeError;
        if (active) router.replace('/(tabs)');
      } catch (cause) {
        if (active) setMessage(cause instanceof Error ? cause.message : 'Sign-in failed.');
      }
    };
    void finishSignIn();
    return () => { active = false; };
  }, [code, error, error_description]);

  const failed = message !== 'Completing sign-in…';
  return <View style={styles.container}>{failed ? null : <ActivityIndicator color="#FF3B30" />}<Text accessibilityRole={failed ? 'alert' : undefined} style={[styles.text, failed && styles.error]}>{message}</Text>{failed ? <Link href="/login" style={styles.link}>Back to login</Link> : null}</View>;
}

async function completeWithTimeout<T>(operation: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('Google sign-in timed out. Check your connection and try again.')), timeoutMs); }),
    ]);
  } finally { clearTimeout(timer!); }
}

const styles = StyleSheet.create({ container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12, backgroundColor: '#090B0F' }, text: { color: '#A5ACBA', fontSize: 14, textAlign: 'center' }, error: { color: '#FF8C86' }, link: { color: '#FF7770', fontWeight: '700', paddingVertical: 8 } });
