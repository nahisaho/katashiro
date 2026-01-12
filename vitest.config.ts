import { defineConfig } from 'vitest/config';

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
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
    },
    testTimeout: 10000,
    hookTimeout: 10000,
  },
});
