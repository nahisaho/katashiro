/**
 * Test Utilities - テスト共通ユーティリティ
 *
 * @requirement REQ-TEST-001
 * @description テスト環境の設定とモック管理
 */

/**
 * テスト環境設定
 */
export interface TestEnvironment {
  /** CI環境かどうか */
  isCI: boolean;
  /** モックモードかどうか */
  isMockMode: boolean;
  /** Ollama接続可能かどうか */
  isOllamaAvailable: boolean;
  /** テストタイムアウト設定 */
  timeouts: {
    unit: number;
    integration: number;
    e2e: number;
  };
}

/**
 * テスト環境を取得
 */
export function getTestEnvironment(): TestEnvironment {
  const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
  const isMockMode = process.env.MOCK_MODE === 'true' || process.env.USE_MOCK === 'true';

  return {
    isCI,
    isMockMode: isMockMode || isCI, // CI環境では自動的にモックモード
    isOllamaAvailable: !isCI && !isMockMode, // CI/モックモードでない場合のみ
    timeouts: {
      unit: 5000,
      integration: 30000,
      e2e: 60000,
    },
  };
}

/**
 * 外部サービス依存テストをスキップするかどうか
 */
export function shouldSkipExternalServices(): boolean {
  const env = getTestEnvironment();
  return env.isCI || env.isMockMode;
}

/**
 * Ollama依存テストをスキップするかどうか
 */
export function shouldSkipOllama(): boolean {
  return shouldSkipExternalServices();
}

/**
 * ネットワーク依存テストをスキップするかどうか
 */
export function shouldSkipNetwork(): boolean {
  const env = getTestEnvironment();
  return env.isCI || process.env.SKIP_NETWORK === 'true';
}

/**
 * 条件付きテストの設定オブジェクト
 */
export interface ConditionalTestOptions {
  skipIf: () => boolean;
  skipReason?: string;
}

/**
 * スキップ条件を評価（テストランナー非依存）
 * テストファイル内で使用:
 * @example
 * const skip = shouldSkipTest({ skipIf: shouldSkipOllama, skipReason: 'Ollama not available' });
 * const testFn = skip.shouldSkip ? it.skip : it;
 * testFn(skip.testName('should connect to Ollama'), async () => { ... });
 */
export function shouldSkipTest(
  options: ConditionalTestOptions,
): { shouldSkip: boolean; reason: string; testName: (name: string) => string } {
  const shouldSkip = options.skipIf();
  const reason = options.skipReason ?? 'skipped';

  return {
    shouldSkip,
    reason,
    testName: (name: string) => (shouldSkip ? `${name} (${reason})` : name),
  };
}

/**
 * Ollamaホスト取得（環境変数対応）
 */
export function getOllamaHost(): string {
  return process.env.OLLAMA_HOST ?? 'http://192.168.224.1:11434';
}

/**
 * Ollamaモデル取得（環境変数対応）
 */
export function getOllamaModel(): string {
  return process.env.OLLAMA_MODEL ?? 'qwen2.5:7b';
}

/**
 * Embeddingモデル取得（環境変数対応）
 */
export function getEmbeddingModel(): string {
  return process.env.EMBEDDING_MODEL ?? 'bge-m3';
}

/**
 * テストタイムアウト取得
 */
export function getTestTimeout(type: 'unit' | 'integration' | 'e2e' = 'unit'): number {
  const env = getTestEnvironment();
  return env.timeouts[type];
}

/**
 * 遅延実行（テスト用）
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * リトライ付き非同期実行
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    delay?: number;
    onRetry?: (error: Error, attempt: number) => void;
  } = {},
): Promise<T> {
  const { maxRetries = 3, delay: retryDelay = 1000, onRetry } = options;
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxRetries) {
        onRetry?.(lastError, attempt);
        await delay(retryDelay * attempt);
      }
    }
  }

  throw lastError;
}

/**
 * タイムアウト付き実行
 */
export async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  errorMessage = 'Operation timed out',
): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs),
    ),
  ]);
}
