import {
  addZone,
  createStore,
  deleteZone,
  fetchStore,
  fetchZone,
  moveZone,
  renameStore,
  renameZone,
} from '@/lib/store';

type Response = { data: unknown; error: unknown; status: number };

/** A postgrest-like query builder: every method chains, and awaiting it yields `settled`. */
function fakeQuery(settled: Promise<Response>) {
  const calls: { method: string; args: unknown[] }[] = [];
  const builder: Record<string, unknown> = {
    // biome-ignore lint/suspicious/noThenProperty: the builder is awaited like postgrest-js's.
    then: (resolve: (value: Response) => unknown, reject: (reason: unknown) => unknown) =>
      settled.then(resolve, reject),
  };
  const methods = [
    'select',
    'insert',
    'update',
    'delete',
    'eq',
    'order',
    'single',
    'maybeSingle',
    'retry',
  ];
  for (const method of methods) {
    builder[method] = (...args: unknown[]) => {
      calls.push({ method, args });
      return builder;
    };
  }
  return { builder, calls };
}

let query: ReturnType<typeof fakeQuery>;
const mockFrom = jest.fn();
const mockRpc = jest.fn();

jest.mock('@/lib/supabase', () => ({
  getSupabase: () => ({ from: mockFrom, rpc: mockRpc }),
}));

function respond(response: Response) {
  query = fakeQuery(Promise.resolve(response));
  mockFrom.mockReturnValue(query.builder);
  mockRpc.mockReturnValue(query.builder);
}

function argsOf(method: string) {
  return query.calls.filter((call) => call.method === method).map((call) => call.args);
}

const ZONE = { id: 'zone-1', name: 'Dairy', position: 1 };
const OFFLINE_RESPONSE = {
  data: null,
  error: { message: 'TypeError: Network request failed', details: '', hint: '', code: '' },
  status: 0,
};
const DUPLICATE_RESPONSE = {
  data: null,
  error: {
    message: 'duplicate key value violates unique constraint "zones_store_id_name_key"',
    code: '23505',
  },
  status: 409,
};

let warn: jest.SpyInstance;

beforeEach(() => {
  mockFrom.mockReset();
  mockRpc.mockReset();
  warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  warn.mockRestore();
});

describe('fetchStore', () => {
  test('selects the store with its zones ordered by position', async () => {
    respond({
      data: {
        id: 'store-1',
        name: 'Corner shop',
        zones: [ZONE, { id: 'zone-2', name: 'Bakery', position: 2 }],
      },
      error: null,
      status: 200,
    });

    const result = await fetchStore();

    expect(mockFrom).toHaveBeenCalledWith('stores');
    expect(argsOf('select')).toEqual([['id, name, zones(id, name, position)']]);
    expect(argsOf('order')).toEqual([['position', { referencedTable: 'zones' }]]);
    expect(argsOf('maybeSingle')).toHaveLength(1);
    expect(argsOf('retry')).toEqual([[false]]);
    expect(result).toEqual({
      ok: true,
      data: {
        id: 'store-1',
        name: 'Corner shop',
        zones: [ZONE, { id: 'zone-2', name: 'Bakery', position: 2 }],
      },
    });
  });

  test('returns null when the user has no store', async () => {
    respond({ data: null, error: null, status: 200 });

    expect(await fetchStore()).toEqual({ ok: true, data: null });
  });

  test('a status 0 response is offline', async () => {
    respond(OFFLINE_RESPONSE);

    expect(await fetchStore()).toEqual({ ok: false, reason: 'offline' });
  });
});

describe('fetchZone', () => {
  test('loads one zone by id', async () => {
    respond({ data: ZONE, error: null, status: 200 });

    const result = await fetchZone('zone-1');

    expect(mockFrom).toHaveBeenCalledWith('zones');
    expect(argsOf('eq')).toEqual([['id', 'zone-1']]);
    expect(argsOf('maybeSingle')).toHaveLength(1);
    expect(argsOf('retry')).toEqual([[false]]);
    expect(result).toEqual({ ok: true, data: ZONE });
  });

  test('returns null when the zone does not exist', async () => {
    respond({ data: null, error: null, status: 200 });

    expect(await fetchZone('missing')).toEqual({ ok: true, data: null });
  });
});

