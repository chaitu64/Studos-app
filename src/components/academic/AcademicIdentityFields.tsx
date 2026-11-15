import React, { useMemo, useRef } from 'react';
import { View } from 'react-native';
import {
  academicPrograms, findAcademicProgram, institutionCatalogue, normalizeAcademicName,
  shouldUpdateSuggestedGraduationYear, specializationsByDiscipline, studyYearOptions, suggestedGraduationYear,
  type AcademicOption,
} from '../../data/academicCatalog';
import SearchableSelect from './SearchableSelect';

type Props = {
  college: string;
  degree: string;
  branch: string;
  studyYear: string;
  graduationYear: string;
  onChange: (key: 'college' | 'degree' | 'branch' | 'studyYear' | 'graduationYear', value: string) => void;
  onBranchReviewChange?: (needsReview: boolean) => void;
  onStudyYearReviewChange?: (needsReview: boolean) => void;
  errors?: Partial<Record<'college' | 'degree' | 'branch' | 'studyYear' | 'graduationYear', string>>;
};

const currentYear = new Date().getFullYear();
const graduationYears: AcademicOption[] = Array.from({ length: 26 }, (_, index) => currentYear - 10 + index).map((year) => ({ value: String(year), label: String(year) }));
export default function AcademicIdentityFields({ college, degree, branch, studyYear, graduationYear, onChange, onBranchReviewChange, onStudyYearReviewChange, errors }: Props) {
  const program = findAcademicProgram(degree);
  const normalYearOptions = useMemo(() => studyYearOptions(degree), [degree]);
  const specializations = program ? specializationsByDiscipline[program.discipline] : specializationsByDiscipline.general;
  const previousSuggestion = useRef('');
  const manuallyEditedYear = useRef(Boolean(graduationYear));

  const updateField = (key: 'college' | 'degree' | 'branch' | 'studyYear' | 'graduationYear', value: string) => {
    if (key === 'graduationYear') {
      manuallyEditedYear.current = true;
      onChange(key, value);
      return;
    }
    onChange(key, value);
    if (key === 'degree') {
      const nextProgram = findAcademicProgram(value);
      const nextOptions = nextProgram ? specializationsByDiscipline[nextProgram.discipline] : specializationsByDiscipline.general;
      const branchMatches = nextOptions.some((option) => normalizeAcademicName(option.value) === normalizeAcademicName(branch) || option.keywords?.some((keyword) => normalizeAcademicName(keyword) === normalizeAcademicName(branch)));
      onBranchReviewChange?.(Boolean(branch.trim() && !branchMatches));
      const nextDuration = nextProgram?.durationYears;
      onStudyYearReviewChange?.(Boolean(studyYear && nextDuration && (!/^\d+$/.test(studyYear) || Number(studyYear) > Math.ceil(nextDuration))));
    } else if (key === 'branch') {
      onBranchReviewChange?.(false);
    } else if (key === 'studyYear') {
      onStudyYearReviewChange?.(false);
    }
    if (key === 'degree' || key === 'studyYear') {
      const nextSuggestion = suggestedGraduationYear(key === 'degree' ? value : degree, key === 'studyYear' ? value : studyYear, currentYear);
      if (nextSuggestion && shouldUpdateSuggestedGraduationYear(graduationYear, previousSuggestion.current, manuallyEditedYear.current)) {
        previousSuggestion.current = nextSuggestion;
        onChange('graduationYear', nextSuggestion);
      }
    }
  };

  return <View style={{ gap: 10 }}>
    <SearchableSelect
      label="College or university"
      value={college}
      options={institutionCatalogue}
      onChange={(value) => updateField('college', value)}
      placeholder="Search or enter your institution"
      allowCustom
      error={errors?.college}
    />
    <SearchableSelect
      label="Degree or program"
      value={degree}
      options={academicPrograms}
      onChange={(value) => updateField('degree', value)}
      placeholder="Search qualifications"
      allowCustom
      error={errors?.degree}
    />
    <SearchableSelect
      label="Branch / major"
      value={branch}
      options={specializations}
      onChange={(value) => updateField('branch', value)}
      placeholder={program ? 'Search relevant specializations' : 'Select a degree first'}
      allowCustom
      error={errors?.branch}
    />
    <SearchableSelect
      label="Current study year"
      value={studyYear}
      options={normalYearOptions}
      onChange={(value) => updateField('studyYear', value)}
      placeholder="Select year"
      allowCustom
      error={errors?.studyYear}
    />
    <SearchableSelect
      label="Expected graduation year"
      value={graduationYear}
      options={graduationYears}
      onChange={(value) => updateField('graduationYear', value)}
      placeholder="Select a year"
      error={errors?.graduationYear}
    />
  </View>;
}
