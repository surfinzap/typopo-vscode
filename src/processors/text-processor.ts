import * as vscode from 'vscode';
import * as typopo from 'typopo';
import { processMarkdownText } from './markdown-processor';

/**
 * Represents a text replacement operation with position and content.
 * Used to describe changes that should be applied to a document.
 */
export interface TextReplacement {
  /** The zero-based character offset where the replacement starts */
  offset:  number;
  /** The number of characters to replace, the original length */
  length:  number;
  /** The new text to insert at the specified position */
  newText: string;
}

/**
 * Configuration options for the typopo typography fixer.
 */
export interface TypopoConfig {
  /** Whether to remove empty lines between paragraphs */
  removeLines: boolean;
}

/**
 * Interface for text processors that handle different text formatting structures (e.g. markdown).
 * Processors use a strategy pattern to determine if they should handle a document and how to process it.
 */
export interface TextProcessor {
  /**
   * Determine if this processor should handle the given document
   */
  shouldProcess(document: vscode.TextDocument, config: any): boolean;

  /**
   * Process the text and return a list of replacements to apply
   */
  process(text: string, language: string, config: TypopoConfig): TextReplacement[];
}

/**
 * Processor for markdown files (.md, .mdx)
 * Uses remark AST parsing to preserve code blocks, tables, etc.
 */
export class MarkdownProcessor implements TextProcessor {
  /**
   * Determines if this processor should handle the document.
   * Returns true for markdown and mdx files when keepMarkdownFormatting is enabled.
   * @param document - The VS Code document to check
   * @param config - Extension configuration containing keepMarkdownFormatting option
   * @returns true if the document is markdown/mdx and formatting should be preserved
   */
  shouldProcess(document: vscode.TextDocument, config: any): boolean {
    const isMarkdownFile = document.languageId === 'markdown' || document.languageId === 'mdx';

    return isMarkdownFile && (config.keepMarkdownFormatting ?? true);
  }

  /**
   * Processes markdown text while preserving code blocks, tables, and MDC components.
   * Uses remark AST parsing to apply typography fixes only to prose content.
   * @param text - The markdown text to process
   * @param language - The language code for typography rules (e.g., 'en-us', 'de-de')
   * @param config - Typopo configuration options
   * @returns Array of text replacements to apply
   */
  process(text: string, language: string, config: TypopoConfig): TextReplacement[] {
    return processMarkdownText(text, language, config);
  }
}

/**
 * Fallback processor for raw text processing.
 * Applies typopo directly to the entire text without any structure awareness.
 * Always returns true for shouldProcess - should be last in the processor chain.
 */
export class RawTextProcessor implements TextProcessor {
  /**
   * Always returns true as this is the fallback processor.
   * This processor should be placed last in the processor chain.
   * @param _document - The VS Code document (unused)
   * @param _config - Extension configuration (unused)
   * @returns Always true to process any document
   */
  shouldProcess(_document: vscode.TextDocument, _config: any): boolean {
    return true; // Always matches as fallback
  }

  /**
   * Applies typopo typography fixes to the entire text without any structure awareness.
   * This is a simple pass-through to the typopo library for non-structured text.
   * @param text - The raw text to process
   * @param language - The language code for typography rules (e.g., 'en-us', 'de-de')
   * @param config - Typopo configuration options
   * @returns Array containing a single replacement for the entire text if changes were made, empty array otherwise
   */
  process(text: string, language: string, config: TypopoConfig): TextReplacement[] {
    const fixedText = typopo.fixTypos(text, language, config);

    if (fixedText !== text) {
      return [
        {
          offset:  0,
          length:  text.length,
          newText: fixedText,
        },
      ];
    }

    return [];
  }
}

/**
 * Applies an array of text replacements to the original text.
 * Replacements are applied in reverse order (by offset) to preserve position integrity.
 *
 * @param originalText - The original text to apply replacements to
 * @param replacements - Array of TextReplacement objects describing changes to make
 * @returns The text with all replacements applied
 */
export function applyReplacements(originalText: string, replacements: TextReplacement[]): string {
  // Sort by offset descending (apply from end to start to preserve offsets)
  const sorted = [...replacements].sort((a, b) => b.offset - a.offset);

  let result = originalText;
  for (const { offset, length, newText } of sorted) {
    result = result.substring(0, offset) + newText + result.substring(offset + length);
  }

  return result;
}
