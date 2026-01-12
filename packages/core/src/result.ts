/**
 * Result型 - 失敗可能な操作の結果を表現
 *
 * @requirement REQ-NFR-006
 * @design DES-KATASHIRO-001 §2.2
 * @task TSK-001
 */

/**
 * 成功結果（メソッド付き）
 */
export interface Ok<T> {
  readonly _tag: 'Ok';
  readonly value: T;
  isOk(): boolean;
  isErr(): boolean;
}

/**
 * 失敗結果（メソッド付き）
 */
export interface Err<E> {
  readonly _tag: 'Err';
  readonly error: E;
  isOk(): boolean;
  isErr(): boolean;
}

/**
 * Result型 - 成功または失敗を表現
 */
export type Result<T, E> = Ok<T> | Err<E>;

/**
 * 成功結果を作成（メソッド付き）
 */
export function ok<T>(value: T): Ok<T> {
  return { 
    _tag: 'Ok', 
    value,
    isOk: () => true,
    isErr: () => false,
  };
}

/**
 * 失敗結果を作成（メソッド付き）
 */
export function err<E>(error: E): Err<E> {
  return { 
    _tag: 'Err', 
    error,
    isOk: () => false,
    isErr: () => true,
  };
}

/**
 * 成功かどうかを判定（関数版）
 */
export function isOk<T, E>(result: Result<T, E>): result is Ok<T> {
  return result._tag === 'Ok';
}

/**
 * 失敗かどうかを判定（関数版）
 */
export function isErr<T, E>(result: Result<T, E>): result is Err<E> {
  return result._tag === 'Err';
}
