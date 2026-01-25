import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/test/unit/**/*.test.ts'],
    exclude: ['node_modules', 'out', '.vscode-test', 'src/test/integration/**'],

    environment: 'node',

    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude:  ['node_modules/', 'out/', 'src/test/', '**/*.d.ts', '**/*.config.ts'],
    },

    globals: true,
  },
});
