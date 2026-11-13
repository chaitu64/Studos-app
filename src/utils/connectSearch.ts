export function matchesConnectSearch(text: string, tags: string[], term: string, filter: string): boolean {
  return (!term || text.toLowerCase().includes(term.toLowerCase())) && (filter === 'All' || tags.includes(filter));
}
