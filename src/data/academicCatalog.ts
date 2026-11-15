export type AcademicDiscipline =
  | 'engineering'
  | 'computing'
  | 'science'
  | 'commerce'
  | 'arts'
  | 'management'
  | 'health'
  | 'law'
  | 'architecture'
  | 'education'
  | 'agriculture'
  | 'general';

export type AcademicOption = {
  value: string;
  label: string;
  detail?: string;
  keywords?: string[];
};

const normalizeSearchText = (value: string) => value.toLocaleLowerCase('en-IN').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

function editDistance(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + Number(a[i - 1] !== b[j - 1]));
    previous = current;
  }
  return previous[b.length];
}

export function searchAcademicOptions<T extends AcademicOption>(options: T[], query: string, limit = 50): T[] {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return options.slice(0, limit);
  const terms = normalizedQuery.split(/\s+/).filter(Boolean);
  return options.map((option) => {
    const haystack = normalizeSearchText([option.label, option.detail || '', option.value, ...(option.keywords || [])].join(' '));
    if (haystack.includes(normalizedQuery)) return { option, score: 0 };
    if (terms.every((term) => haystack.includes(term))) return { option, score: 1 };
    if (normalizedQuery.length < 4) return { option, score: 99 };
    const distance = Math.min(...haystack.split(' ').map((word) => editDistance(word, normalizedQuery)));
    return { option, score: distance <= Math.max(1, Math.floor(normalizedQuery.length / 4)) ? 2 : 99 };
  }).filter(({ score }) => score < 99).sort((a, b) => a.score - b.score || a.option.label.localeCompare(b.option.label)).slice(0, limit).map(({ option }) => option);
}

export type AcademicProgram = AcademicOption & {
  discipline: AcademicDiscipline;
  durationYears: number | null;
  aliases: string[];
  fullName: string;
};

