import { requireSupabase } from './supabase';

export type SignupInput = { first_name: string; middle_name?: string; last_name: string; email: string; password: string; college?: string; degree?: string; branch?: string; study_year?: number; graduation_year?: number; bio?: string; phone_number?: string; skills?: string[]; interests?: string[]; github_url?: string; linkedin_url?: string; portfolio_url?: string };
const oauthExchanges = new Map<string, ReturnType<ReturnType<typeof requireSupabase>['auth']['exchangeCodeForSession']>>();

export const authService = {
  signIn: async (email: string, password: string) => {
    const db = requireSupabase();
    // Keep login limited to Auth. Profile rows are initialized by the database
    // trigger; waiting on two extra PostgREST writes can make a valid login
    // appear stuck, and those writes may fail independently of authentication.
    return db.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  },
  signUp: (input: SignupInput, emailRedirectTo?: string) => {
    const { email, password, ...profile } = input;
    return requireSupabase().auth.signUp({ email: email.trim().toLowerCase(), password, options: { data: profile, ...(emailRedirectTo ? { emailRedirectTo } : {}) } });
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
