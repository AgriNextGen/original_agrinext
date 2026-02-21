export type RecentAccount = { email: string; avatarUrl?: string; lastUsedAt: string };
const KEY = "agrinext_recent_google_accounts";

export function getRecentAccounts(): RecentAccount[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]") as RecentAccount[];
  } catch {
    return [];
  }
}

export function pushRecentAccount(acc: RecentAccount) {
  const list = getRecentAccounts().filter((a) => a.email !== acc.email);
  list.unshift(acc);
  localStorage.setItem(KEY, JSON.stringify(list.slice(0, 5)));
}

