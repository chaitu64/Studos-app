import { requireSupabase } from './supabase';

export type SignupInput = { first_name: string; middle_name?: string; last_name: string; email: string; password: string; college?: string; degree?: string; branch?: string; study_year?: number; graduation_year?: number };
const oauthExchanges = new Map<string, ReturnType<ReturnType<typeof requireSupabase>['auth']['exchangeCodeForSession']>>();

export const authService = {
  signIn: async (email: string, password: string) => {
    const db = requireSupabase();
    // Keep login limited to Auth. Profile rows are initialized by the database
    // trigger; waiting on two extra PostgREST writes can make a valid login
    // appear stuck, and those writes may fail independently of authentication.
    return db.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  },
  signUp: (input: SignupInput) => {
    const { email, password, ...profile } = input;
    return requireSupabase().auth.signUp({ email: email.trim().toLowerCase(), password, options: { data: profile } });
  },
  signInWithGoogle: (redirectTo: string | undefined, skipBrowserRedirect: boolean) => requireSupabase().auth.signInWithOAuth({
    provider: 'google',
    options: { ...(redirectTo ? { redirectTo } : {}), skipBrowserRedirect },
  }),
  completeOAuthSignIn: (code: string) => {
    const pending = oauthExchanges.get(code);
    if (pending) return pending;
    const exchange = (async () => {
    const db = requireSupabase();
    const result = await db.auth.exchangeCodeForSession(code);
    const user = result.data.user;
    if (!result.error && user) {
      const metadata = user.user_metadata || {};
      const fullName = String(metadata.full_name || metadata.name || '').trim().split(/\s+/);
      const firstName = String(metadata.first_name || metadata.given_name || fullName[0] || '').trim();
      const lastName = String(metadata.last_name || metadata.family_name || fullName.slice(1).join(' ') || '').trim();
      if (firstName || lastName) {
        // The Auth session is already valid. Best-effort profile enrichment
        // must not keep the user on the callback screen.
        const updates = [];
        if (firstName) updates.push(db.from('profiles').update({ first_name: firstName }).eq('id', user.id).eq('first_name', ''));
        if (lastName) updates.push(db.from('profiles').update({ last_name: lastName }).eq('id', user.id).eq('last_name', ''));
        void Promise.all(updates).catch(() => undefined);
      }
    }
    return result;
    })();
    oauthExchanges.set(code, exchange);
    void exchange.catch(() => oauthExchanges.delete(code));
    return exchange;
  },
  signOut: () => requireSupabase().auth.signOut(),
  resetPassword: (email: string, redirectTo = 'studos://reset-password') => requireSupabase().auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo }),
  updatePassword: (password: string) => requireSupabase().auth.updateUser({ password }),
  resendVerification: (email: string) => requireSupabase().auth.resend({ type: 'signup', email: email.trim().toLowerCase() }),
};
