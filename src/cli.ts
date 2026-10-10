// Runs the extension's Markdown/MDC processing on files, outside VS Code.
// Usage: typopo-vscode [--check] [--locale en-us] [--remove-lines] [--frontmatter-keys a,b] <files or directories…>
// - a directory means every .md, .mdc, and .mdx file directly in it
// - [--check] writes nothing, lists the lines that would change, and exits 1 if there are any
// The text is read and written as it is on disk, line endings included, the way the editor
// hands a document to the extension.
// This file must not import 'vscode', directly or through selection-helper.ts.
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import type { TypopoLocale } from 'typopo';
import { processMdcText } from './processors/mdc-processor';
import { applyReplacements, type TypopoConfig } from './processors/text-processor';

const USAGE =
  'Usage: typopo-vscode [--check] [--locale en-us] [--remove-lines] [--frontmatter-keys a,b] <files or directories…>';

const MARKDOWN_FILE = /\.(md|mdc|mdx)$/;

function fail(message: string): never {
  console.error(message);
  process.exit(2);
}

function parseCliArgs() {
  try {
    return parseArgs({
      options: {
        check:              { type: 'boolean', default: false },
        locale:             { type: 'string', default: 'en-us' },
        'remove-lines':     { type: 'boolean', default: false },
        'frontmatter-keys': { type: 'string', default: '' },
      },
      allowPositionals: true,
    });
  } catch (error) {
    fail(`${error instanceof Error ? error.message : error}\n${USAGE}`);
  }
}

const { values, positionals } = parseCliArgs();

if (positionals.length === 0) fail(USAGE);

const config: TypopoConfig = {
  removeLines:     values['remove-lines'],
  frontmatterKeys: values['frontmatter-keys']
    .split(',')
    .map((key) => key.trim())
    .filter(Boolean),
};

const files = positionals.flatMap((target) => {
  const stats = statSync(target, { throwIfNoEntry: false });
  if (!stats) fail(`typopo-vscode: no such file or directory: ${target}`);

  return stats.isDirectory()
    ? readdirSync(target)
        .filter((file) => MARKDOWN_FILE.test(file))
        .map((file) => join(target, file))
    : [target];
});

// Makes invisible characters readable in the --check report
const visible = (text: string) => text.replaceAll(' ', '⍽');

let changedFiles = 0;

for (const file of files) {
  const source = readFileSync(file, 'utf8');
  const replacements = processMdcText(source, values.locale as TypopoLocale, config);
  const fixed = applyReplacements(source, replacements);
  if (fixed === source) continue;

  changedFiles++;
  const before = source.split(/\r?\n/);
  const after = fixed.split(/\r?\n/);
  const changedLines = before.flatMap((line, index) => (line === after[index] ? [] : [index]));

  if (values.check) {
    console.log(`${file}: ${changedLines.length} line(s) would change (⍽ is a non-breaking space)`);
    for (const index of changedLines) {
      console.log(`  ${index + 1}  - ${visible(before[index] ?? '')}`);
      console.log(`  ${index + 1}  + ${visible(after[index] ?? '')}`);
    }
  } else {
    writeFileSync(file, fixed);
    console.log(`${file}: fixed ${changedLines.length} line(s)`);
  }
}

if (changedFiles === 0) console.log(`${files.length} file(s) checked, nothing to fix`);
if (values.check && changedFiles > 0) process.exitCode = 1;
