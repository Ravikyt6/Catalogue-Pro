export function normalizeSku(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function itemMatchesSearch(itemName: string, query: string): boolean {
  if (!query.trim()) return true;
  return itemName.toLowerCase().includes(query.trim().toLowerCase());
}