const entries: [string, string, AcademicDiscipline, number | null, string[]][] = [
  ['Diploma in Engineering', 'Diploma in Engineering', 'engineering', 3, ['Polytechnic Diploma', 'Engineering Diploma']],
  ['B.E.', 'Bachelor of Engineering', 'engineering', 4, ['BE', 'B.E', 'Bachelor of Engg']],
  ['B.Tech', 'Bachelor of Technology', 'engineering', 4, ['BTech', 'B.Tech.']],
  ['Integrated B.Tech / M.Tech', 'Integrated Bachelor and Master of Technology', 'engineering', 5, ['Integrated BTech MTech', 'Dual Degree Engineering']],
  ['M.E.', 'Master of Engineering', 'engineering', 2, ['ME', 'M.E', 'Master of Engg']],
  ['M.Tech', 'Master of Technology', 'engineering', 2, ['MTech', 'M.Tech.']],
  ['Ph.D.', 'Doctor of Philosophy', 'general', null, ['PhD', 'Doctorate', 'Research Degree']],
  ['BCA', 'Bachelor of Computer Applications', 'computing', 3, ['B.C.A.', 'Bachelor of Computer Application']],
  ['MCA', 'Master of Computer Applications', 'computing', 2, ['M.C.A.', 'Master of Computer Application']],
  ['Integrated MCA', 'Integrated Master of Computer Applications', 'computing', 5, ['Integrated M.C.A.']],
  ['B.Sc.', 'Bachelor of Science', 'science', 3, ['BSc', 'B.Sc', 'Bachelor of Science General']],
  ['B.Sc. Honours', 'Bachelor of Science with Honours', 'science', 3, ['BSc Honours', 'B.Sc Hons', 'B.Sc. (Hons.)']],
  ['B.Sc. Honours (4-year)', 'Four-year Bachelor of Science Honours', 'science', 4, ['Four-year B.Sc. Honours', 'BSc Honours 4 year']],
  ['M.Sc.', 'Master of Science', 'science', 2, ['MSc', 'M.Sc']],
  ['Integrated B.Sc. / M.Sc.', 'Integrated Bachelor and Master of Science', 'science', 5, ['Integrated BSc MSc', 'Integrated Science']],
  ['B.Com.', 'Bachelor of Commerce', 'commerce', 3, ['BCom', 'B.Com', 'Bachelor of Commerce General']],
  ['B.Com. Honours', 'Bachelor of Commerce with Honours', 'commerce', 3, ['BCom Honours', 'B.Com Hons', 'B.Com. (Hons.)']],
  ['B.Com. Honours (4-year)', 'Four-year Bachelor of Commerce Honours', 'commerce', 4, ['Four-year B.Com. Honours', 'BCom Honours 4 year']],
  ['M.Com.', 'Master of Commerce', 'commerce', 2, ['MCom', 'M.Com']],
  ['B.A.', 'Bachelor of Arts', 'arts', 3, ['BA', 'B.A', 'Bachelor of Arts General']],
  ['B.A. Honours', 'Bachelor of Arts with Honours', 'arts', 3, ['BA Honours', 'B.A Hons', 'B.A. (Hons.)']],
  ['B.A. Honours (4-year)', 'Four-year Bachelor of Arts Honours', 'arts', 4, ['Four-year B.A. Honours', 'BA Honours 4 year']],
  ['M.A.', 'Master of Arts', 'arts', 2, ['MA', 'M.A']],
  ['BBA', 'Bachelor of Business Administration', 'management', 3, ['B.B.A.']],
  ['MBA', 'Master of Business Administration', 'management', 2, ['M.B.A.']],
  ['BMS', 'Bachelor of Management Studies', 'management', 3, ['B.M.S.']],
  ['PGDM', 'Post Graduate Diploma in Management', 'management', 2, ['Postgraduate Diploma in Management']],
  ['MBBS', 'Bachelor of Medicine and Bachelor of Surgery', 'health', 6, ['M.B.B.S.']],
  ['BDS', 'Bachelor of Dental Surgery', 'health', 5, ['B.D.S.']],
  ['BAMS', 'Bachelor of Ayurvedic Medicine and Surgery', 'health', 5, ['B.A.M.S.']],
  ['BHMS', 'Bachelor of Homeopathic Medicine and Surgery', 'health', 5, ['B.H.M.S.']],
  ['B.Sc. Nursing', 'Bachelor of Science in Nursing', 'health', 4, ['BSc Nursing', 'B.Sc Nursing']],
  ['B.Pharm', 'Bachelor of Pharmacy', 'health', 4, ['BPharm', 'B.Pharmacy']],
  ['M.Pharm', 'Master of Pharmacy', 'health', 2, ['MPharm', 'M.Pharmacy']],
  ['Pharm.D', 'Doctor of Pharmacy', 'health', 6, ['PharmD', 'Pharm D']],
  ['MD', 'Doctor of Medicine', 'health', 3, ['M.D.']],
  ['MS', 'Master of Surgery', 'health', 3, ['M.S.']],
  ['LL.B.', 'Bachelor of Laws', 'law', 3, ['LLB', 'L.L.B.', 'Bachelor of Law']],
  ['B.A. LL.B.', 'Bachelor of Arts and Bachelor of Laws', 'law', 5, ['BA LLB', 'B.A. LLB']],
  ['BBA LL.B.', 'Bachelor of Business Administration and Bachelor of Laws', 'law', 5, ['BBA LLB']],
  ['LL.M.', 'Master of Laws', 'law', 2, ['LLM', 'L.L.M.']],
  ['B.Arch.', 'Bachelor of Architecture', 'architecture', 5, ['BArch', 'B.Arch']],
  ['M.Arch.', 'Master of Architecture', 'architecture', 2, ['MArch', 'M.Arch']],
  ['B.Des.', 'Bachelor of Design', 'architecture', 4, ['BDes', 'B.Des']],
  ['M.Des.', 'Master of Design', 'architecture', 2, ['MDes', 'M.Des']],
  ['B.Ed.', 'Bachelor of Education', 'education', 2, ['BEd', 'B.Ed']],
  ['M.Ed.', 'Master of Education', 'education', 2, ['MEd', 'M.Ed']],
  ['B.Sc. Agriculture', 'Bachelor of Science in Agriculture', 'agriculture', 4, ['BSc Agriculture', 'B.Sc Agriculture', 'B.Ag.']],
  ['M.Sc. Agriculture', 'Master of Science in Agriculture', 'agriculture', 2, ['MSc Agriculture', 'M.Sc Agriculture']],
  ['Certificate', 'Certificate Programme', 'general', null, ['Certificate Course', 'Short Course']],
  ['Diploma', 'Diploma Programme', 'general', null, ['Diploma Course']],
  ['Postgraduate Diploma', 'Postgraduate Diploma Programme', 'general', 1, ['PG Diploma', 'PG Diploma Programme']],
  ['Integrated Degree', 'Integrated Degree Programme', 'general', null, ['Dual Degree', 'Integrated Programme']],
  ['Research Programme', 'Research Programme', 'general', null, ['Research Degree']],
  ['Other qualification', 'Other recognised qualification', 'general', null, ['Other', 'Other Degree']],
];

