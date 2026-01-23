import { describe, it, expect } from 'vitest';
import { processMarkdownText } from '../../../processors/markdown-processor';
import { TypopoConfig, applyReplacements } from '../../../processors/text-processor';

const defaultConfig: TypopoConfig = {
	removeLines: false,
};

describe.skip('Markdown Processor - Assertion Tests (Key:Value Format)', () => {
	/**
	 * Test cases in key:value format
	 * Key = input text
	 * Value = expected output text after typopo processing
	 *
	 * When key === value, the text should NOT be changed (preserved)
	 * When key !== value, the text should be changed (processed)
	 */
	describe('Code block preservation (should NOT change)', () => {
		const testCases: Record<string, string> = {
			// Inline code should be preserved
			'`"code quotes"`': '`"code quotes"`',
			'Text with `"inline code"` preserved': 'Text with `"inline code"` preserved',
			'Multiple `"code"` blocks `"here"`': 'Multiple `"code"` blocks `"here"`',

			// Fenced code blocks should be preserved
			'```\n"code block"\n```': '```\n"code block"\n```',
			'```javascript\nconst x = "value";\n```': '```javascript\nconst x = "value";\n```',
		};

		for (const [input, expected] of Object.entries(testCases)) {
			it(`should preserve: ${input.substring(0, 50)}...`, () => {
				const replacements = processMarkdownText(input, 'en-us', defaultConfig);
				const result = applyReplacements(input, replacements);
				expect(result).toBe(expected);
			});
		}
	});

	describe('Table preservation (should NOT change)', () => {
		const testCases: Record<string, string> = {
			// Tables should be completely preserved
			'| "Header" | "Value" |\n|----------|----------|\n| "data" | "more" |':
				'| "Header" | "Value" |\n|----------|----------|\n| "data" | "more" |',

			'| Column |\n|--------|\n| "test" |':
				'| Column |\n|--------|\n| "test" |',
		};

		for (const [input, expected] of Object.entries(testCases)) {
			it(`should preserve table: ${input.substring(0, 30)}...`, () => {
				const replacements = processMarkdownText(input, 'en-us', defaultConfig);
				const result = applyReplacements(input, replacements);
				expect(result).toBe(expected);
			});
		}
	});

	describe('YAML frontmatter preservation (should NOT change)', () => {
		const testCases: Record<string, string> = {
			// Frontmatter should be preserved
			'---\ntitle: "Test"\nauthor: "John"\n---':
				'---\ntitle: "Test"\nauthor: "John"\n---',

			'---\ntitle: "My "Post""\n---\n\nContent with "quotes".':
				'---\ntitle: "My "Post""\n---\n\nContent with "quotes".',
		};

		for (const [input, expected] of Object.entries(testCases)) {
			it(`should preserve frontmatter: ${input.substring(0, 30)}...`, () => {
				const replacements = processMarkdownText(input, 'en-us', defaultConfig);
				const result = applyReplacements(input, replacements);
				expect(result).toBe(expected);
			});
		}
	});

	describe('Quote conversion in regular text (SHOULD change)', () => {
		const testCases: Record<string, string> = {
			// Regular quotes should be converted to smart quotes
			'"hello"': '"hello"',
			'She said "hello"': 'She said "hello"',
			'A "quoted" word': 'A "quoted" word',
			'Multiple "quotes" in "text"': 'Multiple "quotes" in "text"',

			// Nested quotes
			'"outer \'inner\' outer"': '"outer \'inner\' outer"',
		};

		for (const [input, expected] of Object.entries(testCases)) {
			it(`should convert quotes: ${input}`, () => {
				const replacements = processMarkdownText(input, 'en-us', defaultConfig);
				const result = applyReplacements(input, replacements);
				expect(result).toBe(expected);
			});
		}
	});

	describe('Quote conversion in headings (SHOULD change)', () => {
		const testCases: Record<string, string> = {
			'# Heading with "quotes"': '# Heading with "quotes"',
			'## Sub-heading "test"': '## Sub-heading "test"',
			'### Level 3 "with" multiple "quotes"': '### Level 3 "with" multiple "quotes"',
		};

		for (const [input, expected] of Object.entries(testCases)) {
			it(`should convert quotes in heading: ${input}`, () => {
				const replacements = processMarkdownText(input, 'en-us', defaultConfig);
				const result = applyReplacements(input, replacements);
				expect(result).toBe(expected);
			});
		}
	});

	describe('Quote conversion in emphasis (SHOULD change)', () => {
		const testCases: Record<string, string> = {
			'*"italic quotes"*': '*"italic quotes"*',
			'**"bold quotes"**': '**"bold quotes"**',
			'***"bold italic quotes"***': '***"bold italic quotes"***',
			'Text with *"emphasized"* word': 'Text with *"emphasized"* word',
		};

		for (const [input, expected] of Object.entries(testCases)) {
			it(`should convert quotes in emphasis: ${input}`, () => {
				const replacements = processMarkdownText(input, 'en-us', defaultConfig);
				const result = applyReplacements(input, replacements);
				expect(result).toBe(expected);
			});
		}
	});

	describe('Link text processing (SHOULD change text, preserve URL)', () => {
		const testCases: Record<string, string> = {
			'[link with "quotes"](http://example.com)': '[link with "quotes"](http://example.com)',
			'[text](http://example.com/"path")': '[text](http://example.com/"path")',
		};

		for (const [input, expected] of Object.entries(testCases)) {
			it(`should process link text: ${input}`, () => {
				const replacements = processMarkdownText(input, 'en-us', defaultConfig);
				const result = applyReplacements(input, replacements);
				expect(result).toBe(expected);
			});
		}
	});

	describe('Blockquote processing (SHOULD change)', () => {
		const testCases: Record<string, string> = {
			'> "quoted text"': '> "quoted text"',
			'> She said "hello"': '> She said "hello"',
			'> Multiple\n> lines with "quotes"': '> Multiple\n> lines with "quotes"',
		};

		for (const [input, expected] of Object.entries(testCases)) {
			it(`should process blockquote: ${input}`, () => {
				const replacements = processMarkdownText(input, 'en-us', defaultConfig);
				const result = applyReplacements(input, replacements);
				expect(result).toBe(expected);
			});
		}
	});

	describe('List item processing (SHOULD change)', () => {
		const testCases: Record<string, string> = {
			'- item with "quotes"': '- item with "quotes"',
			'* another "item"': '* another "item"',
			'1. numbered "item"': '1. numbered "item"',
			'- item\n  - nested "item"': '- item\n  - nested "item"',
		};

		for (const [input, expected] of Object.entries(testCases)) {
			it(`should process list item: ${input}`, () => {
				const replacements = processMarkdownText(input, 'en-us', defaultConfig);
				const result = applyReplacements(input, replacements);
				expect(result).toBe(expected);
			});
		}
	});

	describe('Mixed content scenarios', () => {
		const testCases: Record<string, string> = {
			// Code should be preserved, text should be processed
			'Text with "quotes" and `"code quotes"`.':
				'Text with "quotes" and `"code quotes"`.',

			// Multiple types
			'# Heading\n\nParagraph with "quotes".\n\n`code "here"`':
				'# Heading\n\nParagraph with "quotes".\n\n`code "here"`',
		};

		for (const [input, expected] of Object.entries(testCases)) {
			it(`should handle mixed content: ${input.substring(0, 40)}...`, () => {
				const replacements = processMarkdownText(input, 'en-us', defaultConfig);
				const result = applyReplacements(input, replacements);
				expect(result).toBe(expected);
			});
		}
	});
});

