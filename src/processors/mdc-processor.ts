import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkFrontmatter from 'remark-frontmatter';
import remarkMdc from 'remark-mdc';
import { visit } from 'unist-util-visit';
import { fixTypos, TypopoLocale } from 'typopo';
import { MdastNode } from '../types/remark';
import type { TextReplacement, TypopoConfig } from './text-processor';
import { collectMarkdownReplacements } from './markdown-processor';

/**
 * Applies typopo to each ="value" pair inside a {attrs} block embedded in a raw text fragment.
 * The surrounding syntax (braces, keys, bare flags) is left unchanged.
 */
function fixPropsInBraces(
  text: string,
  language: TypopoLocale,
  typopoConfig: TypopoConfig
): string {
  const braceStart = text.indexOf('{');
  if (braceStart === -1) return text;

  const braceEnd = text.lastIndexOf('}');
  if (braceEnd <= braceStart) return text;

  const before = text.substring(0, braceStart + 1);
  const attrsText = text.substring(braceStart + 1, braceEnd);
  const after = text.substring(braceEnd);

  const fixedAttrs = attrsText.replace(/"([^"]*)"/g, (_, value) => {
    const fixed = fixTypos(value, language, typopoConfig);
    return `"${fixed}"`;
  });

  return before + fixedAttrs + after;
}

/**
 * Returns true when an element token contains MDC component prop syntax that needs fixing.
 *
 * Two forms covered:
 * - `]{attrs}` — the suffix of a textComponent with bracket content (:badge[text]{attrs})
 * - `:name{attrs}` — a textComponent with attrs only and no bracket content (:icon{attrs})
 *
 * Regular markdown element tokens (*,**,_,~~, `code`, ](url)) never match these patterns.
 */
function isMdcPropToken(value: string): boolean {
  return value.startsWith(']{') || (/^:[\w-]/.test(value) && value.includes('{'));
}

/**
 * Emits TextReplacements for typed prop string values in a containerComponent opening line.
 *
 * Only the opening line (from node start to the first slot-content child) is inspected,
 * so the slot paragraphs and closing :: are never touched by this function.
 */
function processContainerComponentProps(
  node: MdastNode,
  documentText: string,
  language: TypopoLocale,
  typopoConfig: TypopoConfig
): TextReplacement[] {
  const replacements: TextReplacement[] = [];
  const nodeStart = node.position!.start.offset;

  const firstChild = node.children?.[0];
  const openingLineEnd = firstChild?.position?.start.offset ?? node.position!.end.offset;
  const openingLine = documentText.substring(nodeStart, openingLineEnd);

  const braceStart = openingLine.indexOf('{');
  if (braceStart === -1) return replacements;

  const braceEnd = openingLine.lastIndexOf('}');
  if (braceEnd <= braceStart) return replacements;

  const attrsText = openingLine.substring(braceStart + 1, braceEnd);
  const attrsDocOffset = nodeStart + braceStart + 1;

  const valueRegex = /="([^"]*)"/g;
  let match;
  while ((match = valueRegex.exec(attrsText)) !== null) {
    const value = match[1];
    const valueDocOffset = attrsDocOffset + match.index + 2; // +2 skips ="
    const fixedValue = fixTypos(value, language, typopoConfig);
    if (value !== fixedValue) {
      replacements.push({ offset: valueDocOffset, length: value.length, newText: fixedValue });
    }
  }

  return replacements;
}

/**
 * Emits TextReplacements for typed prop string values of a textComponent that is NOT inside
 * a paragraph (e.g. a standalone `:icon{name="arrow..."}` at root level).
 *
 * textComponent props that appear inside paragraphs are handled inline via the
 * processElementToken callback in Pass 1, avoiding position-overlap with the paragraph
 * replacement. This function only runs for the non-paragraph case.
 *
 * Uses lastIndexOf('{') to correctly locate the {attrs} block after any bracket content.
 */