export const academicPrograms: AcademicProgram[] = entries.map(([value, fullName, discipline, durationYears, aliases]) => ({
  value,
  label: `${value} — ${fullName}`,
  keywords: aliases as string[],
  fullName: fullName as string,
  discipline: discipline as AcademicDiscipline,
  durationYears,
  aliases: aliases as string[],
}));

const specialization = (value: string, keywords: string[] = []): AcademicOption => ({ value, label: value, keywords });

const engineering = [
  specialization('Computer Science and Engineering', ['CSE', 'Computer Engineering']), specialization('Computer Science and Artificial Intelligence', ['CSAI', 'CSE AI']),
  specialization('Artificial Intelligence and Machine Learning', ['AIML', 'AI & ML', 'AI ML']), specialization('Information Technology', ['IT']), specialization('Electronics and Communication Engineering', ['ECE']),
  specialization('Electrical and Electronics Engineering', ['EEE']), specialization('Electrical Engineering', ['EE']), specialization('Mechanical Engineering', ['ME']), specialization('Civil Engineering', ['CE']),
  'Chemical Engineering', 'Cyber Security', 'Data Science', 'Biotechnology', 'Aerospace Engineering',
  'Automobile Engineering', 'Instrumentation and Control Engineering', 'Other engineering specialization',
];
const science = ['Computer Science', 'Mathematics', 'Physics', 'Chemistry', 'Statistics', 'Biotechnology', 'Microbiology', 'Botany', 'Zoology', 'Geology', 'Environmental Science', 'Other science major'];
const commerce = ['General', 'Accounting and Finance', 'Banking and Insurance', 'Computer Applications', 'Taxation', 'Economics', 'Other commerce specialization'];
const management = ['General Management', 'Finance', 'Marketing', 'Human Resources', 'Business Analytics', 'Operations', 'Entrepreneurship', 'International Business', 'Other management specialization'];
const arts = ['General', 'English', 'History', 'Political Science', 'Economics', 'Psychology', 'Sociology', 'Geography', 'Philosophy', 'Languages', 'Other humanities major'];
const health = ['General', 'General Medicine', 'Surgery', 'Paediatrics', 'Obstetrics and Gynaecology', 'Community Medicine', 'Pharmacology', 'Orthopaedics', 'Other health specialization'];
const law = ['General', 'Constitutional Law', 'Corporate Law', 'Criminal Law', 'Intellectual Property Law', 'International Law', 'Other law specialization'];
const agriculture = ['General', 'Agronomy', 'Horticulture', 'Plant Pathology', 'Soil Science', 'Animal Science', 'Agricultural Economics', 'Other agriculture specialization'];
const general = ['General', 'Other specialization'];

export const specializationsByDiscipline: Record<AcademicDiscipline, AcademicOption[]> = {
  engineering: engineering.map((item) => typeof item === 'string' ? specialization(item) : item), computing: ['Computer Applications', 'Software Development', 'Information Systems', 'Data Science', 'Cyber Security', 'Other computing specialization'].map((value) => specialization(value)),
  science: science.map((value) => specialization(value)), commerce: commerce.map((value) => specialization(value)), arts: arts.map((value) => specialization(value)),
  management: management.map((value) => specialization(value)), health: health.map((value) => specialization(value)), law: law.map((value) => specialization(value)),
  architecture: ['General', 'Architecture', 'Urban Design', 'Landscape Architecture', 'Interior Design', 'Communication Design', 'Product Design', 'Other design specialization'].map((value) => specialization(value)),
  education: ['General', 'Elementary Education', 'Secondary Education', 'Special Education', 'Educational Technology', 'Other education specialization'].map((value) => specialization(value)),
  agriculture: agriculture.map((value) => specialization(value)), general: general.map((value) => specialization(value)),
};

export function normalizeAcademicName(value: string): string {
  return value.toLocaleLowerCase('en-IN').replace(/[^a-z0-9]/g, '');
}

