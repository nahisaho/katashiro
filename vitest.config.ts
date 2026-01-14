import { defineConfig } from 'vitest/config';

// 環境変数からタイムアウト設定を取得
const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
const testTimeout = isCI ? 30000 : 10000;
const hookTimeout = isCI ? 30000 : 10000;

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/*/tests/**/*.{test,spec}.ts'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['packages/*/src/**/*.ts'],
      exclude: [
        'packages/*/src/**/*.d.ts',
        'packages/*/src/**/index.ts',
        'packages/*/src/**/types.ts',
        // CLI entrypoints (difficult to unit test)
        'packages/katashiro/src/cli.ts',
        'packages/mcp-server/src/cli.ts',
        // VS Code extension (requires vscode mock)
        'packages/vscode-extension/src/extension.ts',
        'packages/vscode-extension/src/katashiro-extension.ts',
        'packages/vscode-extension/src/commands/command-manager.ts',
        // External dependencies (require integration tests)
        'packages/collector/src/document/parsers/*.ts',
        'packages/collector/src/browser/*.ts',
        'packages/analyzer/src/interpreter/*.ts',
        'packages/core/src/research/agents/*.ts',
        // Testing utilities (test code itself)
        'packages/core/src/testing/*.ts',
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
    },
    testTimeout,
    hookTimeout,
    // 環境変数をテストに渡す
    env: {
      MOCK_MODE: isCI ? 'true' : process.env.MOCK_MODE ?? '',
      CI: isCI ? 'true' : '',
    },
  },
});
