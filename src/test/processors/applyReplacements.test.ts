import { describe, it, expect } from 'vitest';
import { applyReplacements } from '../../processors/text-utils';
import { TextReplacement } from '../../processors/text-processor';

describe.skip('applyReplacements', () => {
	describe('Single replacement', () => {
		it('should apply single replacement at beginning', () => {
			const text = '"hello" world';
			const replacements: TextReplacement[] = [
				{ offset: 0, length: 7, newText: '"hello"' }
			];

			const result = applyReplacements(text, replacements);
			expect(result).toBe('"hello" world');
		});

		it('should apply single replacement in middle', () => {
			const text = 'world "hello" there';
			const replacements: TextReplacement[] = [
				{ offset: 6, length: 7, newText: '"hello"' }
			];

			const result = applyReplacements(text, replacements);
			expect(result).toBe('world "hello" there');
		});

		it('should apply single replacement at end', () => {
			const text = 'hello "world"';
			const replacements: TextReplacement[] = [
				{ offset: 6, length: 7, newText: '"world"' }
			];

			const result = applyReplacements(text, replacements);
			expect(result).toBe('hello "world"');
		});
	});

	describe('Multiple replacements', () => {
		it('should apply multiple non-overlapping replacements', () => {
			const text = '"hello" and "world"';
			const replacements: TextReplacement[] = [
				{ offset: 0, length: 7, newText: '"hello"' },
				{ offset: 12, length: 7, newText: '"world"' }
			];

			const result = applyReplacements(text, replacements);
			expect(result).toBe('"hello" and "world"');
		});

		it('should apply replacements in correct order (offset-independent)', () => {
			const text = '"first" and "second" and "third"';
			const replacements: TextReplacement[] = [
				{ offset: 21, length: 7, newText: '"second"' },
				{ offset: 0, length: 7, newText: '"first"' },
				{ offset: 29, length: 7, newText: '"third"' }
			];

			const result = applyReplacements(text, replacements);
			expect(result).toBe('"first" and "second" and "third"');
		});

		it('should handle adjacent replacements', () => {
			const text = '"one""two""three"';
			const replacements: TextReplacement[] = [
				{ offset: 0, length: 5, newText: '"one"' },
				{ offset: 5, length: 5, newText: '"two"' },
				{ offset: 10, length: 7, newText: '"three"' }
			];

			const result = applyReplacements(text, replacements);
			expect(result).toBe('"one""two""three"');
		});
	});

	describe('Edge cases', () => {
		it('should handle empty replacements array', () => {
			const text = 'unchanged text';
			const replacements: TextReplacement[] = [];

			const result = applyReplacements(text, replacements);
			expect(result).toBe('unchanged text');
		});

		it('should handle empty text', () => {
			const text = '';
			const replacements: TextReplacement[] = [];

			const result = applyReplacements(text, replacements);
			expect(result).toBe('');
		});

		it('should handle replacement with different length', () => {
			const text = 'short long';
			const replacements: TextReplacement[] = [
				{ offset: 0, length: 5, newText: 'verylongword' }
			];

			const result = applyReplacements(text, replacements);
			expect(result).toBe('verylongword long');
		});

		it('should handle replacement that removes text', () => {
			const text = 'hello world';
			const replacements: TextReplacement[] = [
				{ offset: 5, length: 6, newText: '' }
			];

			const result = applyReplacements(text, replacements);
			expect(result).toBe('hello');
		});

		it('should handle replacement that inserts text (zero length)', () => {
			const text = 'helloworld';
			const replacements: TextReplacement[] = [
				{ offset: 5, length: 0, newText: ' ' }
			];

			const result = applyReplacements(text, replacements);
			expect(result).toBe('hello world');
		});
	});

	describe('Offset preservation', () => {
		it('should maintain correct offsets when applying multiple replacements', () => {
			// This tests that replacements are applied in reverse order
			// to preserve offsets
			const text = 'a b c d e';
			const replacements: TextReplacement[] = [
				{ offset: 0, length: 1, newText: 'AAA' }, // 'a' -> 'AAA'
				{ offset: 4, length: 1, newText: 'CCC' }, // 'c' -> 'CCC'
				{ offset: 8, length: 1, newText: 'EEE' }  // 'e' -> 'EEE'
			];

			const result = applyReplacements(text, replacements);
			expect(result).toBe('AAA b CCC d EEE');
		});

		it('should handle replacements with same offset but different lengths', () => {
			const text = 'hello world';
			const replacements: TextReplacement[] = [
				{ offset: 6, length: 5, newText: 'universe' }
			];

			const result = applyReplacements(text, replacements);
			expect(result).toBe('hello universe');
		});
	});

	describe('Real-world scenarios', () => {
		it('should handle typical quote replacement pattern', () => {
			const text = 'She said "hello" and he replied "goodbye".';
			const replacements: TextReplacement[] = [
				{ offset: 9, length: 7, newText: '"hello"' },
				{ offset: 32, length: 9, newText: '"goodbye"' }
			];

			const result = applyReplacements(text, replacements);
			expect(result).toBe('She said "hello" and he replied "goodbye".');
		});

		it('should handle ellipsis and quote replacements together', () => {
			const text = 'She said "wait..." and then "okay"';
			const replacements: TextReplacement[] = [
				{ offset: 9, length: 9, newText: '"wait…"' },
				{ offset: 28, length: 6, newText: '"okay"' }
			];

			const result = applyReplacements(text, replacements);
			expect(result).toBe('She said "wait…" and then "okay"');
		});

		it('should handle multiple typography fixes in one sentence', () => {
			const text = 'The "quote", the ellipsis..., and dash--all fixed.';
			const replacements: TextReplacement[] = [
				{ offset: 4, length: 7, newText: '"quote"' },
				{ offset: 25, length: 3, newText: '…' },
				{ offset: 38, length: 2, newText: '—' }
			];

			const result = applyReplacements(text, replacements);
			expect(result).toBe('The "quote", the ellipsis…, and dash—all fixed.');
		});
	});

	describe('Snapshot tests', () => {
		it('should handle complex multi-line text with many replacements', () => {
			const text = `Line 1 with "quotes" here.
Line 2 with "more quotes" and ellipsis...
Line 3 with ranges like 2020-2021.
Line 4 with "final quotes" and dash--here.`;

			const replacements: TextReplacement[] = [
				{ offset: 12, length: 8, newText: '"quotes"' },
				{ offset: 39, length: 13, newText: '"more quotes"' },
				{ offset: 66, length: 3, newText: '…' },
				{ offset: 91, length: 9, newText: '2020–2021' },
				{ offset: 118, length: 14, newText: '"final quotes"' },
				{ offset: 142, length: 2, newText: '—' }
			];

			const result = applyReplacements(text, replacements);
			expect(result).toMatchSnapshot();
		});
	});
});