describe('createStore', () => {
  test('sends only the trimmed name', async () => {
    respond({ data: { id: 'store-1', name: 'Corner shop' }, error: null, status: 201 });

    const result = await createStore('  Corner shop  ');

    expect(mockFrom).toHaveBeenCalledWith('stores');
    expect(argsOf('insert')).toEqual([[{ name: 'Corner shop' }]]);
    expect(result).toEqual({ ok: true, data: { id: 'store-1', name: 'Corner shop' } });
  });

  test('a second store is a duplicate', async () => {
    respond({ ...DUPLICATE_RESPONSE, error: { message: 'stores_user_id_key', code: '23505' } });

    expect(await createStore('Corner shop')).toEqual({ ok: false, reason: 'duplicate' });
  });
});

describe('renameStore', () => {
  test('updates only the trimmed name of that store', async () => {
    respond({ data: { id: 'store-1', name: 'Market' }, error: null, status: 200 });

    const result = await renameStore('store-1', ' Market ');

    expect(argsOf('update')).toEqual([[{ name: 'Market' }]]);
    expect(argsOf('eq')).toEqual([['id', 'store-1']]);
    expect(result).toEqual({ ok: true, data: { id: 'store-1', name: 'Market' } });
  });
});

describe('addZone', () => {
  test('sends the store and the trimmed name, never user_id or position', async () => {
    respond({ data: ZONE, error: null, status: 201 });

    const result = await addZone('store-1', '  Dairy ');

    expect(mockFrom).toHaveBeenCalledWith('zones');
    expect(argsOf('insert')).toEqual([[{ store_id: 'store-1', name: 'Dairy' }]]);
    expect(result).toEqual({ ok: true, data: ZONE });
  });

  test('a name already in the store is a duplicate and is not logged', async () => {
    respond(DUPLICATE_RESPONSE);

    expect(await addZone('store-1', 'dairy')).toEqual({ ok: false, reason: 'duplicate' });
    expect(warn).not.toHaveBeenCalled();
  });

  test('offline returns the offline reason', async () => {
    respond(OFFLINE_RESPONSE);

    expect(await addZone('store-1', 'Dairy')).toEqual({ ok: false, reason: 'offline' });
  });
});

describe('renameZone', () => {
  test('updates only the trimmed name of that zone', async () => {
    respond({ data: { ...ZONE, name: 'Milk' }, error: null, status: 200 });

    const result = await renameZone('zone-1', ' Milk ');

    expect(argsOf('update')).toEqual([[{ name: 'Milk' }]]);
    expect(argsOf('eq')).toEqual([['id', 'zone-1']]);
    expect(result).toEqual({ ok: true, data: { ...ZONE, name: 'Milk' } });
  });

  test('a name already in the store is a duplicate', async () => {
    respond(DUPLICATE_RESPONSE);

    expect(await renameZone('zone-1', 'Bakery')).toEqual({ ok: false, reason: 'duplicate' });
  });

  test('offline returns the offline reason', async () => {
    respond(OFFLINE_RESPONSE);

    expect(await renameZone('zone-1', 'Milk')).toEqual({ ok: false, reason: 'offline' });
  });
});

describe('deleteZone', () => {
  test('deletes by id', async () => {
    respond({ data: null, error: null, status: 204 });

    const result = await deleteZone('zone-1');

    expect(mockFrom).toHaveBeenCalledWith('zones');
    expect(argsOf('delete')).toHaveLength(1);
    expect(argsOf('eq')).toEqual([['id', 'zone-1']]);
    expect(result).toEqual({ ok: true, data: undefined });
  });
});

describe('moveZone', () => {
  test('calls move_zone with the zone and the direction', async () => {
    respond({ data: null, error: null, status: 204 });

    const result = await moveZone('zone-1', 'up');

    expect(mockRpc).toHaveBeenCalledWith('move_zone', { p_zone_id: 'zone-1', p_direction: 'up' });
    expect(mockFrom).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: true, data: undefined });
  });

  test('passes the down direction through', async () => {
    respond({ data: null, error: null, status: 204 });

    await moveZone('zone-2', 'down');

    expect(mockRpc).toHaveBeenCalledWith('move_zone', { p_zone_id: 'zone-2', p_direction: 'down' });
  });

  test('a zone that is gone is an error', async () => {
    respond({
      data: null,
      error: { message: 'Zone not found: zone-1', code: 'PT404' },
      status: 404,
    });

    expect(await moveZone('zone-1', 'down')).toEqual({ ok: false, reason: 'error' });
    expect(warn).toHaveBeenCalledTimes(1);
  });

  test('offline returns the offline reason', async () => {
    respond(OFFLINE_RESPONSE);

    expect(await moveZone('zone-1', 'down')).toEqual({ ok: false, reason: 'offline' });
  });
});
