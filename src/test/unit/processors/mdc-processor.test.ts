import { describe, it, expect } from 'vitest';
import { processMdcText } from '../../../processors/mdc-processor';
import { TypopoConfig, applyReplacements } from '../../../processors/text-processor';
import { readFileSync } from 'fs';
import { join } from 'path';

const defaultConfig: TypopoConfig = {
  removeLines: false,
};

describe('MDC Processor / Assertion Tests', () => {
  describe('Block component structure (should NOT change)', () => {
    const testCases: Record<string, string> = {
      // Opening and closing delimiters are preserved as-is
      '::card\nContent\n::':  '::card\nContent\n::',
      '::alert\nContent\n::': '::alert\nContent\n::',

      // Component names must not be touched (including PascalCase and kebab-case)
      '::ProseCard\nContent\n::':    '::ProseCard\nContent\n::',
      '::my-component\nContent\n::': '::my-component\nContent\n::',

      // Leaf directives (no content block) preserved entirely
      '::divider{}':            '::divider{}',
      '::spacer{size="large"}': '::spacer{size="large"}',

      // Empty slot does not cause errors
      '::card\n\n::': '::card\n\n::',
    };

    for (const [input, expected] of Object.entries(testCases)) {
      it(`should preserve: ${input.substring(0, 50)}`, () => {
        const replacements = processMdcText(input, 'en-us', defaultConfig);
        const result = applyReplacements(input, replacements);
        expect(result).toBe(expected);
      });
    }
  });

  describe('Slot content (SHOULD change)', () => {
    const testCases: Record<string, string> = {
      // Ellipsis
      '::card\nword...\n::':              '::card\nword…\n::',
      '::note\nSentence ending.....\n::': '::note\nSentence ending…\n::',

      // Smart double quotes
      '::card\nShe said "hello"\n::': '::card\nShe said “hello”\n::',
      '::note\n"quoted text"\n::':    '::note\n“quoted text”\n::',

      // Quotes and ellipsis combined
      '::card\nA "great" example...\n::': '::card\nA “great” example…\n::',

      // Heading inside component
      '::card\n# Heading...\n::': '::card\n# Heading…\n::',

      // List inside component
      '::card\n- Item one...\n- Item two...\n::': '::card\n- Item one…\n- Item two…\n::',
    };

    for (const [input, expected] of Object.entries(testCases)) {
      it(`should fix slot content: ${input.substring(0, 50)}`, () => {
        const replacements = processMdcText(input, 'en-us', defaultConfig);
        const result = applyReplacements(input, replacements);
        expect(result).toBe(expected);
      });
    }
  });

  describe('Prop string values (SHOULD change)', () => {
    const testCases: Record<string, string> = {
      // Single string prop — ellipsis in value
      '::card{title="Hello..."}\nContent\n::': '::card{title="Hello…"}\nContent\n::',

      // Multiple string props — each value processed independently
      '::alert{type="info" message="Check this..."}\nContent\n::':
        '::alert{type="info" message="Check this…"}\nContent\n::',

      // Both prop value and slot content fixed in the same component
      '::callout{title="Before you begin..."}\nSee the guide...\n::':
        '::callout{title="Before you begin…"}\nSee the guide…\n::',

      // Leaf directive — prop processed, no slot
      '::divider{label="Section..."}': '::divider{label="Section…"}',
    };

    for (const [input, expected] of Object.entries(testCases)) {
      it(`should fix prop string value: ${input.substring(0, 60)}`, () => {
        const replacements = processMdcText(input, 'en-us', defaultConfig);
        const result = applyReplacements(input, replacements);
        expect(result).toBe(expected);
      });
    }
  });

  describe('Bare / boolean props (should NOT change)', () => {
    const testCases: Record<string, string> = {
      // Bare boolean props are never processed
      '::card{no-border}\nContent\n::': '::card{no-border}\nContent\n::',
      '::card{open}\nContent\n::':      '::card{open}\nContent\n::',

      // Mix of bare and string props — only string value changes, bare flag is unchanged
      '::card{no-border title="A card..."}\nContent\n::':
        '::card{no-border title="A card…"}\nContent\n::',
    };

    for (const [input, expected] of Object.entries(testCases)) {
      it(`should preserve bare prop: ${input.substring(0, 60)}`, () => {
        const replacements = processMdcText(input, 'en-us', defaultConfig);
        const result = applyReplacements(input, replacements);
        expect(result).toBe(expected);
      });
    }
  });

  describe('Inline component bracket content (SHOULD change)', () => {
    const testCases: Record<string, string> = {
      // Bracket content processed, surrounding paragraph text also processed
      'A :badge[New feature...] is available.': 'A :badge[New feature…] is available.',
      // Idempotency test for already fixed item
      'A :badge[New feature…] is available.':   'A :badge[New feature…] is available.',

      // Only bracket content has a typo; surrounding text is clean
      'See the :tooltip[Read more...] link.': 'See the :tooltip[Read more…] link.',

      // Nothing to fix — no-op
      'Check the :badge[stable] release.': 'Check the :badge[stable] release.',
    };

    for (const [input, expected] of Object.entries(testCases)) {
      it(`should fix bracket content: ${input.substring(0, 60)}`, () => {
        const replacements = processMdcText(input, 'en-us', defaultConfig);
        const result = applyReplacements(input, replacements);
        expect(result).toBe(expected);
      });
    }
  });

  describe('Inline component props (SHOULD change)', () => {
    const testCases: Record<string, string> = {
      // Inline directive with only props (no bracket content)
      ':icon{name="arrow..."}': ':icon{name="arrow…"}',

      // Inline directive with both bracket content and props — both fixed
      'A :tooltip[See more...]{title="Extra info..."} link.':
        'A :tooltip[See more…]{title="Extra info…"} link.',

      // Inline directive within longer paragraph — surrounding text also processed
      'Paragraph text... and a :badge[item...]{label="More..."} inline.':
        'Paragraph text… and a :badge[item…]{label="More…"} inline.',
    };

    for (const [input, expected] of Object.entries(testCases)) {
      it(`should fix inline prop: ${input.substring(0, 60)}`, () => {
        const replacements = processMdcText(input, 'en-us', defaultConfig);
        const result = applyReplacements(input, replacements);
        expect(result).toBe(expected);
      });
    }
  });

  describe('Nested components (slot content SHOULD change)', () => {
    const testCases: Record<string, string> = {
      // Inner slot content processed; all :: delimiters preserved
      ':::outer\n::inner\nword...\n::\n:::': ':::outer\n::inner\nword…\n::\n:::',

      // Each level slot content independently processed
      ':::outer\nOuter text...\n::inner\nInner text...\n::\n:::':
        ':::outer\nOuter text…\n::inner\nInner text…\n::\n:::',
    };

    for (const [input, expected] of Object.entries(testCases)) {
      it(`should fix nested slot content: ${input.substring(0, 60)}`, () => {
        const replacements = processMdcText(input, 'en-us', defaultConfig);
        const result = applyReplacements(input, replacements);
        expect(result).toBe(expected);
      });
    }
  });

  describe('Code blocks inside components (should NOT change)', () => {
    const testCases: Record<string, string> = {
      // Fenced code block inside component is not touched
      '::card\n```js\nconst x = "value"\n```\n::': '::card\n```js\nconst x = "value"\n```\n::',

      // Inline code inside component slot is not touched
      '::card\nUse `npm install` to install...\n::': '::card\nUse `npm install` to install…\n::',

      // Code block and prose mixed: prose changes, code does not
      '::card\nInstall first...\n```sh\nnpm install\n```\n::':
        '::card\nInstall first…\n```sh\nnpm install\n```\n::',
    };

    for (const [input, expected] of Object.entries(testCases)) {
      it(`should preserve code inside component: ${input.substring(0, 60)}`, () => {
        const replacements = processMdcText(input, 'en-us', defaultConfig);
        const result = applyReplacements(input, replacements);
        expect(result).toBe(expected);
      });
    }
  });

  describe('YAML frontmatter in MDC files (should NOT change)', () => {
    const testCases: Record<string, string> = {
      // Frontmatter is preserved; component slot is processed
      '---\ntitle: "Test"\n---\n\n::card\nContent...\n::':
        '---\ntitle: "Test"\n---\n\n::card\nContent…\n::',

      // Frontmatter with ellipsis-like values is preserved
      '---\ntitle: "Getting Started..."\n---\n\n# Heading...':
        '---\ntitle: "Getting Started..."\n---\n\n# Heading…',
    };

    for (const [input, expected] of Object.entries(testCases)) {
      it(`should preserve frontmatter: ${input.substring(0, 50)}`, () => {
        const replacements = processMdcText(input, 'en-us', defaultConfig);
        const result = applyReplacements(input, replacements);
        expect(result).toBe(expected);
      });
    }
  });

  describe('Standard markdown elements alongside MDC (SHOULD change)', () => {
    const testCases: Record<string, string> = {
      // Heading + component
      '# Heading...\n\n::card\nSlot content...\n::': '# Heading…\n\n::card\nSlot content…\n::',

      // Paragraph + component
      'Paragraph with "quotes".\n\n::note\nComponent "content"...\n::':
        'Paragraph with “quotes”.\n\n::note\nComponent “content”…\n::',

      // Blockquote + component
      '> A "quote"...\n\n::card\nContent...\n::': '> A “quote”…\n\n::card\nContent…\n::',

      // List + component
      '- item one...\n\n::card\nContent...\n::': '- item one…\n\n::card\nContent…\n::',

      // Inline component within a paragraph mixed with plain text
      'Text before... :badge[badge...] text after...': 'Text before… :badge[badge…] text after…',
    };

    for (const [input, expected] of Object.entries(testCases)) {
      it(`should fix markdown and MDC: ${input.substring(0, 60)}`, () => {
        const replacements = processMdcText(input, 'en-us', defaultConfig);
        const result = applyReplacements(input, replacements);
        expect(result).toBe(expected);
      });
    }
  });

  describe('Comprehensive MDC fixture test', () => {
    it('should correctly process a complete MDC document', () => {
      const fixturesPath = join(__dirname, '../../fixtures');
      const source = readFileSync(join(fixturesPath, 'mdc-source.mdc'), 'utf-8');
      const expected = readFileSync(join(fixturesPath, 'mdc-fixed.mdc'), 'utf-8');

      const replacements = processMdcText(source, 'en-us', defaultConfig);
      const result = applyReplacements(source, replacements);

      expect(result).toBe(expected);
    });
  });
});
