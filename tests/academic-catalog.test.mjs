import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import {
  findAcademicProgram, institutionCatalogue, shouldUpdateSuggestedGraduationYear,
  searchAcademicOptions, specializationsByDiscipline, studyYearOptions, suggestedGraduationYear,
} from '../src/data/academicCatalog.ts';
import { interestSuggestions, normalizeSelections, skillSuggestions, toggleSelection, validProfileUrl } from '../src/data/profileOptions.ts';

const signup = await readFile(new URL('../src/components/auth/AuthScreen.tsx', import.meta.url), 'utf8');
const onboarding = await readFile(new URL('../src/app/onboarding.tsx', import.meta.url), 'utf8');
const selector = await readFile(new URL('../src/components/academic/SearchableSelect.tsx', import.meta.url), 'utf8');
const academicFields = await readFile(new URL('../src/components/academic/AcademicIdentityFields.tsx', import.meta.url), 'utf8');
const multiSelect = await readFile(new URL('../src/components/academic/SearchableMultiSelect.tsx', import.meta.url), 'utf8');
const publicProfile = await readFile(new URL('../src/app/student/[type]/[id].tsx', import.meta.url), 'utf8');
const profileService = await readFile(new URL('../src/services/profileService.ts', import.meta.url), 'utf8');

test('degree catalogue resolves common Indian programme aliases without changing stored values', () => {
  assert.equal(findAcademicProgram('Btech')?.value, 'B.Tech');
  assert.equal(findAcademicProgram('B.Tech')?.value, 'B.Tech');
  assert.equal(findAcademicProgram('B.E.')?.value, 'B.E.');
  assert.equal(findAcademicProgram('Bachelor of Technology')?.value, 'B.Tech');
});

test('dependent specializations match engineering, science, commerce and management programmes', () => {
  assert.ok(specializationsByDiscipline[findAcademicProgram('B.Tech').discipline].some((item) => item.value === 'Artificial Intelligence and Machine Learning'));
  assert.ok(specializationsByDiscipline[findAcademicProgram('B.Sc.').discipline].some((item) => item.value === 'Physics'));
  assert.ok(specializationsByDiscipline[findAcademicProgram('B.Com.').discipline].some((item) => item.value === 'Accounting and Finance'));
  assert.ok(specializationsByDiscipline[findAcademicProgram('MBA').discipline].some((item) => item.value === 'Business Analytics'));
});

test('study year choices follow standard duration while variable programmes retain years 1 through 8', () => {
  assert.deepEqual(studyYearOptions('B.Tech').map((option) => option.value), ['1', '2', '3', '4']);
  assert.deepEqual(studyYearOptions('MBA').map((option) => option.value), ['1', '2']);
  assert.equal(findAcademicProgram('MBBS').durationYears, 6);
  assert.deepEqual(studyYearOptions('Ph.D.').map((option) => option.value), ['1', '2', '3', '4', '5', '6', '7', '8']);
});

test('completion suggestion follows duration and study year but manual choices are preserved', () => {
  assert.equal(suggestedGraduationYear('B.Tech', '3', 2026), '2027');
  assert.equal(suggestedGraduationYear('MBBS', '3', 2026), '2029');
  assert.equal(suggestedGraduationYear('Ph.D.', '3', 2026), '');
  assert.equal(shouldUpdateSuggestedGraduationYear('', '2029', false), true);
  assert.equal(shouldUpdateSuggestedGraduationYear('2030', '2029', false), false);
  assert.equal(shouldUpdateSuggestedGraduationYear('2029', '2029', true), false);
});

