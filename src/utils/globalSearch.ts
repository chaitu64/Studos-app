export function visibleSearchResultCount(selectedTab: string, counts: Record<string, number>, total: number): number {
  return selectedTab === 'All' ? total : counts[selectedTab] ?? 0;
}
