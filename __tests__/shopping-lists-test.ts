import { createList, deleteList, fetchList, fetchLists } from '@/lib/shopping-lists';

type Response = { data: unknown; error: unknown; status: number };

/** A postgrest-like query builder: every method chains, and awaiting it yields `response`. */
function fakeQuery(response: Response) {
  const calls: { method: string; args: unknown[] }[] = [];
  const builder: Record<string, unknown> = {
    // biome-ignore lint/suspicious/noThenProperty: the builder is awaited like postgrest-js's.
    then: (resolve: (value: Response) => unknown, reject: (reason: unknown) => unknown) =>
      Promise.resolve(response).then(resolve, reject),
  };
  for (const method of ['select', 'insert', 'delete', 'eq', 'order', 'single', 'maybeSingle']) {
    builder[method] = (...args: unknown[]) => {
      calls.push({ method, args });
      return builder;
    };
  }
  return { builder, calls };
}

let query: ReturnType<typeof fakeQuery>;
const mockFrom = jest.fn();

jest.mock('@/lib/supabase', () => ({
  getSupabase: () => ({ from: mockFrom }),
}));

function respond(response: Response) {
  query = fakeQuery(response);
  mockFrom.mockReturnValue(query.builder);
}

function argsOf(method: string) {
  return query.calls.filter((call) => call.method === method).map((call) => call.args);
}

const ROW = { id: 'list-1', name: 'Weekend', created_at: '2026-11-20T10:00:00Z' };
const OFFLINE_RESPONSE = {
  data: null,
  error: { message: 'TypeError: Network request failed', details: '', hint: '', code: '' },
  status: 0,
};

let warn: jest.SpyInstance;

beforeEach(() => {
  mockFrom.mockReset();
  warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  warn.mockRestore();
});

describe('fetchLists', () => {
  test('orders newest first and maps rows', async () => {
    respond({ data: [ROW], error: null, status: 200 });

    const result = await fetchLists();

    expect(mockFrom).toHaveBeenCalledWith('shopping_lists');
    expect(argsOf('order')).toEqual([
      ['created_at', { ascending: false }],
      ['id', { ascending: false }],
    ]);
    expect(result).toEqual({
      ok: true,
      data: [{ id: 'list-1', name: 'Weekend', createdAt: '2026-11-20T10:00:00Z' }],
    });
  });

  test('a status 0 response is offline', async () => {
    respond(OFFLINE_RESPONSE);

    expect(await fetchLists()).toEqual({ ok: false, reason: 'offline' });
    expect(warn).not.toHaveBeenCalled();
  });

  test('a thrown fetch error is offline', async () => {
    mockFrom.mockImplementation(() => {
      throw new TypeError('Network request failed');
    });

    expect(await fetchLists()).toEqual({ ok: false, reason: 'offline' });
  });

  test('a permission error is an error and is logged', async () => {
    respond({
      data: null,
      error: { message: 'permission denied for table shopping_lists', code: '42501' },
      status: 403,
    });

    expect(await fetchLists()).toEqual({ ok: false, reason: 'error' });
    expect(warn).toHaveBeenCalledTimes(1);
  });
});

describe('fetchList', () => {
  test('returns null when the list does not exist', async () => {
    respond({ data: null, error: null, status: 200 });

    const result = await fetchList('missing');

    expect(argsOf('eq')).toEqual([['id', 'missing']]);
    expect(result).toEqual({ ok: true, data: null });
  });
});

describe('createList', () => {
  test('a blank name is sent as null', async () => {
    respond({ data: { ...ROW, name: null }, error: null, status: 201 });

    await createList('  ');

    expect(argsOf('insert')).toEqual([[{ name: null }]]);
  });

  test('a name is sent trimmed', async () => {
    respond({ data: ROW, error: null, status: 201 });

    const result = await createList('  Weekend  ');

    expect(argsOf('insert')).toEqual([[{ name: 'Weekend' }]]);
    expect(result).toEqual({
      ok: true,
      data: { id: 'list-1', name: 'Weekend', createdAt: '2026-11-20T10:00:00Z' },
    });
  });

  test('offline returns the offline reason', async () => {
    respond(OFFLINE_RESPONSE);

    expect(await createList('Weekend')).toEqual({ ok: false, reason: 'offline' });
  });
});

describe('deleteList', () => {
  test('deletes by id', async () => {
    respond({ data: null, error: null, status: 204 });

    const result = await deleteList('list-1');

    expect(argsOf('delete')).toHaveLength(1);
    expect(argsOf('eq')).toEqual([['id', 'list-1']]);
    expect(result).toEqual({ ok: true, data: null });
  });
});