test('starter institutions support familiar acronyms while preserving manual entry', () => {
  assert.ok(institutionCatalogue.length >= 17);
  const vvit = institutionCatalogue.find((item) => item.keywords?.includes('VVIT'));
  assert.equal(vvit?.value, 'Vasireddy Venkatadri Institute of Technology');
  assert.ok(vvit?.keywords?.includes('VVITU'));
  assert.equal(searchAcademicOptions(institutionCatalogue, 'VVIT')[0]?.value, vvit.value);
  assert.equal(searchAcademicOptions(institutionCatalogue, 'vvit')[0]?.value, vvit.value);
  assert.equal(searchAcademicOptions(institutionCatalogue, 'vasireddy venkatadri')[0]?.value, vvit.value);
  assert.match(selector, /allowCustom/);
  assert.match(selector, /searchProvider\?: SearchProvider/);
  assert.match(academicFields, /options=\{institutionCatalogue\}/);
  assert.match(signup, /AcademicIdentityFields college=\{fieldValue\('college'\)\}/);
  assert.match(onboarding, /AcademicIdentityFields college=\{fields\.college\}/);
  assert.match(signup, /study_year: Number\(fieldValue\('study_year'\)\)/);
  assert.match(onboarding, /college: fields\.college\.trim\(\), degree: fields\.degree\.trim\(\), branch: fields\.branch\.trim\(\), studyYear: fields\.year, gradYear: fields\.gradYear/);
});

test('academic dropdowns use aligned icon chevrons and truncate long values', () => {
  assert.match(selector, /Ionicons/);
  assert.match(selector, /name="chevron-down"/);
  assert.doesNotMatch(selector, /<Text[^>]*>v<\/Text>|⌄/);
  assert.match(selector, /numberOfLines=\{1\} ellipsizeMode="tail"/);
  assert.match(selector, /height: 52, paddingHorizontal: 13/);
  assert.doesNotMatch(academicFields, /helperText=/);
  for (const phrase of ['Institution directory unavailable', 'Search by familiar abbreviation', 'Choose a major relevant', 'Standard duration:', 'Suggested completion year:', 'data-use rights are approved']) {
    assert.equal(academicFields.includes(phrase), false, phrase);
  }
});

test('degree changes require a new study year when duration makes the previous selection invalid', () => {
  assert.match(academicFields, /onStudyYearReviewChange\?\.\(Boolean\(studyYear && nextDuration/);
  assert.match(signup, /Choose a study year for the selected degree/);
  assert.match(onboarding, /Choose a study year for the selected degree/);
  assert.deepEqual(studyYearOptions('Diploma in Engineering').map((option) => option.value), ['1', '2', '3']);
  assert.deepEqual(studyYearOptions('MBBS').map((option) => option.value), ['1', '2', '3', '4', '5', '6']);
});

test('multi-selects deduplicate values and support custom skills and interests', () => {
  assert.deepEqual(normalizeSelections([' Python ', 'python', 'Data  Science']), ['Python', 'Data Science']);
  assert.deepEqual(toggleSelection(['Python'], ' python '), []);
  assert.deepEqual(toggleSelection(['Python'], 'Custom Skill'), ['Python', 'Custom Skill']);
  assert.ok(skillSuggestions.includes('Python') && skillSuggestions.includes('C++'));
  assert.ok(interestSuggestions.includes('Cybersecurity') && interestSuggestions.includes('Hackathons'));
  assert.match(multiSelect, /Add “\{customValue\}”/);
  assert.match(multiSelect, /accessibilityRole="checkbox"/);
});

test('profile links validate against their hosts and profile saves retain text array RPC contract', () => {
  assert.equal(validProfileUrl('github', 'https://github.com/octocat'), true);
  assert.equal(validProfileUrl('github', 'https://example.com/octocat'), false);
  assert.equal(validProfileUrl('linkedin', 'https://www.linkedin.com/in/example'), true);
  assert.equal(validProfileUrl('linkedin', 'https://example.com/in/example'), false);
  assert.equal(validProfileUrl('portfolio', 'https://portfolio.example.org/work'), true);
  assert.equal(validProfileUrl('portfolio', 'http://portfolio.example.org'), false);
  assert.match(publicProfile, /validProfileUrl\(kind, url\)/);
  assert.match(profileService, /skills,\s*interests,/);
  assert.match(profileService, /db\.rpc\('save_student_profile'/);
});
