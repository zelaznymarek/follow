import type { ShoppingList } from '@/lib/shopping-lists';

/**
 * A list's creation date as day and short month ("20 Nov" in en-GB), with the year only when it is
 * not the current year.
 */
export function formatListDate(createdAt: string, locale?: string): string {
  const date = new Date(createdAt);
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: sameYear ? undefined : 'numeric',
  }).format(date);
}

/**
 * What a list is called on every screen: its trimmed name, or its creation date when it has none.
 * A whitespace-only name counts as none (the database accepts one written directly over REST).
 */
export function listTitle(list: ShoppingList, locale?: string): string {
  return list.name?.trim() || formatListDate(list.createdAt, locale);
}
