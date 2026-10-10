import { fixTypos, TypopoLocale } from 'typopo';
import { MdastNode } from '../types/remark';
import type { TextReplacement, TypopoConfig } from './text-processor';

// A top-level `key: value` line. Indented lines (nested keys, list items) never match.
const FRONTMATTER_LINE = /^([\w-]+):(\s*)(.*?)(\s*)$/;

// Values that are not plain prose: double-quoted (escapes), block scalars, flow collections,
// anchors, aliases, and tags
const NON_PROSE_VALUE = /^["|>[{&*!]/;

/**
 * Applies typopo to a single frontmatter value, keeping its YAML quoting valid.
 *
 * - Plain value: fixed as is
 * - Single-quoted value: unquoted and unescaped ('' → '), fixed, then escaped and re-quoted
 */
function fixFrontmatterValue(
  raw: string,
  language: TypopoLocale,
  typopoConfig: TypopoConfig
): string {
  const quoted = raw.length > 1 && raw.startsWith("'") && raw.endsWith("'");
  const value = quoted ? raw.slice(1, -1).replaceAll("''", "'") : raw;
  const fixed = fixTypos(value, language, typopoConfig);
  return quoted ? `'${fixed.replaceAll("'", "''")}'` : fixed;
}

/**
 * Collects typography replacements for the YAML frontmatter values whose keys are listed in
 * typopoConfig.frontmatterKeys. Opt-in: without listed keys, frontmatter is never changed.
 *
 * Only the YAML block at the start of the document is inspected, line by line. Each replacement
 * covers the value alone, so keys, spacing, and line endings stay as they are.
 *
 * @param ast - The parsed MDAST root node (parsed with remark-frontmatter)
 * @param documentText - Full document text (needed for offset-based extraction)
 * @param language - Language code for typography rules
 * @param typopoConfig - Typopo configuration options
 * @returns Array of text replacements to apply to the document
 */
export function collectFrontmatterReplacements(
  ast: any,
  documentText: string,
  language: TypopoLocale,
  typopoConfig: TypopoConfig
): TextReplacement[] {
  const keys = typopoConfig.frontmatterKeys;
  if (!keys || keys.length === 0) return [];

  const node: MdastNode | undefined = ast.children?.[0];
  if (!node || node.type !== 'yaml' || !node.position) return [];

  const replacements: TextReplacement[] = [];
  const nodeStart = node.position.start.offset;
  const lines = documentText.substring(nodeStart, node.position.end.offset).split('\n');

  let lineOffset = nodeStart;
  lines.forEach((line, index) => {
    const lineStart = lineOffset;
    lineOffset += line.length + 1; // +1 for the \n removed by split

    // Skip the opening and closing --- fences
    if (index === 0 || index === lines.length - 1) return;

    const match = line.match(FRONTMATTER_LINE);
    if (!match) return;

    const [, key, gap, raw] = match;
    if (!keys.includes(key) || !raw || NON_PROSE_VALUE.test(raw)) return;

    const fixed = fixFrontmatterValue(raw, language, typopoConfig);
    if (fixed !== raw) {
      replacements.push({
        offset:  lineStart + key.length + 1 + gap.length, // +1 skips the colon
        length:  raw.length,
        newText: fixed,
      });
    }
  });

  return replacements;
}
