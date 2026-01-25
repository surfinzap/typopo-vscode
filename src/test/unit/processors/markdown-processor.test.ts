import { describe, it, expect } from 'vitest';
import { processMarkdownText } from '../../../processors/markdown-processor';
import { TypopoConfig, applyReplacements } from '../../../processors/text-processor';
import { rawTextProcessorTestSet } from '../../fixtures/test-data';

const defaultConfig: TypopoConfig = {
	removeLines: false,
};

describe('Markdown Processor / Assertion Tests', () => {
	describe('Code block preservation (should NOT change)', () => {
		const testCases: Record<string, string> = {
      // Inline code
      '`"code quotes"`': '`"code quotes"`',
      'text `"inline code"` text': 'text `"inline code"` text',
      'Multiple `"code"` blocks `"here"`': 'Multiple `"code"` blocks `"here"`',

      // Fenced code blocks
      '```\n"code block"\n```': '```\n"code block"\n```',
      '```javascript\nconst x = "value";\n```':
        '```javascript\nconst x = "value";\n```',

      // Inline code within quoted fragment
      '"word `"inline code"` word"': '“word `"inline code"` word”',

      // Nbsp test
      "a `code`": "a `code`",
    };

		for (const [input, expected] of Object.entries(testCases)) {
			it(`should preserve: ${input.substring(0, 50)}...`, () => {
				const replacements = processMarkdownText(input, 'en-us', defaultConfig);
				const result = applyReplacements(input, replacements);
				expect(result).toBe(expected);
			});
		}
	});

	describe.skip('Table preservation (should NOT change)', () => {
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

	describe("YAML frontmatter preservation (should NOT change)", () => {
    const testCases: Record<string, string> = {
      '---\ntitle: "Test"\nauthor: "John"\n---':
        '---\ntitle: "Test"\nauthor: "John"\n---',

      '---\ntitle: "My "Post""\n---\n\nContent with "quotes".':
        '---\ntitle: "My "Post""\n---\n\nContent with “quotes”.',
    };

    for (const [input, expected] of Object.entries(testCases)) {
      it(`should preserve frontmatter: ${input.substring(0, 30)}...`, () => {
        const replacements = processMarkdownText(input, "en-us", defaultConfig);
        const result = applyReplacements(input, replacements);
        expect(result).toBe(expected);
      });
    }
  });

	describe("TOML frontmatter preservation (should NOT change)", () => {
    const testCases: Record<string, string> = {
      '+++\ntitle: "Test"\nauthor: "John"\n+++':
        '+++\ntitle: "Test"\nauthor: "John"\n+++',

      '+++\ntitle: "My "Post""\n+++\n\nContent with "quotes".':
        '+++\ntitle: "My "Post""\n+++\n\nContent with “quotes”.',
    };

    for (const [input, expected] of Object.entries(testCases)) {
      it(`should preserve frontmatter: ${input.substring(0, 30)}...`, () => {
        const replacements = processMarkdownText(input, "en-us", defaultConfig);
        const result = applyReplacements(input, replacements);
        expect(result).toBe(expected);
      });
    }
  });


	describe("raw HTML preservation (should NOT change)", () => {
		const testCases: Record<string, string> = {
      '"quotes" <p id="id">"quotes"</p> "quotes"':
        '“quotes” <p id="id">“quotes”</p> “quotes”',

      '<html><p id="id">"quotes"</p></html>':
        '<html><p id="id">"quotes"</p></html>',

      '<a href="id">"quotes"</a>': '<a href="id">“quotes”</a>',
    };

		for (const [input, expected] of Object.entries(testCases)) {
			it(`should preserve frontmatter: ${input.substring(0, 30)}...`, () => {
				const replacements = processMarkdownText(
					input,
					"en-us",
					defaultConfig,
				);
				const result = applyReplacements(input, replacements);
				expect(result).toBe(expected);
			});
		}
	});

	describe("Quote conversion in regular text (SHOULD change)", () => {
    // Use shared test data from test-data.ts
    for (const [input, expected] of Object.entries(rawTextProcessorTestSet)) {
      it(`should convert quotes: ${input}`, () => {
        const replacements = processMarkdownText(input, "en-us", defaultConfig);
        const result = applyReplacements(input, replacements);
        expect(result).toBe(expected);
      });
    }
  });

	describe("Quote conversion in headings (SHOULD change)", () => {
    const testCases: Record<string, string> = {
      '# Heading with "quotes"': '# Heading with “quotes”',
      '## Sub-heading test...': '## Sub-heading test…',
      '### Heading "with" multiple "quotes"':
        '### Heading “with” multiple “quotes”',
    };

    for (const [input, expected] of Object.entries(testCases)) {
      it(`should convert quotes in heading: ${input}`, () => {
        const replacements = processMarkdownText(input, "en-us", defaultConfig);
        const result = applyReplacements(input, replacements);
        expect(result).toBe(expected);
      });
    }
  });

	describe("Quote conversion in inline styles (SHOULD change)", () => {
    const testCases: Record<string, string> = {
      '*"italic quotes"*': "*“italic quotes”*",
      '**"bold quotes"**': "**“bold quotes”**",
      '***"bold italic quotes"***': "***“bold italic quotes”***",
      'Text with *"emphasized"* word': "Text with *“emphasized”* word",
      '_"italic quotes"_': "_“italic quotes”_",
      '__"bold quotes"__': "__“bold quotes”__",
      '___"bold italic quotes"___': "___“bold italic quotes”___",
      'Text with _"emphasized"_ word': "Text with _“emphasized”_ word",
      '~~"delete"~~': "~~“delete”~~",
      'word ~~"delete"~~ word': "word ~~“delete”~~ word",

      // nbsp test
      "a *code*": "a *code*",
      "a **code**": "a **code**",
      "a ***code***": "a ***code***",
      "a _code_": "a _code_",
      "a __code__": "a __code__",
      "a ___code___": "a ___code___",
      'a ~~delete~~': "a ~~delete~~",
    };

    for (const [input, expected] of Object.entries(testCases)) {
      it(`should convert quotes in emphasis: ${input}`, () => {
        const replacements = processMarkdownText(input, "en-us", defaultConfig);
        const result = applyReplacements(input, replacements);
        expect(result).toBe(expected);
      });
    }
  });

	describe("Link text processing (SHOULD change text, preserve URL)", () => {
    const testCases: Record<string, string> = {
      '[link with "quotes"](http://example.com)':
        "[link with “quotes”](http://example.com)",
      '[text "quotes"](http://example.com/"path")':
        '[text “quotes”](http://example.com/"path")',
      'a [text "quotes"](http://example.com/"path")':
        'a [text “quotes”](http://example.com/"path")',
    };

    for (const [input, expected] of Object.entries(testCases)) {
      it(`should process link text: ${input}`, () => {
        const replacements = processMarkdownText(input, "en-us", defaultConfig);
        const result = applyReplacements(input, replacements);
        expect(result).toBe(expected);
      });
    }
  });

	describe("Blockquote processing (SHOULD change)", () => {
    const testCases: Record<string, string> = {
      '> "quoted text"': "> “quoted text”",
      '> She said "hello"': "> She said “hello”",
      '> Multiple\n> lines with "quotes"': "> Multiple\n> lines with “quotes”",

      // nesting: spaces/tabs upfront
      '  > "quoted text"': "  > “quoted text”",
      '  > She said "hello"': "  > She said “hello”",
      // '  > Multiple\n  > lines with "quotes"':
      // "  > Multiple\n  > lines with “quotes”",
      // '\t\t> "quoted text"': "\t\t> “quoted text”",
      // '\t\t> She said "hello"': "\t\t> She said “hello”",
      // '\t\t> Multiple\n\t\t> lines with "quotes"':
      //   "\t\t> Multiple\n\t\t> lines with “quotes”",
    };

    for (const [input, expected] of Object.entries(testCases)) {
      it(`should process blockquote: ${input}`, () => {
        const replacements = processMarkdownText(input, "en-us", defaultConfig);
        const result = applyReplacements(input, replacements);
        expect(result).toBe(expected);
      });
    }
  });

	describe("List item processing (SHOULD change)", () => {
    const testCases: Record<string, string> = {
      '- item with "quotes"': "- item with “quotes”",
      '* another "item"': "* another “item”",
      '1. numbered "item"': "1. numbered “item”",
      '- item\n  - nested "item"': "- item\n  - nested “item”",
      '- item\n\t- nested "item"': "- item\n\t- nested “item”",
    };

    for (const [input, expected] of Object.entries(testCases)) {
      it(`should process list item: ${input}`, () => {
        const replacements = processMarkdownText(input, "en-us", defaultConfig);
        const result = applyReplacements(input, replacements);
        expect(result).toBe(expected);
      });
    }
  });
});

describe.skip('Markdown Processor - Snapshot Tests', () => {
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
