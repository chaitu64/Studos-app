import type { StudyResource } from '../types';

export function appendUniqueResources(current: StudyResource[], incoming: StudyResource[]): StudyResource[] {
  const existingIds = new Set(current.map((item) => item.id));
  return [...current, ...incoming.filter((item) => !existingIds.has(item.id) && existingIds.add(item.id))];
}
