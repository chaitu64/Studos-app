import type { User } from '@supabase/supabase-js';
import { UserProfile } from '../types';
import { requireSupabase } from './supabase';
import { normalizeSelections, validProfileUrl } from '../data/profileOptions';

export const authIdentityProfile = (user: User): UserProfile => {
  const id = user.id;
  const metadata = user?.user_metadata || {};
  const fullName = String(metadata.full_name || metadata.name || '').trim();
  const givenName = String(metadata.given_name || metadata.first_name || '').trim();
  const familyName = String(metadata.family_name || metadata.last_name || '').trim();
  const name = [givenName, metadata.middle_name, familyName]
    .filter(Boolean).join(' ').trim() || fullName;
  return {
    id,
    name: name || 'Not provided',
    middleName: String(metadata.middle_name || ''),
    givenName: givenName || fullName.split(/\s+/)[0] || '',
    familyName: familyName || fullName.split(/\s+/).slice(1).join(' '),
    email: user.email || '',
    authProvider: String(user.app_metadata?.provider || 'email'),
    emailVerified: Boolean(user.email_confirmed_at),
    collegeEmail: '',
    dateOfBirth: '',
    avatar: String(metadata.avatar_url || metadata.picture || ''),
    college: String(metadata.college || ''), branch: String(metadata.branch || ''), degree: String(metadata.degree || ''),
    studyYear: metadata.study_year == null ? '' : String(metadata.study_year), gradYear: metadata.graduation_year == null ? '' : String(metadata.graduation_year),
    shortBio: String(metadata.bio || ''), skills: Array.isArray(metadata.skills) ? metadata.skills.map(String) : [],
    interests: Array.isArray(metadata.interests) ? metadata.interests.map(String) : [],
    githubUrl: String(metadata.github_url || '') || undefined, linkedinUrl: String(metadata.linkedin_url || '') || undefined,
    portfolioUrl: String(metadata.portfolio_url || '') || undefined, phoneNumber: String(metadata.phone_number || ''),
  };
};

export async function getStudentProfile(id: string, fallback: UserProfile, authUser?: User | null): Promise<UserProfile> {
  const db = requireSupabase();
  const authResult = await db.auth.getUser();
  const user = authResult.data.user?.id === id ? authResult.data.user : authUser?.id === id ? authUser : null;
  if (!user) return { ...fallback, id, name: 'Not provided', email: '', avatar: '', college: '', collegeEmail: '', dateOfBirth: '', branch: '', degree: '', studyYear: '', gradYear: '', shortBio: '', skills: [], interests: [], githubUrl: undefined, linkedinUrl: undefined, portfolioUrl: undefined, badges: [] };
  const authBase = authIdentityProfile(user);
  // A local/demo profile is never allowed to seed an authenticated account.
  const safeBase = fallback.id === id ? { ...authBase, ...fallback, id, email: authBase.email, emailVerified: authBase.emailVerified, givenName: authBase.givenName, familyName: authBase.familyName } : authBase;

  const { error: ensureError } = await db.rpc('ensure_student_profile');
  if (ensureError) {
    if (ensureError.code === 'PGRST202') {
      // Keep Supabase's PostgREST code so callers can diagnose the missing RPC.
      throw Object.assign(new Error('Student profile setup is unavailable. Ask the project administrator to apply migration 018 and reload the Supabase API schema cache.'), {
        code: ensureError.code,
        details: ensureError.details,
        hint: ensureError.hint,
      });
    }
    throw ensureError;
  }
  const { data, error: profileError } = await db.from('profiles')
    .select('id,auth_user_id,first_name,middle_name,last_name,college,branch,degree,study_year,graduation_year,bio,skills,interests,avatar_url,github_url,linkedin_url,portfolio_url,onboarding_completed')
    .eq('auth_user_id', id).maybeSingle();
  if (profileError) throw profileError;
  const profileLinksAvailable = true;

  let privateData: Record<string, any> | null = null;
  const privateResult = await db.from('profile_private').select('college_email,date_of_birth,phone_number').eq('id', id).maybeSingle();
  if (!privateResult.error) privateData = privateResult.data as Record<string, any> | null;
  else if (privateResult.error.code !== '42P01' && privateResult.error.code !== 'PGRST205' && privateResult.error.code !== '42703') throw privateResult.error;

  if (!data) return { ...safeBase, collegeEmail: privateData?.college_email || '', dateOfBirth: privateData?.date_of_birth || '', profileLinksAvailable, onboardingCompleted: false };
  const profileName = [data.first_name, data.middle_name, data.last_name].filter(Boolean).join(' ').trim();
  const metadata = user.user_metadata || {};
  const metadataName = String(metadata.full_name || metadata.name || '').trim();
  return {
    ...safeBase,
    name: profileName || metadataName || safeBase.name,
    givenName: data.first_name || authBase.givenName,
    middleName: data.middle_name || undefined,
    familyName: data.last_name || authBase.familyName,
    email: user.email || '',
    emailVerified: Boolean(user.email_confirmed_at),
    college: data.college || '', branch: data.branch || '', degree: data.degree || '',
    studyYear: data.study_year ? String(data.study_year) : '',
    gradYear: data.graduation_year ? String(data.graduation_year) : '',
    shortBio: data.bio || '', skills: data.skills || [], interests: data.interests || [],
    githubUrl: data.github_url || undefined, linkedinUrl: data.linkedin_url || undefined,
    portfolioUrl: data.portfolio_url || undefined, profileLinksAvailable,
    onboardingCompleted: Boolean(data.onboarding_completed),
    avatar: (user.app_metadata?.provider === 'google' ? String(metadata.avatar_url || metadata.picture || '') : '') || data.avatar_url || String(metadata.avatar_url || metadata.picture || ''),
    collegeEmail: privateData?.college_email || '', dateOfBirth: privateData?.date_of_birth || '', phoneNumber: privateData?.phone_number || '',
  };
}

