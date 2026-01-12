/**
 * KatashiroError テスト
 *
 * @design DES-COMMON-001
 * @task TASK-000-5
 */

import { describe, it, expect } from 'vitest';
import {
  KatashiroError,
  parseErrorCode,
  ErrorCodes,
  withRetry,
  retry,
  calculateBackoffDelay,
  DEFAULT_RETRY_CONFIG,
  ok,
  err,
} from '../../src/index.js';

describe('parseErrorCode', () => {
  it('正常なエラーコードをパースできる', () => {
    const result = parseErrorCode('COL_NTF_001');
    expect(result).toEqual({
      code: 'COL_NTF_001',
      module: 'COL',
      category: 'NTF',
      number: '001',
    });
  });

  it('全モジュールをパースできる', () => {
    const modules = ['COR', 'COL', 'ANA', 'MED', 'GEN', 'KNW'];
    for (const mod of modules) {
      const result = parseErrorCode(`${mod}_VAL_001`);
      expect(result.module).toBe(mod);
    }
  });

  it('全カテゴリをパースできる', () => {
    const categories = ['VAL', 'AUT', 'PRM', 'NTF', 'CNF', 'NET', 'TMO', 'SEC', 'SYS', 'EXT'];
    for (const cat of categories) {
      const result = parseErrorCode(`COR_${cat}_001`);
      expect(result.category).toBe(cat);
    }
  });

  it('無効なフォーマットでエラーをスロー', () => {
    expect(() => parseErrorCode('INVALID')).toThrow('Invalid error code format');
    expect(() => parseErrorCode('COL_NTF')).toThrow('Invalid error code format');
    expect(() => parseErrorCode('COL_NTF_001_EXTRA')).toThrow('Invalid error code format');
  });

  it('無効なモジュールでエラーをスロー', () => {
    expect(() => parseErrorCode('XXX_VAL_001')).toThrow('Invalid module');
  });

  it('無効なカテゴリでエラーをスロー', () => {
    expect(() => parseErrorCode('COR_XXX_001')).toThrow('Invalid category');
  });

  it('無効な番号でエラーをスロー', () => {
    expect(() => parseErrorCode('COR_VAL_1')).toThrow('Invalid number');
    expect(() => parseErrorCode('COR_VAL_1000')).toThrow('Invalid number');
    expect(() => parseErrorCode('COR_VAL_ABC')).toThrow('Invalid number');
  });
});

