import * as vscode from 'vscode';
import * as typopo from 'typopo';
import { processMarkdownText } from '../markdown-processor';

export interface TextReplacement {
	offset: number;
	length: number;
	newText: string;
}

export interface TypopoConfig {
	removeLines: boolean;
}

/**
 * Interface for text processors that handle different file types.
 * Processors use a strategy pattern to determine if they should handle
 * a document and how to process it.
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
 * Processor for markdown files (.md, .mdx, .mdc)
 * Uses remark AST parsing to preserve code blocks, MDC components, tables, etc.
 */
export class MarkdownProcessor implements TextProcessor {
	shouldProcess(document: vscode.TextDocument, config: any): boolean {
		const isMarkdownFile =
			document.languageId === 'markdown' ||
			document.languageId === 'mdx';

		return isMarkdownFile && (config.keepMarkdownFormatting ?? true);
	}

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
	shouldProcess(_document: vscode.TextDocument, _config: any): boolean {
		return true; // Always matches as fallback
	}

	process(text: string, language: string, config: TypopoConfig): TextReplacement[] {
		const fixedText = typopo.fixTypos(text, language, config);

		// If text changed, return a single replacement for the entire text
		if (fixedText !== text) {
			return [
				{
					offset: 0,
					length: text.length,
					newText: fixedText
				}
			];
		}

		return [];
	}
}
