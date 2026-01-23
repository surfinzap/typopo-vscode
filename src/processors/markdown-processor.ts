import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkFrontmatter from 'remark-frontmatter';
import { visit, SKIP } from 'unist-util-visit';
import * as typopo from 'typopo';
import { MdastNode } from '../types/remark';
import type { TextReplacement, TypopoConfig } from './text-processor';

const PROCESSABLE_NODES = new Set([
	'paragraph',
	'heading',
	'emphasis',
	'strong',
	'link',
	'blockquote',
	'delete' // strikethrough from GFM
]);

const SKIP_NODES = new Set([
	'code', // Fenced code blocks
	'inlineCode', // `backtick code`
	'html', // Raw HTML
	'table', // Tables (including all nested nodes)
	'tableRow',
	'tableCell',
	'yaml', // YAML frontmatter
	'toml' // TOML frontmatter
]);

export function processMarkdownText(
	documentText: string,
	language: string,
	typopoConfig: TypopoConfig
): TextReplacement[] {
	const replacements: TextReplacement[] = [];

	try {
		// Parse markdown with full position information
		const processor = unified()
			.use(remarkParse)
			.use(remarkGfm)
			.use(remarkFrontmatter, ['yaml', 'toml']);

		const ast = processor.parse(documentText);

		// Walk AST and collect text nodes to process
		visit(ast, undefined, (node: MdastNode, _index, parent) => {
			// Skip nodes without position info
			if (!node.position) {
				return;
			}

			// Skip explicitly excluded node types
			if (SKIP_NODES.has(node.type)) {
				return SKIP;
			}

			// Process text nodes if parent is processable
			if (node.type === 'text' && node.value && parent) {
				if (PROCESSABLE_NODES.has(parent.type)) {
					const originalText = node.value;
					const fixedText = typopo.fixTypos(originalText, language, typopoConfig);

					if (originalText !== fixedText) {
						replacements.push({
							offset: node.position.start.offset,
							length: originalText.length,
							newText: fixedText
						});
					}
				}
			}
		});

	} catch (error) {
		console.error('Markdown processing failed:', error);
		throw error; // Re-throw to trigger fallback in extension.ts
	}

	return replacements;
}

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