describe('KatashiroError', () => {
  it('基本的なエラーを作成できる', () => {
    const error = new KatashiroError(ErrorCodes.FILE_NOT_FOUND, 'File not found: test.pdf');

    expect(error.name).toBe('KatashiroError');
    expect(error.message).toBe('File not found: test.pdf');
    expect(error.errorCode).toBe('COL_NTF_001');
    expect(error.module).toBe('COL');
    expect(error.category).toBe('NTF');
    expect(error.retryable).toBe(false); // NTFはリトライ不可
    expect(error.timestamp).toBeInstanceOf(Date);
  });

  it('詳細情報付きエラーを作成できる', () => {
    const error = new KatashiroError(ErrorCodes.SCRAPE_FAILED, 'Scrape failed', {
      details: { url: 'https://example.com', statusCode: 403 },
      retryable: true,
    });

    expect(error.details).toEqual({ url: 'https://example.com', statusCode: 403 });
    expect(error.retryable).toBe(true);
  });

  it('原因エラー付きで作成できる', () => {
    const cause = new Error('Network timeout');
    const error = new KatashiroError(ErrorCodes.CONNECTION_FAILED, 'Connection failed', {
      cause,
    });

    expect(error.cause).toBe(cause);
  });

  it('NETカテゴリはデフォルトでリトライ可能', () => {
    const error = new KatashiroError(ErrorCodes.SCRAPE_FAILED, 'Scrape failed');
    expect(error.retryable).toBe(true);
  });

  it('TMOカテゴリはデフォルトでリトライ可能', () => {
    const error = new KatashiroError(ErrorCodes.OPERATION_TIMEOUT, 'Timeout');
    expect(error.retryable).toBe(true);
  });

  it('EXTカテゴリはデフォルトでリトライ可能', () => {
    const error = new KatashiroError(ErrorCodes.SEARCH_API_ERROR, 'API error');
    expect(error.retryable).toBe(true);
  });

  it('VALカテゴリはデフォルトでリトライ不可', () => {
    const error = new KatashiroError(ErrorCodes.INVALID_PARAMETER, 'Invalid param');
    expect(error.retryable).toBe(false);
  });

  it('toJSON()で正しくシリアライズできる', () => {
    const error = new KatashiroError(ErrorCodes.FILE_NOT_FOUND, 'Not found', {
      details: { path: '/test' },
    });
    const json = error.toJSON();

    expect(json.name).toBe('KatashiroError');
    expect(json.code).toBe('COL_NTF_001');
    expect(json.message).toBe('Not found');
    expect(json.details).toEqual({ path: '/test' });
    expect(json.retryable).toBe(false);
    expect(json.timestamp).toBeDefined();
  });

  it('toString()でフォーマットされる', () => {
    const error = new KatashiroError(ErrorCodes.FILE_NOT_FOUND, 'File not found');
    expect(error.toString()).toBe('[COL_NTF_001] File not found');
  });

  it('isKatashiroError()で判定できる', () => {
    const katashiroError = new KatashiroError(ErrorCodes.INTERNAL_ERROR, 'Error');
    const regularError = new Error('Regular error');

    expect(KatashiroError.isKatashiroError(katashiroError)).toBe(true);
    expect(KatashiroError.isKatashiroError(regularError)).toBe(false);
    expect(KatashiroError.isKatashiroError(null)).toBe(false);
    expect(KatashiroError.isKatashiroError('string')).toBe(false);
  });

  it('from()でErrorを変換できる', () => {
    const original = new Error('Original error');
    const converted = KatashiroError.from(original);

    expect(converted).toBeInstanceOf(KatashiroError);
    expect(converted.message).toBe('Original error');
    expect(converted.cause).toBe(original);
    expect(converted.errorCode).toBe('COR_SYS_001');
  });

  it('from()でKatashiroErrorはそのまま返す', () => {
    const original = new KatashiroError(ErrorCodes.FILE_NOT_FOUND, 'Not found');
    const result = KatashiroError.from(original);

    expect(result).toBe(original);
  });

  it('from()で文字列を変換できる', () => {
    const converted = KatashiroError.from('String error');
    expect(converted.message).toBe('String error');
  });
});

describe('ErrorCodes', () => {
  it('全てのエラーコードが正しいフォーマット', () => {
    for (const [, code] of Object.entries(ErrorCodes)) {
      expect(() => parseErrorCode(code)).not.toThrow();
    }
  });

  it('主要なエラーコードが定義されている', () => {
    expect(ErrorCodes.INVALID_PARAMETER).toBe('COR_VAL_001');
    expect(ErrorCodes.FILE_NOT_FOUND).toBe('COL_NTF_001');
    expect(ErrorCodes.SANDBOX_VIOLATION).toBe('ANA_SEC_001');
    expect(ErrorCodes.INVALID_PROMPT).toBe('MED_VAL_001');
  });
});

describe('calculateBackoffDelay', () => {
  it('指数バックオフで増加する', () => {
    const base = 1000;
    const max = 30000;

    // ジッターがあるので範囲でチェック
    const delay0 = calculateBackoffDelay(0, base, max);
    expect(delay0).toBeGreaterThanOrEqual(base);
    expect(delay0).toBeLessThanOrEqual(base * 1.3);

    const delay1 = calculateBackoffDelay(1, base, max);
    expect(delay1).toBeGreaterThanOrEqual(base * 2);
    expect(delay1).toBeLessThanOrEqual(base * 2 * 1.3);

    const delay2 = calculateBackoffDelay(2, base, max);
    expect(delay2).toBeGreaterThanOrEqual(base * 4);
    expect(delay2).toBeLessThanOrEqual(base * 4 * 1.3);
  });

  it('最大値を超えない', () => {
    const delay = calculateBackoffDelay(10, 1000, 5000);
    expect(delay).toBeLessThanOrEqual(5000);
  });
});

