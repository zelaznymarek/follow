import type { PostgrestSingleResponse } from '@supabase/supabase-js';

import { LOAD_TIMEOUT_MS, run } from '@/lib/request';

type Response = PostgrestSingleResponse<unknown>;

function answer(response: unknown): () => PromiseLike<Response> {
  return () => Promise.resolve(response as Response);
}

const OFFLINE_RESPONSE = {
  data: null,
  error: { message: 'TypeError: Network request failed', details: '', hint: '', code: '' },
  status: 0,
};

let warn: jest.SpyInstance;

beforeEach(() => {
  warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  warn.mockRestore();
});

describe('run', () => {
  test('maps the data of a successful response', async () => {
    const result = await run(
      'tag',
      'load',
      answer({ data: [1, 2], error: null, status: 200 }),
      (data) => (data as number[]).map((n) => n * 10)
    );

    expect(result).toEqual({ ok: true, data: [10, 20] });
    expect(warn).not.toHaveBeenCalled();
  });

  test('a status 0 response is offline', async () => {
    expect(await run('tag', 'load', answer(OFFLINE_RESPONSE), () => null)).toEqual({
      ok: false,
      reason: 'offline',
    });
    expect(warn).not.toHaveBeenCalled();
  });

  test('an error response is an error and is logged with the tag and action', async () => {
    const error = { message: 'permission denied for table stores', code: '42501' };

    const result = await run('tag', 'load', answer({ data: null, error, status: 403 }), () => null);

    expect(result).toEqual({ ok: false, reason: 'error' });
    expect(warn).toHaveBeenCalledWith('[tag] load failed', error);
  });

  test('a thrown error is logged and reported as error', async () => {
    const result = await run(
      'tag',
      'load',
      () => {
        throw new TypeError('boom');
      },
      () => null
    );

    expect(result).toEqual({ ok: false, reason: 'error' });
    expect(warn).toHaveBeenCalledTimes(1);
  });

  test('an error thrown by map is reported as error', async () => {
    const result = await run(
      'tag',
      'load',
      answer({ data: null, error: null, status: 200 }),
      () => {
        throw new Error('bad row');
      }
    );

    expect(result).toEqual({ ok: false, reason: 'error' });
    expect(warn).toHaveBeenCalledTimes(1);
  });

  test('a unique violation (23505) is duplicate and is not logged', async () => {
    const error = {
      message: 'duplicate key value violates unique constraint "zones_store_id_name_key"',
      code: '23505',
    };

    const result = await run('tag', 'add', answer({ data: null, error, status: 409 }), () => null);

    expect(result).toEqual({ ok: false, reason: 'duplicate' });
    expect(warn).not.toHaveBeenCalled();
  });

  describe('when the server does not answer in time', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('resolves offline after the load timeout', async () => {
      const pending = run(
        'tag',
        'load',
        () => new Promise<Response>(() => {}),
        () => null
      );

      jest.advanceTimersByTime(LOAD_TIMEOUT_MS);

      expect(await pending).toEqual({ ok: false, reason: 'offline' });
      expect(warn).not.toHaveBeenCalled();
    });
  });
});
