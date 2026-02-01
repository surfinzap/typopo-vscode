import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkFrontmatter from 'remark-frontmatter';
import { visit, SKIP } from 'unist-util-visit';
import { fixTypos, TypopoLocale } from 'typopo';
import { MdastNode } from '../types/remark';
import type { TextReplacement, TypopoConfig } from './text-processor';

const PROCESSABLE_NODES = new Set([
  'paragraph',
  'heading',
  'blockquote',
  'listItem',
  'table',
  'tableRow',
  'tableCell',
]);

const SKIP_NODES = new Set(['code', 'inlineCode', 'html', 'yaml', 'toml']);

/**
 * Represents a segment of markdown content as either processable text or preserved structure.
 * Text tokens are processed by typopo for typography fixes.
 * Element tokens (markdown syntax, code, etc.) pass through unchanged.
 */
interface Token {
  type:  'text' | 'element';
  value: string;
}

/**
 * Splits text containing blockquote continuation markers into text/element tokens.
 *
 * Remark's AST (Abstract syntax tree) includes blockquote markers (e.g., `\n  > `) in text node positions but strips
 * them from values. This reconstructs markers as element tokens so they pass through typopo
 * unchanged, preserving the original markdown structure.
 *
 * @param text - Text that may contain blockquote continuation markers
 * @returns Array of tokens with markers separated as 'element' type
 *
 * @example
 * Input: "Multiple\n  > lines"
 * Output: [{type: 'text', value: 'Multiple'}, {type: 'element', value: '\n  > '}, {type: 'text', value: 'lines'}]
 */
function splitTextWithBlockquoteMarkers(text: string): Token[] {
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
 * Recursively tokenizes a parent AST node into text and element tokens.
 *
 * Walks the node tree and separates content into:
 * - Text tokens: Processable text content (subject to typopo fixes)
 * - Element tokens: Preserved content (markdown syntax, code blocks, inline code)
 *
 * Special handling for:
 * - Blockquote markers: Separated via splitTextWithBlockquoteMarkers()
 * - Image alt text: Processed inline with typopo
 * - Code/HTML nodes: Preserved exactly as-is
 *
 * @param node - Parent AST node to tokenize
 * @param documentText - Full document text for offset-based extraction
 * @param language - Language code for typopo processing
 * @param typopoConfig - Typopo configuration options
 * @returns Array of tokens representing the node's content
 */
function tokenizeParentText(
  node: MdastNode,
  documentText: string,
  language: TypopoLocale,
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

    // Preserve markdown syntax between nodes
    if (childStart > lastPos) {
      const gap = documentText.substring(lastPos, childStart);
      if (gap.length > 0) {
        tokens.push({ type: 'element', value: gap });
      }
    }

    if (child.type === 'text' && child.value) {
      const textContent = documentText.substring(childStart, childEnd);
      const splitTokens = splitTextWithBlockquoteMarkers(textContent);
      tokens.push(...splitTokens);
    } else if (SKIP_NODES.has(child.type)) {
      // Preserve code/HTML nodes unchanged
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
        const processedAlt = fixTypos(originalAlt, language, typopoConfig);

        if (originalAlt !== processedAlt) {
          // Reconstruct image with processed alt text
          const before = elementText.substring(0, altStartIndex);
          const after = elementText.substring(altEndIndex);
          tokens.push({ type: 'element', value: before + processedAlt + after });
        } else {
          tokens.push({ type: 'element', value: elementText });
        }
      } else {
        // Malformed or empty alt
        tokens.push({ type: 'element', value: elementText });
      }
    } else if (child.children) {
      const childTokens = tokenizeParentText(child, documentText, language, typopoConfig);
      tokens.push(...childTokens);
    }

    lastPos = childEnd;
  }

  if (lastPos < endOffset) {
    const gap = documentText.substring(lastPos, endOffset);
    if (gap.length > 0) {
      tokens.push({ type: 'element', value: gap });
    }
  }

  return tokens;
}

/**
 * Main entry point for processing markdown text with typography corrections.
 *
 * Uses unified/remark to parse markdown into an AST, then selectively applies typopo
 * to text content while preserving code blocks, inline code, HTML, and frontmatter.
 * Handles markdown-specific edge cases like blockquote markers and image alt text.
 *
 * The function tokenizes processable nodes (paragraphs, headings, lists, tables, blockquotes)
 * into text and element segments, applies typopo only to text tokens, then reassembles
 * the content with proper whitespace handling for markdown formatting.
 *
 * @param documentText - Full markdown document text to process
 * @param language - Language code for typography rules (e.g., 'en-us', 'de-de')
 * @param typopoConfig - Configuration options (removeLines, etc.)
 * @returns Array of text replacements to apply to the document
 */
export function processMarkdownText(
  documentText: string,
  language: TypopoLocale,
  typopoConfig: TypopoConfig
): TextReplacement[] {
  const replacements: TextReplacement[] = [];

  try {
    const processor = unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkFrontmatter, ['yaml', 'toml']);

    const ast = processor.parse(documentText);

    visit(ast, undefined, (node: MdastNode) => {
      if (!node.position) return;
      if (SKIP_NODES.has(node.type)) return SKIP;

      if (PROCESSABLE_NODES.has(node.type)) {
        const startOffset = node.position.start.offset;
        const endOffset = node.position.end.offset;
        const originalText = documentText.substring(startOffset, endOffset);

        const tokens = tokenizeParentText(node, documentText, language, typopoConfig);

        // CRITICAL: Preserve full text including whitespace; typopo needs context for nbsp placement
        const processedTokens = tokens.map((token, index) => {
          if (token.type === 'text') {
            const hasElementBefore = index > 0 && tokens[index - 1].type === 'element';
            const hasElementAfter =
              index < tokens.length - 1 && tokens[index + 1].type === 'element';

            const leadingMatch = token.value.match(/^(\s+)/);
            const trailingMatch = token.value.match(/(\s+)$/);
            const leading = leadingMatch ? leadingMatch[1] : '';
            const trailing = trailingMatch ? trailingMatch[1] : '';

            let processed;

            // Context reconstruction for nbsp detection when followed by inline element
            // Typopo's nbsp rules need "word + space + word" context to trigger
            if (hasElementAfter && /\s$/.test(token.value)) {
              // Add dummy word to provide context, let typopo process, then extract our part
              const dummyWord = 'wo\uF8FFrd';
              const withContext = token.value + dummyWord;
              const processedWithContext = fixTypos(withContext, language, typopoConfig);

              // Extract just the token part (everything before the dummy word)
              // If nbsp was added by typopo, it will be preserved
              processed = processedWithContext.substring(
                0,
                processedWithContext.length - dummyWord.length
              );
            } else {
              processed = fixTypos(token.value, language, typopoConfig);
            }

            // If typopo removed boundary whitespace, restore it
            // This preserves spaces around markdown elements that typopo might strip
            const processedLeadingMatch = processed.match(/^(\s+)/);
            const processedTrailingMatch = processed.match(/(\s+)$/);

            if (hasElementBefore && leading && !processedLeadingMatch) {
              processed = leading + processed;
            }
            if (hasElementAfter && trailing && !processedTrailingMatch) {
              processed = processed + trailing;
            }

            return processed;
          }
          return token.value; // Element tokens pass through unchanged
        });

        const fixedText = processedTokens.join('');

        if (originalText !== fixedText) {
          replacements.push({
            offset:  startOffset,
            length:  originalText.length,
            newText: fixedText,
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