describe('Markdown Processor - Snapshot Tests', () => {
	it('should handle complex markdown document with all features', () => {
		const input = `---
title: "Test Document"
author: "John Doe"
---

# Main Title with "Quotes"

This is a paragraph with "smart quotes" that should be converted.

## Code Examples

Here is inline code: \`const x = "value";\` which should be preserved.

\`\`\`javascript
// Code block with "quotes"
function test() {
  const message = "Hello, World!";
  return message;
}
\`\`\`

## Lists

- First item with "quotes"
- Second item
  - Nested item with "more quotes"
- Third item

1. Numbered item "one"
2. Numbered item "two"

## Tables

| Column 1 | Column 2 |
|----------|----------|
| "data" | "value" |
| more | data |

## Links and Emphasis

This is a [link with "quotes"](http://example.com) in the text.

Text with *"emphasized quotes"* and **"bold quotes"**.

## Blockquotes

> This is a quote with "quotes inside"
> Multiple lines

## Final Paragraph

Another paragraph with "quotes" to process.
`;

		const replacements = processMarkdownText(input, 'en-us', defaultConfig);
		expect(replacements).toMatchSnapshot();
	});

	it('should handle markdown with multiple code blocks', () => {
		const input = `
Text with "quotes".

\`\`\`js
code "here"
\`\`\`

More text with "quotes".

\`\`\`python
more_code = "value"
\`\`\`

Final text with "quotes".
`;

		const replacements = processMarkdownText(input, 'en-us', defaultConfig);
		expect(replacements).toMatchSnapshot();
	});

	it('should handle markdown with nested structures', () => {
		const input = `
# Title

> Blockquote with "quotes"
>
> - List in blockquote with "quotes"
> - Another item
>
> \`\`\`
> code in blockquote "test"
> \`\`\`

Normal paragraph with "quotes".
`;

		const replacements = processMarkdownText(input, 'en-us', defaultConfig);
		expect(replacements).toMatchSnapshot();
	});

	it('should handle edge case: empty document', () => {
		const input = '';
		const replacements = processMarkdownText(input, 'en-us', defaultConfig);
		expect(replacements).toMatchSnapshot();
	});

	it('should handle edge case: only whitespace', () => {
		const input = '   \n\n   \n';
		const replacements = processMarkdownText(input, 'en-us', defaultConfig);
		expect(replacements).toMatchSnapshot();
	});

	it('should handle edge case: only code blocks', () => {
		const input = '```\n"all code"\n```';
		const replacements = processMarkdownText(input, 'en-us', defaultConfig);
		expect(replacements).toMatchSnapshot();
	});
});
