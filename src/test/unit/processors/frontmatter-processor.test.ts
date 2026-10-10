import { describe, it, expect } from 'vitest';
import { processMdcText } from '../../../processors/mdc-processor';
import { processMarkdownText } from '../../../processors/markdown-processor';
import { TypopoConfig, applyReplacements } from '../../../processors/text-processor';

const defaultConfig: TypopoConfig = {
  removeLines: false,
};

const frontmatterConfig: TypopoConfig = {
  removeLines:     false,
  frontmatterKeys: ['title', 'description'],
};

function fixMdc(input: string, config: TypopoConfig): string {
  return applyReplacements(input, processMdcText(input, 'en-us', config));
}

describe('Frontmatter Processor / Assertion Tests', () => {
  describe('Listed keys (SHOULD change)', () => {
    const testCases: Record<string, string> = {
      // Plain value
      '---\ntitle: Getting started...\n---\n': '---\ntitle: Getting started…\n---\n',

      // Plain value with an apostrophe (typopo also sets a nbsp after “a”)
      '---\ntitle: It\'s a "test"\n---\n': '---\ntitle: It’s a “test”\n---\n',

      // Single-quoted value: quotes are kept
      "---\ntitle: 'Getting started...'\n---\n": "---\ntitle: 'Getting started…'\n---\n",

      // Single-quoted value with an escaped apostrophe ('')
      "---\ntitle: 'It''s here...'\n---\n": "---\ntitle: 'It’s here…'\n---\n",

      // Several listed keys
      '---\ntitle: One...\ndescription: Two...\n---\n':
        '---\ntitle: One…\ndescription: Two…\n---\n',

      // Spacing around the value is kept
      '---\ntitle:   One...  \n---\n': '---\ntitle:   One…  \n---\n',

      // Frontmatter and body are fixed together
      '---\ntitle: One...\n---\n\n# Heading...\n\nThe "quote".':
        '---\ntitle: One…\n---\n\n# Heading…\n\nThe “quote”.',

      // CRLF document: line endings are kept
      '---\r\ntitle: One...\r\ndescription: Two...\r\n---\r\n\r\nBody...\r\n':
        '---\r\ntitle: One…\r\ndescription: Two…\r\n---\r\n\r\nBody…\r\n',

      // Frontmatter alongside an MDC component
      '---\ntitle: One...\n---\n\n::card{title="Hello..."}\nContent...\n::':
        '---\ntitle: One…\n---\n\n::card{title="Hello…"}\nContent…\n::',
    };

    for (const [input, expected] of Object.entries(testCases)) {
      it(`should fix: ${JSON.stringify(input).substring(0, 60)}`, () => {
        expect(fixMdc(input, frontmatterConfig)).toBe(expected);
      });
    }
  });

  describe('Everything else in frontmatter (should NOT change)', () => {
    const testCases: string[] = [
      // Unlisted key
      '---\nslug: getting-started...\nauthor: "Someone..."\n---\n',

      // Double-quoted value (may hold escapes)
      '---\ntitle: "Getting started..."\n---\n',

      // Empty value
      '---\ntitle:\n---\n',
      '---\ntitle: \n---\n',

      // Block scalars, including their indented content
      '---\ntitle: |\n  Getting started...\n---\n',
      '---\ndescription: >-\n  Getting started...\n---\n',

      // Flow collections
      '---\ntitle: [One..., Two...]\n---\n',
      '---\ntitle: {a: One...}\n---\n',

      // Nested keys and list items
      '---\nseo:\n  title: Getting started...\n---\n',
      '---\ntitle:\n  - Getting started...\n---\n',

      // TOML frontmatter
      '+++\ntitle = "Getting started..."\n+++\n',

      // Already correct
      '---\ntitle: Getting started…\n---\n',
    ];

    for (const input of testCases) {
      it(`should preserve: ${JSON.stringify(input).substring(0, 60)}`, () => {
        expect(fixMdc(input, frontmatterConfig)).toBe(input);
      });
    }
  });

  describe('Opt-in (no listed keys means no change)', () => {
    const input = "---\ntitle: Getting started...\ndescription: 'It''s \"here\"...'\n---\n";

    it('should preserve frontmatter when frontmatterKeys is not set', () => {
      expect(fixMdc(input, defaultConfig)).toBe(input);
    });

    it('should preserve frontmatter when frontmatterKeys is empty', () => {
      expect(fixMdc(input, { removeLines: false, frontmatterKeys: [] })).toBe(input);
    });

    it('should not treat a --- block further down the document as frontmatter', () => {
      const body = 'Intro\n\n---\ntitle: One\n---\n';
      expect(fixMdc(body, frontmatterConfig)).toBe(fixMdc(body, defaultConfig));
    });
  });

  describe('Idempotency', () => {
    it('should change nothing on a second run', () => {
      const input = "---\ntitle: 'It''s here...'\ndescription: A \"quote\"...\n---\n\nBody...\n";
      const once = fixMdc(input, frontmatterConfig);
      expect(fixMdc(once, frontmatterConfig)).toBe(once);
    });
  });

  describe('Plain markdown processor', () => {
    it('should fix listed keys', () => {
      const input = '---\ntitle: One...\nslug: one...\n---\n\nBody...';
      const result = applyReplacements(
        input,
        processMarkdownText(input, 'en-us', frontmatterConfig)
      );
      expect(result).toBe('---\ntitle: One…\nslug: one...\n---\n\nBody…');
    });

    it('should preserve frontmatter without listed keys', () => {
      const input = '---\ntitle: One...\n---\n\nBody...';
      const result = applyReplacements(input, processMarkdownText(input, 'en-us', defaultConfig));
      expect(result).toBe('---\ntitle: One...\n---\n\nBody…');
    });
  });
});
