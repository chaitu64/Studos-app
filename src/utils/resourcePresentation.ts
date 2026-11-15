const recognizedCollegeNames: Record<string, string> = {
  'vasireddy venkatadri institute of technology': 'VVIT',
  vvit: 'VVIT',
  vvitu: 'VVIT',
};

export function displayCollegeName(college: string): string {
  const trimmed = college.trim();
  return recognizedCollegeNames[trimmed.toLocaleLowerCase('en-IN')] || trimmed;
}

export function compactResourceMetadata(college?: string | null, regulation?: string | null, fileSizeMb?: number | null): string {
  const size = fileSizeMb != null ? `${fileSizeMb.toFixed(1)} MB` : null;
  return [college?.trim() ? displayCollegeName(college) : null, regulation?.trim() || null, size].filter(Boolean).join(' · ');
}