export async function updateStudentProfile(id: string, updated: Partial<UserProfile>, current: UserProfile) {
  const db = requireSupabase();
  const { data: { user } } = await db.auth.getUser();
  if (!user || user.id !== id) throw new Error('Your session changed. Sign in again to edit this profile.');
  if (!validProfileUrl('github', updated.githubUrl ?? current.githubUrl ?? '')) throw new Error('Enter a valid GitHub profile URL.');
  if (!validProfileUrl('linkedin', updated.linkedinUrl ?? current.linkedinUrl ?? '')) throw new Error('Enter a valid LinkedIn profile URL.');
  if (!validProfileUrl('portfolio', updated.portfolioUrl ?? current.portfolioUrl ?? '')) throw new Error('Enter a valid HTTPS portfolio URL.');
  const avatar = updated.avatar ?? current.avatar ?? '';
  if (avatar.trim() && !validProfileUrl('portfolio', avatar)) throw new Error('Profile image URLs must use HTTPS.');
  const skills = normalizeSelections(updated.skills ?? current.skills);
  const interests = normalizeSelections(updated.interests ?? current.interests);
  const parts = (updated.name ?? current.name).trim().split(/\s+/).filter(Boolean);
  const firstName = parts.shift() || '';
  const lastName = parts.pop() || '';
  const payload = {
    first_name: updated.givenName ?? firstName, middle_name: updated.middleName ?? (parts.join(' ') || ''),
    last_name: updated.familyName ?? lastName, college: updated.college ?? current.college,
    degree: updated.degree ?? current.degree, branch: updated.branch ?? current.branch ?? '',
    study_year: updated.studyYear ?? current.studyYear ?? '', graduation_year: updated.gradYear ?? current.gradYear ?? '',
    bio: updated.shortBio ?? current.shortBio, skills,
    interests, avatar_url: avatar,
    github_url: updated.githubUrl ?? current.githubUrl ?? '', linkedin_url: updated.linkedinUrl ?? current.linkedinUrl ?? '',
    portfolio_url: updated.portfolioUrl ?? current.portfolioUrl ?? '', phone_number: updated.phoneNumber ?? current.phoneNumber ?? '',
    college_email: updated.collegeEmail ?? current.collegeEmail ?? '', date_of_birth: updated.dateOfBirth ?? current.dateOfBirth ?? '',
  };
  const { error: saveError } = await db.rpc('save_student_profile', { p_profile: payload });
  if (saveError) throw saveError;
  const profileLinksAvailable = true;
  const refreshed = await getStudentProfile(id, current, user);
  return { ...refreshed, profileLinksAvailable };
}