describe('withRetry', () => {
  it('成功時は1回で完了', async () => {
    let callCount = 0;
    const fn = async () => {
      callCount++;
      return ok('success');
    };

    const result = await withRetry(fn);
    expect(result._tag).toBe('Ok');
    if (result._tag === 'Ok') {
      expect(result.value).toBe('success');
    }
    expect(callCount).toBe(1);
  });

  it('リトライ可能なエラーでリトライする', async () => {
    let callCount = 0;
    const fn = async () => {
      callCount++;
      if (callCount < 3) {
        return err(new KatashiroError(ErrorCodes.SCRAPE_FAILED, 'Failed', { retryable: true }));
      }
      return ok('success');
    };

    const result = await withRetry(fn, { maxRetries: 3, baseDelayMs: 10, maxDelayMs: 100 });
    expect(result._tag).toBe('Ok');
    expect(callCount).toBe(3);
  });

  it('リトライ不可のエラーはリトライしない', async () => {
    let callCount = 0;
    const fn = async () => {
      callCount++;
      return err(new KatashiroError(ErrorCodes.INVALID_PARAMETER, 'Invalid', { retryable: false }));
    };

    const result = await withRetry(fn, { maxRetries: 3 });
    expect(result._tag).toBe('Err');
    expect(callCount).toBe(1);
  });

  it('最大リトライ回数後は失敗', async () => {
    let callCount = 0;
    const fn = async () => {
      callCount++;
      return err(new KatashiroError(ErrorCodes.SCRAPE_FAILED, 'Failed', { retryable: true }));
    };

    const result = await withRetry(fn, { maxRetries: 2, baseDelayMs: 10, maxDelayMs: 100 });
    expect(result._tag).toBe('Err');
    expect(callCount).toBe(3); // 初回 + 2回リトライ
  });

  it('コールバックが呼ばれる', async () => {
    let retryCount = 0;
    let successCalled = false;
    let callCount = 0;

    const fn = async () => {
      callCount++;
      if (callCount < 2) {
        return err(new KatashiroError(ErrorCodes.SCRAPE_FAILED, 'Failed', { retryable: true }));
      }
      return ok('success');
    };

    await withRetry(
      fn,
      { maxRetries: 3, baseDelayMs: 10, maxDelayMs: 100 },
      {
        onRetry: () => {
          retryCount++;
        },
        onSuccess: () => {
          successCalled = true;
        },
      }
    );

    expect(retryCount).toBe(1);
    expect(successCalled).toBe(true);
  });
});

describe('retry', () => {
  it('簡易リトライが動作する', async () => {
    let callCount = 0;
    const fn = async () => {
      callCount++;
      if (callCount < 2) {
        return err(new KatashiroError(ErrorCodes.CONNECTION_FAILED, 'Failed', { retryable: true }));
      }
      return ok('success');
    };

    const result = await retry(fn, 3);
    expect(result._tag).toBe('Ok');
    expect(callCount).toBe(2);
  });
});

describe('DEFAULT_RETRY_CONFIG', () => {
  it('デフォルト値が設定されている', () => {
    expect(DEFAULT_RETRY_CONFIG.maxRetries).toBe(3);
    expect(DEFAULT_RETRY_CONFIG.baseDelayMs).toBe(1000);
    expect(DEFAULT_RETRY_CONFIG.maxDelayMs).toBe(30000);
    expect(DEFAULT_RETRY_CONFIG.retryableCategories).toContain('NET');
    expect(DEFAULT_RETRY_CONFIG.retryableCategories).toContain('TMO');
    expect(DEFAULT_RETRY_CONFIG.retryableCategories).toContain('EXT');
  });
});