function processStandaloneTextComponentProps(
  node: MdastNode,
  documentText: string,
  language: TypopoLocale,
  typopoConfig: TypopoConfig
): TextReplacement[] {
  const replacements: TextReplacement[] = [];
  const nodeStart = node.position!.start.offset;
  const nodeEnd = node.position!.end.offset;
  const nodeText = documentText.substring(nodeStart, nodeEnd);

  // lastIndexOf finds the attrs { even when bracket content precedes it
  const braceStart = nodeText.lastIndexOf('{');
  if (braceStart === -1) return replacements;

  const braceEnd = nodeText.lastIndexOf('}');
  if (braceEnd <= braceStart) return replacements;

  const attrsText = nodeText.substring(braceStart + 1, braceEnd);
  const attrsDocOffset = nodeStart + braceStart + 1;

  const valueRegex = /="([^"]*)"/g;
  let match;
  while ((match = valueRegex.exec(attrsText)) !== null) {
    const value = match[1];
    const valueDocOffset = attrsDocOffset + match.index + 2;
    const fixedValue = fixTypos(value, language, typopoConfig);
    if (value !== fixedValue) {
      replacements.push({ offset: valueDocOffset, length: value.length, newText: fixedValue });
    }
  }

  return replacements;
}

/**
 * Processes an MDC document for typography corrections.
 *
 * Extends the base markdown processing pipeline with remark-mdc and two MDC-specific passes:
 *
 * Pass 1 — text content + inline prop values (textComponent inside paragraphs)
 *   Runs collectMarkdownReplacements with a processElementToken hook that detects MDC prop
 *   tokens (`:name{attrs}` and `]{attrs}` element token forms) and fixes their string values
 *   inline, so they are woven into the same paragraph replacement — avoiding position overlap.
 *
 * Pass 2 — container and standalone component prop values
 *   Visits containerComponent nodes and applies typography to their opening-line prop strings.
 *   Also handles standalone textComponent nodes (not inside a paragraph) whose props are not
 *   covered by Pass 1.
 *
 * @param documentText - Full MDC document text to process
 * @param language - Language code for typography rules (e.g., 'en-us', 'de-de')
 * @param typopoConfig - Configuration options (removeLines, etc.)
 * @returns Array of text replacements to apply to the document
 */
export function processMdcText(
  documentText: string,
  language: TypopoLocale,
  typopoConfig: TypopoConfig
): TextReplacement[] {
  try {
    // remark-mdc's previous() check calls markdownLineEndingOrSpace() which only accepts ASCII space (0x20), not non-breaking space (0xa0). A nbsp directly before ':name[' or ':name{' causes remark-mdc to misparse the textComponent. Replace such nbsp with a plain space for parsing. Both are single BMP code points, so all offsets are identical between the shadow document and the original — replacements apply directly.
    const parseDocument = documentText.replace(/ (:[\w-])/g, ' $1');

    const ast = unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkFrontmatter, ['yaml', 'toml'])
      .use(remarkMdc)
      .parse(parseDocument);

    // Pass 1: prose text content + textComponent prop values embedded in paragraph tokens
    const processElementToken = (value: string): string =>
      isMdcPropToken(value) ? fixPropsInBraces(value, language, typopoConfig) : value;

    const replacements = collectMarkdownReplacements(
      ast,
      parseDocument,
      language,
      typopoConfig,
      processElementToken
    );

    // Pass 2: containerComponent opening-line props (never overlap with paragraph replacements)
    //         + standalone textComponent props (not inside a paragraph, so not covered by Pass 1)
    visit(ast, undefined, (node: MdastNode, _index: number | undefined, parent: any) => {
      if (!node.position) return;

      if (node.type === 'containerComponent') {
        const propReps = processContainerComponentProps(
          node,
          parseDocument,
          language,
          typopoConfig
        );
        replacements.push(...propReps);
      } else if (node.type === 'textComponent' && parent?.type !== 'paragraph') {
        // Inside a paragraph, props are already fixed inline in Pass 1.
        // At root level or inside a containerComponent slot directly, handle here.
        const propReps = processStandaloneTextComponentProps(
          node,
          parseDocument,
          language,
          typopoConfig
        );
        replacements.push(...propReps);
      }
    });

    return replacements;
  } catch (error) {
    console.error('MDC processing failed:', error);
    throw error;
  }
}
