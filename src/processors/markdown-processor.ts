import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkFrontmatter from 'remark-frontmatter';
import { visit, SKIP } from 'unist-util-visit';
import * as typopo from 'typopo';
import { MdastNode } from '../types/remark';
import type { TextReplacement, TypopoConfig } from './text-processor';

const PROCESSABLE_NODES = new Set([
  "paragraph",
  "heading",
  "blockquote",
  "listItem", // Process list items (previously missing)
  "table", // Tables (including all nested nodes)
  "tableRow",
  "tableCell",
]);

const SKIP_NODES = new Set([
	'code', // Fenced code blocks
	'inlineCode', // `backtick code`
	'html', // Raw HTML
	'yaml', // YAML frontmatter
	'toml', // TOML frontmatter
]);

/**
 * Token representing either plain text or an inline element.

 */
interface Token {
	type: 'text' | 'element';
	value: string;
}

/**
 * Split text containing blockquote continuation markers into element/text tokens.
 * This ensures typopo only processes actual text content, not markdown syntax.
 *
 * Context: Remark parses consecutive blockquote lines like:
 *   > block
 *   > block
 * into a single <p> (which renders as "block block" in HTML, since newlines become spaces).
 *
 * We preserve the original markdown structure without interpreting user intent:
 * - If they wrote `> line\n> line` → preserve it as-is with both `>` markers
 * - If they wrote `> line\n>\n> line` → preserve it as-is (two paragraphs)
 *
 * Technical detail: Remark's text node position offsets span the document range including continuation markers (e.g., `\n  > `), but the `value` field has them stripped out.
 * This function reconstructs the markers as element tokens so they pass through typopo unchanged, completing the tokenization that remark started but didn't finish.
 *
 * Example:
 *   Input: "Multiple\n  > lines with \"quotes\""
 *   Output: [
 *     { type: 'text', value: 'Multiple' },
 *     { type: 'element', value: '\n  > ' },
 *     { type: 'text', value: 'lines with "quotes"' }
 *   ]
 */
function splitTextWithBlockquoteMarkers(text: string): Token[] {
	// If no newlines, return single text token
	if (!text.includes('\n')) {
		return [{ type: 'text', value: text }];
	}

	const lines = text.split('\n');
	const tokens: Token[] = [];

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];

		// Check if line starts with blockquote marker (optional whitespace + > + optional whitespace)
		const markerMatch = line.match(/^([\s]*>[\s]*)/);

		if (i > 0) {
			// Add newline + marker as element token (not processed by typopo)
			if (markerMatch) {
				tokens.push({ type: 'element', value: '\n' + markerMatch[1] });
			} else {
				tokens.push({ type: 'element', value: '\n' });
			}
		}

		// Add text content (without marker if present)
		const textContent = markerMatch ? line.substring(markerMatch[1].length) : line;
		if (textContent.length > 0 || i === 0) {
			// Always add token for first line (even if empty)
			// For other lines, only add if non-empty
			tokens.push({ type: 'text', value: textContent });
		}
	}

	return tokens;
}

/**
 * Tokenize parent node text into alternating plain text and inline element segments.
 */
function tokenizeParentText(
	node: MdastNode,
	documentText: string,
	language: string,
	typopoConfig: TypopoConfig
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
			const splitTokens = splitTextWithBlockquoteMarkers(textContent);
			tokens.push(...splitTokens);
		} else if (SKIP_NODES.has(child.type)) {
			// Skip node (code, inlineCode, etc.) - preserve exactly as-is
			const elementText = documentText.substring(childStart, childEnd);
			tokens.push({ type: 'element', value: elementText });
		} else if (child.type === 'image') {
			// Special handling for image nodes - process alt text
			const elementText = documentText.substring(childStart, childEnd);

			// Find alt text in original markdown (between ![...])
			const altStartIndex = elementText.indexOf('![') + 2;
			const altEndIndex = elementText.indexOf('](');

			if (altStartIndex > 1 && altEndIndex > altStartIndex) {
				// Extract and process alt text
				const originalAlt = elementText.substring(altStartIndex, altEndIndex);
				const processedAlt = typopo.fixTypos(originalAlt, language, typopoConfig);

				if (originalAlt !== processedAlt) {
					// Reconstruct image with processed alt text
					const before = elementText.substring(0, altStartIndex);
					const after = elementText.substring(altEndIndex);
					tokens.push({ type: 'element', value: before + processedAlt + after });
				} else {
					// No change needed
					tokens.push({ type: 'element', value: elementText });
				}
			} else {
				// Malformed or empty alt
				tokens.push({ type: 'element', value: elementText });
			}
		} else if (child.children) {
			// Recursively tokenize children
			const childTokens = tokenizeParentText(child, documentText, language, typopoConfig);
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

				// Tokenize parent text 
				const tokens = tokenizeParentText(node, documentText, language, typopoConfig);

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

				return SKIP;
			}
		});

	} catch (error) {
		console.error('Markdown processing failed:', error);
		throw error;
	}

	return replacements;
}