export function findAcademicProgram(value: string): AcademicProgram | undefined {
  const normalized = normalizeAcademicName(value);
  if (!normalized) return undefined;
  return academicPrograms.find((program) => [program.value, program.fullName, ...program.aliases].some((candidate) => normalizeAcademicName(candidate) === normalized));
}

export function studyYearOptions(programValue: string): AcademicOption[] {
  const duration = findAcademicProgram(programValue)?.durationYears;
  const count = duration ? Math.min(8, Math.ceil(duration)) : 8;
  return Array.from({ length: count }, (_, index) => String(index + 1)).map((year) => ({ value: year, label: year }));
}

export function suggestedGraduationYear(programValue: string, studyYear: string, baseYear = new Date().getFullYear()): string {
  const duration = findAcademicProgram(programValue)?.durationYears;
  const currentYear = Number(studyYear);
  if (!duration || !Number.isInteger(currentYear) || currentYear < 1 || currentYear > 8) return '';
  return String(baseYear + Math.max(0, Math.ceil(duration) - currentYear));
}

export function shouldUpdateSuggestedGraduationYear(current: string, previousSuggestion: string, manuallyEdited: boolean): boolean {
  return !manuallyEdited && (!current || current === previousSuggestion);
}

/** Institution search data; additions beyond user-supplied starters need validated reuse rights. */
export type InstitutionRecord = AcademicOption & { city?: string; state?: string; identifiers?: Record<string, string>; aliases?: string[] };
// Starter examples supplied by STUDOS. This is not a complete national directory.
// Keep additions sourced and licensed before publishing a larger catalogue.
export const institutionCatalogue: InstitutionRecord[] = [
  { value: 'Vasireddy Venkatadri Institute of Technology', label: 'Vasireddy Venkatadri Institute of Technology', keywords: ['VVIT', 'VVITU', 'Vasireddy Venkatadri'] },
  { value: "Vignan's Foundation for Science, Technology and Research", label: "Vignan's Foundation for Science, Technology and Research", keywords: ['Vignan', 'VFSTR', 'Vignan University'] },
  { value: 'Andhra University', label: 'Andhra University', keywords: ['AU'] },
  { value: 'Jawaharlal Nehru Technological University Kakinada', label: 'Jawaharlal Nehru Technological University Kakinada', keywords: ['JNTUK', 'JNTU Kakinada'] },
  { value: 'Jawaharlal Nehru Technological University Hyderabad', label: 'Jawaharlal Nehru Technological University Hyderabad', keywords: ['JNTUH', 'JNTU Hyderabad'] },
  { value: 'Osmania University', label: 'Osmania University', keywords: ['OU'] },
  { value: 'University of Hyderabad', label: 'University of Hyderabad', keywords: ['UoH', 'HCU'] },
  { value: 'Indian Institute of Technology Hyderabad', label: 'Indian Institute of Technology Hyderabad', keywords: ['IIT Hyderabad', 'IITH'] },
  { value: 'National Institute of Technology Warangal', label: 'National Institute of Technology Warangal', keywords: ['NIT Warangal', 'NITW'] },
  { value: 'Indian Institute of Technology Madras', label: 'Indian Institute of Technology Madras', keywords: ['IIT Madras', 'IITM'] },
  { value: 'Indian Institute of Technology Bombay', label: 'Indian Institute of Technology Bombay', keywords: ['IIT Bombay', 'IITB'] },
  { value: 'Indian Institute of Technology Delhi', label: 'Indian Institute of Technology Delhi', keywords: ['IIT Delhi', 'IITD'] },
  { value: 'Indian Institute of Science', label: 'Indian Institute of Science', keywords: ['IISc', 'IISc Bangalore'] },
  { value: 'Birla Institute of Technology and Science, Pilani', label: 'Birla Institute of Technology and Science, Pilani', keywords: ['BITS Pilani', 'BITS'] },
  { value: 'Vellore Institute of Technology', label: 'Vellore Institute of Technology', keywords: ['VIT', 'VIT Vellore'] },
  { value: 'SRM Institute of Science and Technology', label: 'SRM Institute of Science and Technology', keywords: ['SRMIST', 'SRM University'] },
  { value: 'Amrita Vishwa Vidyapeetham', label: 'Amrita Vishwa Vidyapeetham', keywords: ['Amrita University', 'Amrita'] },
];
