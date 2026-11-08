import type { User } from '@supabase/supabase-js';
import { UserProfile } from '../types';
import { requireSupabase } from './supabase';

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
    givenName: givenName || fullName.split(/\s+/)[0] || '',
    familyName: familyName || fullName.split(/\s+/).slice(1).join(' '),
    email: user.email || '',
    authProvider: String(user.app_metadata?.provider || 'email'),
    emailVerified: Boolean(user.email_confirmed_at),
    collegeEmail: '',
    dateOfBirth: '',
    avatar: String(metadata.avatar_url || metadata.picture || ''),
    college: '', branch: '', degree: '', studyYear: '', gradYear: '', shortBio: '',
    skills: [], interests: [],
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

  let data: Record<string, any> | null = null;
  let profileLinksAvailable = false;
  const selects = [
    'id,first_name,middle_name,last_name,college,branch,degree,study_year,graduation_year,bio,skills,interests,avatar_url,github_url,linkedin_url,portfolio_url',
    'id,first_name,middle_name,last_name,college,branch,degree,study_year,graduation_year,bio,skills,interests,avatar_url',
    'id,first_name,middle_name,last_name,college,branch,degree,study_year,graduation_year,bio,skills,interests',
    'id,first_name,middle_name,last_name,college,branch,degree,study_year,graduation_year,bio',
    'id,first_name,last_name,college,branch',
  ];
  for (const columns of selects) {
    const result = await db.from('profiles').select(columns).eq('id', id).maybeSingle();
    if (!result.error) { data = result.data as Record<string, any> | null; profileLinksAvailable = columns.includes('github_url'); break; }
    if (result.error.code !== '42703' && result.error.code !== 'PGRST204') throw result.error;
  }

  let privateData: Record<string, any> | null = null;
  const privateResult = await db.from('profile_private').select('college_email,date_of_birth').eq('id', id).maybeSingle();
  if (!privateResult.error) privateData = privateResult.data as Record<string, any> | null;
  else if (privateResult.error.code !== '42P01' && privateResult.error.code !== 'PGRST205' && privateResult.error.code !== '42703') throw privateResult.error;

  if (!data) return { ...safeBase, collegeEmail: privateData?.college_email || '', dateOfBirth: privateData?.date_of_birth || '', profileLinksAvailable };
  const profileName = [data.first_name, data.middle_name, data.last_name].filter(Boolean).join(' ').trim();
  const metadata = user.user_metadata || {};
  const metadataName = String(metadata.full_name || metadata.name || '').trim();
  return {
    ...safeBase,
    name: profileName || metadataName || safeBase.name,
    givenName: data.first_name || authBase.givenName,
    familyName: data.last_name || authBase.familyName,
    email: user.email || '',
    emailVerified: Boolean(user.email_confirmed_at),
    college: data.college || '', branch: data.branch || '', degree: data.degree || '',
    studyYear: data.study_year ? String(data.study_year) : '',
    gradYear: data.graduation_year ? String(data.graduation_year) : '',
    shortBio: data.bio || '', skills: data.skills || [], interests: data.interests || [],
    githubUrl: data.github_url || undefined, linkedinUrl: data.linkedin_url || undefined,
    portfolioUrl: data.portfolio_url || undefined, profileLinksAvailable,
    avatar: (user.app_metadata?.provider === 'google' ? String(metadata.avatar_url || metadata.picture || '') : '') || data.avatar_url || String(metadata.avatar_url || metadata.picture || ''),
    collegeEmail: privateData?.college_email || '', dateOfBirth: privateData?.date_of_birth || '',
  };
}

export async function updateStudentProfile(id: string, updated: Partial<UserProfile>, current: UserProfile) {
  const db = requireSupabase();
  const { data: { user } } = await db.auth.getUser();
  if (!user || user.id !== id) throw new Error('Your session changed. Sign in again to edit this profile.');
  const fields: Record<string, unknown> = {};
  if (updated.shortBio !== undefined) fields.bio = updated.shortBio;
  if (updated.skills !== undefined) fields.skills = updated.skills;
  if (updated.interests !== undefined) fields.interests = updated.interests;
  if (updated.college !== undefined) fields.college = updated.college || null;
  if (updated.degree !== undefined) fields.degree = updated.degree || null;
  if (updated.branch !== undefined) fields.branch = updated.branch || null;
  if (updated.studyYear !== undefined) fields.study_year = updated.studyYear ? Number(updated.studyYear) : null;
  if (updated.gradYear !== undefined) fields.graduation_year = updated.gradYear ? Number(updated.gradYear) : null;
  if (updated.avatar !== undefined && updated.avatar) fields.avatar_url = updated.avatar;
  if (updated.name !== undefined) {
    const parts = updated.name.trim().split(/\s+/).filter(Boolean);
    fields.first_name = parts.shift() || '';
    fields.last_name = parts.pop() || '';
    fields.middle_name = parts.join(' ') || null;
  }
  if (Object.keys(fields).length) {
    fields.updated_at = new Date().toISOString();
    const { error } = await db.from('profiles').update(fields).eq('id', id);
    if (error) throw error;
  }
  const linkUpdates = {
    ...(updated.githubUrl !== undefined ? { github_url: updated.githubUrl || null } : {}),
    ...(updated.linkedinUrl !== undefined ? { linkedin_url: updated.linkedinUrl || null } : {}),
    ...(updated.portfolioUrl !== undefined ? { portfolio_url: updated.portfolioUrl || null } : {}),
  };
  let profileLinksAvailable = current.profileLinksAvailable ?? false;
  if (Object.keys(linkUpdates).length) {
    const probe = await db.from('profiles').select('github_url,linkedin_url,portfolio_url').eq('id', id).maybeSingle();
    if (probe.error && (probe.error.code === '42703' || probe.error.code === 'PGRST204')) {
      profileLinksAvailable = false;
    } else if (probe.error) throw probe.error;
    else {
      profileLinksAvailable = true;
      const { error } = await db.from('profiles').update(linkUpdates).eq('id', id);
      if (error) throw error;
    }
  }
  if (updated.collegeEmail !== undefined || updated.dateOfBirth !== undefined) {
    const privateFields: Record<string, unknown> = {};
    if (updated.collegeEmail !== undefined) privateFields.college_email = updated.collegeEmail || null;
    if (updated.dateOfBirth !== undefined) privateFields.date_of_birth = updated.dateOfBirth || null;
    privateFields.updated_at = new Date().toISOString();
    const { error } = await db.from('profile_private').upsert({ id, ...privateFields }, { onConflict: 'id' });
    if (error) throw error;
  }
  const refreshed = await getStudentProfile(id, current, user);
  return { ...refreshed, profileLinksAvailable };
}
