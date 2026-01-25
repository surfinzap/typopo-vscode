import { describe, it, expect } from 'vitest';
import { RawTextProcessor, TypopoConfig } from '../../../processors/text-processor';
import { applyReplacements, TextReplacement } from '../../../processors/text-processor';
import { rawTextProcessorTestSet } from '../../fixtures/test-data';

const defaultConfig: TypopoConfig = {
  removeLines: false,
};

describe('RawTextProcessor / Assertion Tests', () => {
  const processor = new RawTextProcessor();

  describe('Quote conversion (SHOULD change)', () => {
    for (const [input, expected] of Object.entries(rawTextProcessorTestSet)) {
      it(`should convert: ${input}`, () => {
        const replacements = processor.process(input, 'en-us', defaultConfig);
        const result = applyReplacements(input, replacements);
        expect(result).toBe(expected);
      });
    }
  });
});

describe('RawTextProcessor.shouldProcess', () => {
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

describe('applyReplacements', () => {
  describe('Single replacement', () => {
    it('should apply single replacement at beginning', () => {
      const text = 'orig word';
      const replacements: TextReplacement[] = [{ offset: 0, length: 4, newText: 'repl' }];

      const result = applyReplacements(text, replacements);
      expect(result).toBe('repl word');
    });

    it('should apply single replacement in middle', () => {
      const text = 'word orig word';
      const replacements: TextReplacement[] = [{ offset: 5, length: 4, newText: 'repl' }];

      const result = applyReplacements(text, replacements);
      expect(result).toBe('word repl word');
    });

    it('should apply single replacement at end', () => {
      const text = 'word orig';
      const replacements: TextReplacement[] = [{ offset: 5, length: 4, newText: 'repl' }];

      const result = applyReplacements(text, replacements);
      expect(result).toBe('word repl');
    });
  });

  describe('Multiple replacements', () => {
    it('should apply multiple non-overlapping replacements', () => {
      const text = 'orig1 and orig2';
      const replacements: TextReplacement[] = [
        { offset: 0, length: 5, newText: 'repl11' },
        { offset: 10, length: 5, newText: 'repl22' },
      ];

      const result = applyReplacements(text, replacements);
      expect(result).toBe('repl11 and repl22');
    });

    it('should apply replacements in correct order (offset-independent)', () => {
      const text = 'orig1 and orig2 and orig3';
      const replacements: TextReplacement[] = [
        { offset: 10, length: 5, newText: 'repl22' },
        { offset: 0, length: 5, newText: 'repl11' },
        { offset: 20, length: 5, newText: 'repl33' },
      ];

      const result = applyReplacements(text, replacements);
      expect(result).toBe('repl11 and repl22 and repl33');
    });

    it('should handle adjacent replacements', () => {
      const text = 'orig1andorig2andorig3';
      const replacements: TextReplacement[] = [
        { offset: 8, length: 5, newText: 'repl22' },
        { offset: 0, length: 5, newText: 'repl11' },
        { offset: 16, length: 5, newText: 'repl33' },
      ];

      const result = applyReplacements(text, replacements);
      expect(result).toBe('repl11andrepl22andrepl33');
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
      const replacements: TextReplacement[] = [{ offset: 0, length: 5, newText: 'very long' }];

      const result = applyReplacements(text, replacements);
      expect(result).toBe('very long long');
    });

    it('should handle replacement that removes text', () => {
      const text = 'hello word';
      const replacements: TextReplacement[] = [{ offset: 5, length: 6, newText: '' }];

      const result = applyReplacements(text, replacements);
      expect(result).toBe('hello');
    });

    it('should handle replacement that inserts text (zero length)', () => {
      const text = 'helloword';
      const replacements: TextReplacement[] = [{ offset: 5, length: 0, newText: ' ' }];

      const result = applyReplacements(text, replacements);
      expect(result).toBe('hello word');
    });

    it('should maintain correct offsets when applying multiple replacements', () => {
      const text = 'a b c d e';
      const replacements: TextReplacement[] = [
        { offset: 0, length: 1, newText: 'AAA' }, // 'a' -> 'AAA'
        { offset: 4, length: 1, newText: 'CCC' }, // 'c' -> 'CCC'
        { offset: 8, length: 1, newText: 'EEE' }, // 'e' -> 'EEE'
      ];

      const result = applyReplacements(text, replacements);
      expect(result).toBe('AAA b CCC d EEE');
    });
  });

  describe('Invalid input handling', () => {
    it('should handle negative offset gracefully', () => {
      const text = 'hello world';
      const replacements: TextReplacement[] = [{ offset: -1, length: 5, newText: 'foo' }];

      // JavaScript substring handles negative indices gracefully
      const result = applyReplacements(text, replacements);
      // substring(0, -1) returns empty string, substring(-1 + 5) starts from beginning
      expect(result).toBe('fooo world');
    });

    it('should handle offset beyond text length', () => {
      const text = 'hello';
      const replacements: TextReplacement[] = [{ offset: 100, length: 5, newText: 'foo' }];

      // substring handles out-of-bounds gracefully - appends at end
      const result = applyReplacements(text, replacements);
      expect(result).toBe('hellofoo');
    });

    it('should handle length exceeding remaining text', () => {
      const text = 'hello word';
      const replacements: TextReplacement[] = [{ offset: 6, length: 100, newText: 'universe' }];

      // substring handles this gracefully - replaces until end
      const result = applyReplacements(text, replacements);
      expect(result).toBe('hello universe');
    });
  });

  describe('Unicode and emoji handling', () => {
    it('should handle emoji in text', () => {
      const text = '😀 orig 👋';
      // Note: In JavaScript strings, emoji count as 2 code units each
      // '😀' = 2 units, ' ' = 1 unit, so offset 3 starts at "
      const replacements: TextReplacement[] = [{ offset: 3, length: 4, newText: 'repl' }];

      const result = applyReplacements(text, replacements);
      expect(result).toBe('😀 repl 👋');
    });

    it('should handle emoji in replacement text', () => {
      const text = 'hello';
      const replacements: TextReplacement[] = [{ offset: 0, length: 5, newText: '😀' }];

      const result = applyReplacements(text, replacements);
      expect(result).toBe('😀');
    });

    it('should handle multi-byte unicode characters', () => {
      const text = 'Héllo wörld';
      const replacements: TextReplacement[] = [{ offset: 6, length: 5, newText: 'repl' }];

      const result = applyReplacements(text, replacements);
      expect(result).toBe('Héllo repl');
    });

    it('should handle mixed emoji and regular text replacements', () => {
      const text = 'Hello 😀 word';
      const replacements: TextReplacement[] = [
        { offset: 0, length: 5, newText: 'Hi' },
        { offset: 9, length: 5, newText: '🌍' },
      ];

      const result = applyReplacements(text, replacements);
      expect(result).toBe('Hi 😀 🌍');
    });
  });

  describe('Overlapping replacements behavior', () => {
    it('should document behavior with overlapping replacements', () => {
      const text = 'abcdefghij';
      const replacements: TextReplacement[] = [
        { offset: 0, length: 5, newText: 'XXXXX' },
        { offset: 3, length: 5, newText: 'YYYYY' },
      ];

      // Replacements are sorted by offset descending (3, then 0)
      // First: offset 3, length 5 -> 'abcYYYYYij'
      // Then: offset 0, length 5 -> 'XXXXXYYYij'
      const result = applyReplacements(text, replacements);
      expect(result).toBe('XXXXXYYYij');
    });

    it('should handle identical offsets (order dependent)', () => {
      const text = 'abcdefghij';
      const replacements: TextReplacement[] = [
        { offset: 2, length: 4, newText: 'YYYY' },
        { offset: 2, length: 3, newText: 'XXX' },
      ];

      const result = applyReplacements(text, replacements);
      expect(result).toBe('abXXXYghij');
    });
  });
});
