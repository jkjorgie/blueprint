// Filters an analyst's user list by name or email, case-insensitively.
// Pure, so the rule is unit-tested without a database.
export function filterUsers<T extends { name: string; email: string }>(users: T[], query: string): T[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return users;
  return users.filter((u) => u.name.toLowerCase().includes(needle) || u.email.toLowerCase().includes(needle));
}

export function describeUserMatches(count: number, query: string): string {
  if (count === 0) return `No users match '${query}'`;
  if (count === 1) return `1 user matches '${query}'`;
  return `${count} users match '${query}'`;
}
