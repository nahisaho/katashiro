/**
 * @fileoverview Semaphoreモジュールのテスト
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Semaphore, createSemaphore, SemaphoreAcquisitionError, SemaphoreState } from '../../src/parallel/semaphore';

describe('Semaphore', () => {
  let semaphore: Semaphore;

  beforeEach(() => {
    vi.useFakeTimers();
    semaphore = createSemaphore({ maxConcurrency: 3 });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('createSemaphore', () => {
    it('デフォルト設定でSemaphoreを作成する', () => {
      const sem = createSemaphore();
      const state = sem.getState();
      expect(state.maxConcurrency).toBe(5);
      expect(state.available).toBe(5);
    });

    it('カスタム設定でSemaphoreを作成する', () => {
      const sem = createSemaphore({
        maxConcurrency: 10,
        acquireTimeoutMs: 60000,
        fair: false,
      });
      const state = sem.getState();
      expect(state.maxConcurrency).toBe(10);
    });
  });

  describe('acquire / release', () => {
    it('権利を獲得して解放する', async () => {
      const state1 = semaphore.getState();
      expect(state1.available).toBe(3);

      await semaphore.acquire();
      const state2 = semaphore.getState();
      expect(state2.available).toBe(2);

      semaphore.release();
      const state3 = semaphore.getState();
      expect(state3.available).toBe(3);
    });

    it('最大数まで獲得できる', async () => {
      await semaphore.acquire();
      await semaphore.acquire();
      await semaphore.acquire();

      const state = semaphore.getState();
      expect(state.available).toBe(0);
    });

    it('解放数が取得数を超えない', async () => {
      await semaphore.acquire();
      semaphore.release();
      semaphore.release(); // 余分な解放

      const state = semaphore.getState();
      expect(state.available).toBe(3); // 最大値を超えない
    });
  });

  describe('acquire with timeout', () => {
    it('タイムアウトでエラーをスローする', async () => {
      // 全て獲得
      await semaphore.acquire();
      await semaphore.acquire();
      await semaphore.acquire();

      // 短いタイムアウトで試行
      const acquirePromise = semaphore.acquire();
      
      // タイムアウト進める
      vi.advanceTimersByTime(35000);

      await expect(acquirePromise).rejects.toThrow(SemaphoreAcquisitionError);
    });
  });

  describe('tryAcquire', () => {
    it('利用可能な場合はtrueを返す', async () => {
      const result = await semaphore.tryAcquire();
      expect(result).toBe(true);
      expect(semaphore.getState().available).toBe(2);
    });

    it('利用不可の場合はfalseを返す', async () => {
      await semaphore.acquire();
      await semaphore.acquire();
      await semaphore.acquire();

      const result = await semaphore.tryAcquire();
      expect(result).toBe(false);
    });
  });

  describe('withSemaphore', () => {
    it('関数実行後に自動的に解放する', async () => {
      const result = await semaphore.withSemaphore(async () => {
        expect(semaphore.getState().available).toBe(2);
        return 'done';
      });

      expect(result).toBe('done');
      expect(semaphore.getState().available).toBe(3);
    });

    it('エラー発生時も解放する', async () => {
      await expect(
        semaphore.withSemaphore(async () => {
          throw new Error('test error');
        })
      ).rejects.toThrow('test error');

      expect(semaphore.getState().available).toBe(3);
    });
  });

  describe('withMultiple', () => {
    it('複数の権利を獲得して実行する', async () => {
      const result = await semaphore.withMultiple(2, async () => {
        expect(semaphore.getState().available).toBe(1);
        return 'multiple';
      });

      expect(result).toBe('multiple');
      expect(semaphore.getState().available).toBe(3);
    });
  });

  describe('drain', () => {
    it('全ての権利を獲得する', async () => {
      await semaphore.drain();
      expect(semaphore.getState().available).toBe(0);
    });
  });

  describe('resize', () => {
    it('最大並行数を変更する', async () => {
      semaphore.resize(10);
      expect(semaphore.getState().maxConcurrency).toBe(10);
      expect(semaphore.getState().available).toBe(10);
    });

    it('現在使用中の数以下にはリサイズできない', async () => {
      await semaphore.acquire();
      await semaphore.acquire();
      
      // 使用中は2なので、1にはリサイズできない
      semaphore.resize(1);
      expect(semaphore.getState().maxConcurrency).toBe(2);
    });
  });

  describe('getState', () => {
    it('現在の状態を返す', async () => {
      await semaphore.acquire();
      
      const state: SemaphoreState = semaphore.getState();
      expect(state.maxConcurrency).toBe(3);
      expect(state.available).toBe(2);
      expect(state.waiting).toBe(0);
      expect(typeof state.totalAcquired).toBe('number');
      expect(typeof state.totalReleased).toBe('number');
    });
  });
});
