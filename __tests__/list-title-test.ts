import { listTitle } from '@/lib/list-title';

function list(name: string | null, createdAt: string) {
  return { id: 'list-1', name, createdAt };
}

beforeEach(() => {
  jest.useFakeTimers({ now: new Date('2026-12-01T12:00:00Z') });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('listTitle', () => {
  test('a named list is called by its trimmed name', () => {
    expect(listTitle(list('  Weekend  ', '2026-11-20T12:00:00Z'), 'en-GB')).toBe('Weekend');
  });

  test('an unnamed list from this year gets day and short month', () => {
    expect(listTitle(list(null, '2026-11-20T12:00:00Z'), 'en-GB')).toBe('20 Nov');
  });

  test('a whitespace-only name counts as unnamed', () => {
    expect(listTitle(list('   ', '2026-11-20T12:00:00Z'), 'en-GB')).toBe('20 Nov');
  });

  test('an unnamed list from another year includes the year', () => {
    expect(listTitle(list(null, '2025-11-20T12:00:00Z'), 'en-GB')).toBe('20 Nov 2025');
  });
});
