# @nahisaho/katashiro-sandbox

コード実行サンドボックスパッケージ。Docker/ローカル環境でbash, Python, JavaScript/TypeScriptを安全に実行します。

## 概要

KATASHIRO v0.4.0で追加された、コード実行のための隔離環境を提供するパッケージです。

### 主な機能

- **Docker実行**: Dockerコンテナ内での安全なコード実行
- **ローカル実行**: 開発/テスト用のローカル環境実行
- **複数言語サポート**: bash, Python, JavaScript, TypeScript
- **リソース制限**: メモリ、CPU、タイムアウト制限
- **セキュリティポリシー**: システムコール制限、ケーパビリティ削除

## インストール

```bash
npm install @nahisaho/katashiro-sandbox
```

## 基本的な使い方

### 簡易関数

```typescript
import { executePython, executeBash, executeJavaScript } from '@nahisaho/katashiro-sandbox';

// Pythonコード実行
const result = await executePython('print("Hello, World!")');
if (result.isOk()) {
  console.log(result.value.stdout); // "Hello, World!\n"
}

// Bashスクリプト実行
const bashResult = await executeBash('echo "Hello from bash"');

// JavaScript実行
const jsResult = await executeJavaScript('console.log(1 + 2)');
```

### SandboxFactoryを使用

```typescript
import { SandboxFactory } from '@nahisaho/katashiro-sandbox';

// Dockerサンドボックスを作成
const sandbox = SandboxFactory.create({ timeout: 60 }, 'docker');

// コード実行
const result = await sandbox.execute('print(sum(range(100)))', 'python');

// イベントリスナー
sandbox.on('execution:start', (event) => {
  console.log(`開始: ${event.requestId}`);
});

sandbox.on('execution:complete', (event) => {
  console.log(`完了: ${event.requestId}`);
});

// クリーンアップ
await sandbox.cleanup();
```

### 自動ランタイム検出

```typescript
import { SandboxFactory } from '@nahisaho/katashiro-sandbox';

// Dockerが利用可能ならDocker、そうでなければローカル実行
const sandbox = await SandboxFactory.createAuto({ timeout: 30 });
```

## 設定

### SandboxConfig

```typescript
interface SandboxConfig {
  runtime: 'docker' | 'local' | 'wasm';  // ランタイム
  timeout: number;           // タイムアウト（秒）
  memoryLimit: number;       // メモリ制限（バイト）
  cpuLimit: number;          // CPU制限（0.0-1.0）
  workingDir: string;        // 作業ディレクトリ
  networkEnabled: boolean;   // ネットワークアクセス
  tmpfsSize: number;         // 一時ファイルシステムサイズ
}
```

### デフォルト設定

```typescript
const DEFAULT_SANDBOX_CONFIG = {
  runtime: 'docker',
  timeout: 30,
  memoryLimit: 512 * 1024 * 1024,  // 512MB
  cpuLimit: 0.5,
  workingDir: '/workspace',
  networkEnabled: false,
  tmpfsSize: 64 * 1024 * 1024,  // 64MB
};
```

## Docker Executor

### 特徴

- **完全な隔離**: コンテナ内でコードを実行
- **リソース制限**: メモリ・CPU制限を強制
- **セキュリティ**: ケーパビリティ削除、seccompプロファイル
- **自動クリーンアップ**: 実行後にコンテナを自動削除

### 使用するDockerイメージ

| 言語 | デフォルトイメージ |
|------|-------------------|
| bash | alpine:3.19 |
| python | python:3.12-slim |
| javascript | node:22-slim |
| typescript | node:22-slim |

### カスタムイメージの使用

```typescript
import { DockerExecutor } from '@nahisaho/katashiro-sandbox';

const executor = new DockerExecutor(
  { timeout: 60 },
  {
    images: {
      bash: 'ubuntu:22.04',
      python: 'python:3.11-alpine',
      javascript: 'node:20-alpine',
      typescript: 'node:20-alpine',
    }
  }
);
```

## Local Executor

### 注意

Local Executorはホストシステムで直接コードを実行するため、**本番環境では使用しないでください**。開発とテスト目的専用です。

```typescript
import { LocalExecutor } from '@nahisaho/katashiro-sandbox';

const executor = new LocalExecutor({ timeout: 10 });
const result = await executor.execute('console.log("test")', 'javascript');
```

## セキュリティポリシー

```typescript
interface SecurityPolicy {
  blockedSyscalls: string[];    // ブロックするシステムコール
  readOnlyPaths: string[];      // 読み取り専用パス
  writablePaths: string[];      // 書き込み可能パス
  maxProcesses: number;         // 最大プロセス数
  maxOpenFiles: number;         // 最大ファイルディスクリプタ数
}
```

### デフォルトポリシー

```typescript
const DEFAULT_SECURITY_POLICY = {
  blockedSyscalls: ['ptrace', 'mount', 'umount', 'reboot', 'swapon', 'swapoff'],
  readOnlyPaths: ['/etc', '/usr', '/bin', '/lib'],
  writablePaths: ['/workspace', '/tmp'],
  maxProcesses: 10,
  maxOpenFiles: 100,
};
```

## イベント

```typescript
sandbox.on('execution:start', (event) => { ... });
sandbox.on('execution:output', (event) => { ... });
sandbox.on('execution:complete', (event) => { ... });
sandbox.on('execution:error', (event) => { ... });
sandbox.on('execution:timeout', (event) => { ... });
sandbox.on('container:create', (event) => { ... });
sandbox.on('container:start', (event) => { ... });
sandbox.on('container:stop', (event) => { ... });
sandbox.on('security:violation', (event) => { ... });
```

## ExecutionResult

```typescript
interface ExecutionResult {
  requestId: string;         // リクエストID
  status: ExecutionStatus;   // 'completed' | 'failed' | 'timeout' | ...
  exitCode: number;          // 終了コード
  stdout: string;            // 標準出力
  stderr: string;            // 標準エラー出力
  duration: number;          // 実行時間（ミリ秒）
  files: FileOutput[];       // 出力ファイル
  memoryUsed?: number;       // メモリ使用量
  cpuTime?: number;          // CPU使用時間
  error?: ExecutionError;    // エラー詳細
  completedAt: string;       // 完了日時
}
```

## ライセンス

MIT
