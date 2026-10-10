import * as esbuild from 'esbuild';

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

const extensionBuild = {
  entryPoints:    ['src/extension.ts'],
  bundle:         true,
  format:         'cjs',
  minify:         production,
  sourcemap:      !production,
  sourcesContent: false,
  platform:       'node',
  outfile:        'dist/extension.js',
  external:       ['vscode'],
  logLevel:       'info',
  // Disable tree shaking to ensure all code is included
  treeShaking:    true,
};

// Command-line entry. CommonJS, not ESM: remark-mdc pulls in yaml, which is CommonJS, and an
// ESM bundle fails at start-up with "Dynamic require of "process" is not supported". The .cjs
// extension lets it run from a "type": "module" project.
const cliBuild = {
  entryPoints: ['src/cli.ts'],
  bundle:      true,
  format:      'cjs',
  minify:      production,
  platform:    'node',
  outfile:     'dist/cli.cjs',
  banner:      { js: '#!/usr/bin/env node' },
  logLevel:    'info',
};

async function main() {
  const contexts = await Promise.all([esbuild.context(extensionBuild), esbuild.context(cliBuild)]);

  if (watch) {
    await Promise.all(contexts.map((ctx) => ctx.watch()));
    console.log('Watching for changes...');
  } else {
    await Promise.all(contexts.map((ctx) => ctx.rebuild()));
    await Promise.all(contexts.map((ctx) => ctx.dispose()));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
