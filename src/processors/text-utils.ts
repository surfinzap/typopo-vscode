import type { TextReplacement } from './text-processor';

/**
 * Applies an array of text replacements to the original text.
 * Replacements are applied in reverse order (by offset) to preserve position integrity.
 *
 * @param originalText - The original text to apply replacements to
 * @param replacements - Array of TextReplacement objects describing changes to make
 * @returns The text with all replacements applied
 *
 * @example
 * const text = '"hello" world';
 * const replacements = [{ offset: 0, length: 7, newText: '"hello"' }];
 * const result = applyReplacements(text, replacements);
 * // result: '"hello" world'
 */
export function applyReplacements(
	originalText: string,
	replacements: TextReplacement[]
): string {
	// Sort by offset descending (apply from end to start to preserve offsets)
	const sorted = [...replacements].sort((a, b) => b.offset - a.offset);

	let result = originalText;
	for (const { offset, length, newText } of sorted) {
		result = result.substring(0, offset) + newText + result.substring(offset + length);
	}

	return result;
}
