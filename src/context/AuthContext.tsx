import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useRouter, useSegments } from 'expo-router';
import { ActivityIndicator, AppState, Linking, Platform, StyleSheet, Text, View } from 'react-native';
import { requireSupabase, supabaseConfigured } from '../services/supabase';

type AuthValue = { session: Session | null; loading: boolean; configurationError: string | null; authError: string | null };
const AuthContext = createContext<AuthValue>({ session: null, loading: true, configurationError: null, authError: null });

export function AuthProvider({ children }: React.PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(supabaseConfigured);
  const [authError, setAuthError] = useState<string | null>(null);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (!supabaseConfigured) return;
    const client = requireSupabase();
    let active = true;
    let receivedAuthEvent = false;
    const handleAuthUrl = (url: string | null) => {
      if (!url) return;
      try {
        const parsed = new URL(url);
        const fragment = new URLSearchParams(parsed.hash.replace(/^#/, ''));
        const accessToken = parsed.searchParams.get('access_token') || fragment.get('access_token');
        const refreshToken = parsed.searchParams.get('refresh_token') || fragment.get('refresh_token');
        if (accessToken && refreshToken) {
          void client.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
            .then(({ error }) => { if (error) throw error; })
            .catch(() => {
              if (active) setAuthError('This sign-in link could not be completed. Request a new link and try again.');
            });
        }
      } catch { /* Ignore unrelated deep links. */ }
    };
    const { data: listener } = client.auth.onAuthStateChange((event, nextSession) => {
      if (event !== 'INITIAL_SESSION') receivedAuthEvent = true;
      setAuthError(null);
      setSession(nextSession);
      setLoading(false);
    });
    const syncAutoRefresh = (state: string | null) => {
      if (Platform.OS === 'web') return;
      const operation = state === 'active' ? client.auth.startAutoRefresh() : client.auth.stopAutoRefresh();
      void operation.catch(() => {
        if (active) setAuthError('Your session could not be refreshed. Please sign in again if you are asked.');
      });
    };
    const appStateSubscription = Platform.OS === 'web'
      ? null
      : AppState.addEventListener('change', syncAutoRefresh);
    if (Platform.OS !== 'web') syncAutoRefresh(AppState.currentState ?? null);
    client.auth.getSession()
      .then(({ data, error }) => {
        if (error) throw error;
        if (active && !receivedAuthEvent) {
          setSession(data.session);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active && !receivedAuthEvent) {
          setSession(null);
          setAuthError('Your saved session could not be restored. Please sign in again.');
          setLoading(false);
        }
      })
    const linking = Linking.addEventListener('url', ({ url }) => handleAuthUrl(url));
    void Linking.getInitialURL().then((url) => handleAuthUrl(url ?? null));
    return () => {
      active = false;
      listener.subscription.unsubscribe();
      linking.remove();
      appStateSubscription?.remove();
    };
  }, []);

  useEffect(() => {
    if (loading || !supabaseConfigured) return;
    const inAuth = !segments[0] || segments[0] === 'index' || segments[0] === 'welcome' || segments[0] === 'login' || segments[0] === 'signup' || segments[0] === 'forgot-password' || segments[0] === 'reset-password' || segments[0] === 'auth-callback';
    if (!session && !inAuth) router.replace('/login');
    else if (session && inAuth && segments[0] !== 'reset-password') router.replace('/(tabs)');
  }, [loading, router, segments, session]);

  const value = useMemo(() => ({
    session,
    loading,
    configurationError: supabaseConfigured ? null : 'Configure the public Supabase URL and anon key to use authentication.',
    authError,
  }), [session, loading, authError]);
  if (loading) return <View style={styles.loading}><ActivityIndicator color="#FF3B30" /><Text style={styles.text}>Restoring your session…</Text></View>;
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
const styles = StyleSheet.create({ loading: { flex: 1, backgroundColor: '#090B0F', alignItems: 'center', justifyContent: 'center', gap: 12 }, text: { color: '#A5ACBA', fontSize: 14 } });
