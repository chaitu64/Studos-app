import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const authScreen = await readFile(new URL('../src/components/auth/AuthScreen.tsx', import.meta.url), 'utf8');
const onboarding = await readFile(new URL('../src/app/onboarding.tsx', import.meta.url), 'utf8');
const profileService = await readFile(new URL('../src/services/profileService.ts', import.meta.url), 'utf8');
const profileScreen = await readFile(new URL('../src/app/(tabs)/profile.tsx', import.meta.url), 'utf8');
const saveMigration = await readFile(new URL('../backend/migrations/019_fix_save_student_profile.sql', import.meta.url), 'utf8');

test('email signup is a three-step flow and requires matching credentials before account creation', () => {
  assert.match(authScreen, /signupSteps = \['Account', 'Academic identity', 'Your profile'\]/);
  assert.match(authScreen, /fields\.password !== fields\.confirmPassword/);
  assert.match(authScreen, /step < 3/);
  assert.match(authScreen, /authService\.signUp\(payload/);
});

test('signup metadata and profile completion cover academic, personal and professional fields', () => {
  for (const field of ['college', 'degree', 'branch', 'study_year', 'graduation_year', 'middle_name', 'phone_number', 'bio', 'skills', 'interests', 'github_url', 'linkedin_url', 'portfolio_url']) {
    assert.ok(authScreen.includes(field) || onboarding.includes(field), `Missing field mapping for ${field}`);
  }
  assert.match(onboarding, /updateProfile\(/);
  assert.match(profileService, /db\.rpc\('save_student_profile'/);
  assert.match(profileService, /middle_name:/);
});

test('profile editor exposes private phone and graduation fields and validates HTTPS links', () => {
  assert.match(profileScreen, /Phone number \(private\)/);
  assert.match(profileScreen, /Graduation year/);
  assert.match(profileScreen, /Profile image URL/);
  assert.match(profileScreen, /must use HTTPS/);
});

test('phone is read from private storage and omitted from public directory profile selection', () => {
  assert.match(profileService, /from\('profile_private'\)\.select\('college_email,date_of_birth,phone_number'\)/);
  assert.match(profileService, /from\('profiles'\)[\s\S]*?\.select\('id,auth_user_id,first_name,middle_name,last_name,college,branch,degree,study_year,graduation_year,bio,skills,interests,avatar_url,github_url,linkedin_url,portfolio_url,onboarding_completed'\)/);
});

test('profile save RPC writes to the renamed canonical relation with owner checks and preserved contract', () => {
  const executableFunction = saveMigration.split('as $$')[1]?.split('$$;')[0] ?? '';
  assert.match(saveMigration, /function public\.save_student_profile\(p_profile jsonb\)/);
  assert.match(saveMigration, /security definer set search_path = ''/);
  assert.match(saveMigration, /auth\.uid\(\)/);
  assert.match(saveMigration, /public\.ensure_student_profile\(\)/);
  assert.match(saveMigration, /update public\.profiles[\s\S]*where id=v_id and auth_user_id=v_user_id/);
  assert.doesNotMatch(executableFunction, /public\.student_profiles/);
  assert.match(saveMigration, /grant execute on function public\.save_student_profile\(jsonb\) to authenticated/);
  assert.match(saveMigration, /notify pgrst, 'reload schema'/);
});
