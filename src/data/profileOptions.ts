export const skillSuggestions = [
  'Python', 'Java', 'C', 'C++', 'JavaScript', 'TypeScript', 'React', 'React Native', 'HTML', 'CSS', 'Node.js', 'Express', 'Next.js',
  'PostgreSQL', 'Supabase', 'Firebase', 'MongoDB', 'SQL', 'Machine Learning', 'Artificial Intelligence', 'Data Science', 'TensorFlow',
  'PyTorch', 'Data Analysis', 'Figma', 'UI/UX Design', 'Git', 'GitHub', 'Docker', 'Arduino', 'ESP32', 'Raspberry Pi', 'IoT', 'Embedded Systems',
];

export const interestSuggestions = [
  'Artificial Intelligence', 'Machine Learning', 'Cybersecurity', 'Web Development', 'App Development', 'Open Source', 'Robotics',
  'Internet of Things', 'Data Science', 'Product Design', 'Entrepreneurship', 'Startups', 'Hackathons', 'Research', 'Cloud Computing',
  'Game Development', 'Blockchain', 'UI/UX Design', 'Competitive Programming', 'Social Impact', 'Community Building',
];

const normalize = (value: string) => value.trim().replace(/\s+/g, ' ');

export function normalizeSelections(values: string[]): string[] {
  const seen = new Set<string>();
  return values.map(normalize).filter((value) => {
    const key = value.toLocaleLowerCase('en');
    if (!value || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function toggleSelection(values: string[], value: string): string[] {
  const next = normalize(value);
  if (!next) return normalizeSelections(values);
  const exists = values.some((item) => normalize(item).toLocaleLowerCase('en') === next.toLocaleLowerCase('en'));
  return normalizeSelections(exists
    ? values.filter((item) => normalize(item).toLocaleLowerCase('en') !== next.toLocaleLowerCase('en'))
    : [...values, next]);
}

export function validProfileUrl(kind: 'github' | 'linkedin' | 'portfolio', value: string): boolean {
  if (!value.trim()) return true;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:') return false;
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    const parts = url.pathname.split('/').filter(Boolean);
    if (kind === 'github') return host === 'github.com' && parts.length === 1 && /^(?!.*--)[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/.test(parts[0]);
    if (kind === 'linkedin') return host === 'linkedin.com' && ['in', 'pub'].includes(parts[0] || '') && Boolean(parts[1]);
    return Boolean(url.hostname.includes('.') && !url.username && !url.password);
  } catch {
    return false;
  }
}
