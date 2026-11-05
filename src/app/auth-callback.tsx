import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { authService } from '../services/authService';

export default function AuthCallbackRoute() {
  const { code, error_description, error } = useLocalSearchParams<{ code?: string; error_description?: string; error?: string }>();
  const [message, setMessage] = useState('Completing Google sign-in…');

  useEffect(() => {
    let active = true;
    const finishSignIn = async () => {
      if (error || error_description) {
        setMessage(error_description || error || 'Google sign-in failed.');
        return;
      }
      if (!code || Array.isArray(code)) {
        setMessage('Google sign-in did not return an authorization code.');
        return;
      }
      try {
        const { error: exchangeError } = await authService.completeOAuthSignIn(code);
        if (exchangeError) throw exchangeError;
        if (active) router.replace('/(tabs)');
      } catch (cause) {
        if (active) setMessage(cause instanceof Error ? cause.message : 'Google sign-in failed.');
      }
    };
    void finishSignIn();
    return () => { active = false; };
  }, [code, error, error_description]);

  const failed = message !== 'Completing Google sign-in…';
  return <View style={styles.container}>{failed ? null : <ActivityIndicator color="#FF3B30" />}<Text accessibilityRole={failed ? 'alert' : undefined} style={[styles.text, failed && styles.error]}>{message}</Text>{failed ? <Link href="/login" style={styles.link}>Back to login</Link> : null}</View>;
}

const styles = StyleSheet.create({ container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12, backgroundColor: '#090B0F' }, text: { color: '#A5ACBA', fontSize: 14, textAlign: 'center' }, error: { color: '#FF8C86' }, link: { color: '#FF7770', fontWeight: '700', paddingVertical: 8 } });
