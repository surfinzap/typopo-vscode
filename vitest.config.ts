import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		// Test file patterns
		include: ['src/test/**/*.test.ts'],
		exclude: ['node_modules', 'out', '.vscode-test'],

		// Environment
		environment: 'node',

		// Coverage configuration (optional)
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			exclude: [
				'node_modules/',
				'out/',
				'src/test/',
				'**/*.d.ts',
				'**/*.config.ts',
			],
		},

		// Test globals (optional - allows using describe/it without imports)
		globals: true,
	},
});
