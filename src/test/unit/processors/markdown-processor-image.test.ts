import { describe, it, expect } from 'vitest';
import { processMarkdownText } from '../../../processors/markdown-processor';
import { TypopoConfig, applyReplacements } from '../../../processors/text-processor';

const defaultConfig: TypopoConfig = {
  removeLines: false,
};

describe('Image alt text processing (SHOULD change alt text only)', () => {
  const testCases: Record<string, string> = {
    '![Alt "text"](url)':              '![Alt “text”](url)',
    '![Image...](http://example.com)': '![Image…](http://example.com)',
    '!["Title"](url)':                 '![“Title”](url)',
    '![](url)':                        '![](url)', // Empty alt
    '![Alt "text"](url "title")':      '![Alt “text”](url "title")', // With title attribute
  };

  for (const [input, expected] of Object.entries(testCases)) {
    it(`should process image alt: ${input}`, () => {
      const replacements = processMarkdownText(input, 'en-us', defaultConfig);
      const result = applyReplacements(input, replacements);
      expect(result).toBe(expected);
    });
  }
});
