import { describe, it, expect } from 'vitest';
import { RawTextProcessor, TypopoConfig } from '../../processors/text-processor';
import { applyReplacements } from '../../processors/text-utils';

const defaultConfig: TypopoConfig = {
	removeLines: false,
};

describe('RawTextProcessor - Assertion Tests (Key:Value Format)', () => {
	const processor = new RawTextProcessor();

	/**
	 * Test cases in key:value format
	 * Key = input text
	 * Value = expected output text after typopo processing
	 *
	 * RawTextProcessor applies typopo to entire text without structure awareness
	 */
	describe('Quote conversion (SHOULD change)', () => {
		const testCases: Record<string, string> = {
      // Basic quote conversion
      '"hello"': "“hello”",
      "\"outer 'inner' outer\"": "“outer ‘inner’ outer”",
    };

		for (const [input, expected] of Object.entries(testCases)) {
			it(`should convert: ${input}`, () => {
				const replacements = processor.process(input, 'en-us', defaultConfig);
				const result = applyReplacements(input, replacements);
				expect(result).toBe(expected);
			});
		}
	});



	describe('Empty and whitespace handling', () => {
		it('should handle empty string', () => {
			const replacements = processor.process('', 'en-us', defaultConfig);
			expect(replacements).toEqual([]);
		});

		it('should handle only whitespace', () => {
			const replacements = processor.process('   \n\n   ', 'en-us', defaultConfig);
			// Typopo might or might not make changes, just verify it doesn't crash
			expect(Array.isArray(replacements)).toBe(true);
		});

		it('should handle single character', () => {
			const replacements = processor.process('a', 'en-us', defaultConfig);
			expect(Array.isArray(replacements)).toBe(true);
		});
	});
});


describe('RawTextProcessor - shouldProcess', () => {
	const processor = new RawTextProcessor();

	it('should always return true (fallback processor)', () => {
		// RawTextProcessor is a fallback and should always match
		const mockDocument = { languageId: 'plaintext' } as any;
		expect(processor.shouldProcess(mockDocument, {})).toBe(true);

		const mdDocument = { languageId: 'markdown' } as any;
		expect(processor.shouldProcess(mdDocument, {})).toBe(true);

		const anyDocument = { languageId: 'anything' } as any;
		expect(processor.shouldProcess(anyDocument, {})).toBe(true);
	});
});
