export function mergeCloudAndLocal<T extends { id: string }>(cloud: T[], local: T[]): T[] {
  const merged = new Map(cloud.map((record) => [record.id, record]));
  for (const record of local) if (!merged.has(record.id)) merged.set(record.id, record);
  return [...merged.values()];
}
