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
	'blockquote',
	'listItem', // Process list items (previously missing)
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

/**
 * Token representing either plain text or an inline element.

 */
interface Token {
	type: 'text' | 'element';
	value: string;
}

/**
 * Tokenize parent node text into alternating plain text and inline element segments.
 * Similar to WordPress's wptexturize approach for processing HTML while preserving tags.
 */
function tokenizeParentText(
	node: MdastNode,
	documentText: string
): Token[] {
	const tokens: Token[] = [];
	const startOffset = node.position!.start.offset;
	const endOffset = node.position!.end.offset;

	const children: MdastNode[] = node.children || [];
	let lastPos = startOffset;

	for (const child of children) {
		if (!child.position) continue;

		const childStart = child.position.start.offset;
		const childEnd = child.position.end.offset;

		// Add gap before this child as element token (markdown syntax like "**" or "`")
		if (childStart > lastPos) {
			const gap = documentText.substring(lastPos, childStart);
			if (gap.length > 0) {
				tokens.push({ type: 'element', value: gap });
			}
		}

		// Add child content
		if (child.type === 'text' && child.value) {
			const textContent = documentText.substring(childStart, childEnd);
			tokens.push({ type: 'text', value: textContent });
		} else if (SKIP_NODES.has(child.type)) {
			// Skip node (code, inlineCode, etc.) - preserve exactly as-is
			const elementText = documentText.substring(childStart, childEnd);
			tokens.push({ type: 'element', value: elementText });
		} else if (child.children) {
			// Recursively tokenize children
			const childTokens = tokenizeParentText(child, documentText);
			tokens.push(...childTokens);
		}

		lastPos = childEnd;
	}

	// Add any remaining text after last child
	if (lastPos < endOffset) {
		const gap = documentText.substring(lastPos, endOffset);
		if (gap.length > 0) {
			tokens.push({ type: 'element', value: gap });
		}
	}

	return tokens;
}

export function processMarkdownText(
	documentText: string,
	language: string,
	typopoConfig: TypopoConfig
): TextReplacement[] {
	const replacements: TextReplacement[] = [];

	try {
		const processor = unified()
			.use(remarkParse)
			.use(remarkGfm)
			.use(remarkFrontmatter, ['yaml', 'toml']);

		const ast = processor.parse(documentText);

		// Visit parent-level nodes
		visit(ast, undefined, (node: MdastNode) => {
			if (!node.position) return;
			if (SKIP_NODES.has(node.type)) return SKIP;

			// Process parent-level nodes (paragraph, heading, blockquote, listItem)
			if (PROCESSABLE_NODES.has(node.type)) {
				const startOffset = node.position.start.offset;
				const endOffset = node.position.end.offset;
				const originalText = documentText.substring(startOffset, endOffset);

				// Tokenize parent text (WordPress-style approach)
				const tokens = tokenizeParentText(node, documentText);

				// Process only text tokens with typopo, pass through element tokens unchanged
				// CRITICAL: Preserve full text including whitespace - typopo needs context for nbsp placement
				const processedTokens = tokens.map((token, index) => {
					if (token.type === 'text') {
						const hasElementBefore = index > 0 && tokens[index - 1].type === 'element';
						const hasElementAfter = index < tokens.length - 1 && tokens[index + 1].type === 'element';

						// Extract leading and trailing whitespace
						const leadingMatch = token.value.match(/^(\s+)/);
						const trailingMatch = token.value.match(/(\s+)$/);
						const leading = leadingMatch ? leadingMatch[1] : '';
						const trailing = trailingMatch ? trailingMatch[1] : '';

						// Process with typopo, using context reconstruction for nbsp when needed
						let processed;

						// Context reconstruction for nbsp detection when followed by inline element
						// Typopo's nbsp rules need "word + space + word" context to trigger
						if (hasElementAfter && /\s$/.test(token.value)) {
							// Add dummy word to provide context, let typopo process, then extract our part
							const dummyWord = 'word';
							const withContext = token.value + dummyWord;
							const processedWithContext = typopo.fixTypos(withContext, language, typopoConfig);

							// Extract just the token part (everything before the dummy word)
							// If nbsp was added by typopo, it will be preserved
							processed = processedWithContext.substring(0, processedWithContext.length - dummyWord.length);
						} else {
							// Normal processing without context reconstruction
							processed = typopo.fixTypos(token.value, language, typopoConfig);
						}

						// If typopo removed boundary whitespace, restore it
						// This preserves spaces around markdown elements that typopo might strip
						// NOTE: Check for ANY whitespace, not just the original - typopo may transform space to nbsp
						const processedLeadingMatch = processed.match(/^(\s+)/);
						const processedTrailingMatch = processed.match(/(\s+)$/);

						if (hasElementBefore && leading && !processedLeadingMatch) {
							// Leading whitespace was completely removed by typopo, restore it
							processed = leading + processed;
						}
						if (hasElementAfter && trailing && !processedTrailingMatch) {
							// Trailing whitespace was completely removed by typopo, restore it
							processed = processed + trailing;
						}

						return processed;
					}
					return token.value;  // Element tokens (markdown syntax, inline code) pass through
				});

				// Reassemble tokens
				const fixedText = processedTokens.join('');

				// Create single replacement for entire parent if text changed
				if (originalText !== fixedText) {
					replacements.push({
						offset: startOffset,
						length: originalText.length,
						newText: fixedText
					});
				}

				// Skip visiting children since we've already processed this entire subtree
				return SKIP;
			}
		});

	} catch (error) {
		console.error('Markdown processing failed:', error);
		throw error;
	}

	return replacements;
}
