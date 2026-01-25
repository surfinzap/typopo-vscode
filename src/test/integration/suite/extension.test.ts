import * as assert from 'assert';
import * as vscode from 'vscode';
import { before, after, afterEach, describe, it } from 'mocha';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  rawTextProcessorTestSet,
  langConfigTestSet,
  removeLinesConfigTestSet,
} from '../../fixtures/test-data';

describe('Extension Integration Tests', () => {
  let originalConfig: any = {};

  before(async () => {
    // Save original configuration
    const config = vscode.workspace.getConfiguration('typopo');
    originalConfig = {
      language:    config.get('language'),
      removeLines: config.get('removeLines'),
    };

    // Ensure extension is activated
    const extension = vscode.extensions.getExtension('brano.typopo-vscode');
    if (extension && !extension.isActive) {
      await extension.activate();
    }
  });

  after(async () => {
    // Restore original configuration
    const config = vscode.workspace.getConfiguration('typopo');
    for (const [key, value] of Object.entries(originalConfig)) {
      await config.update(key, value, vscode.ConfigurationTarget.Global);
    }

    // Cleanup: close all editors
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
  });

  afterEach(async () => {
    // Close all editors after each test
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
  });

  describe('Raw text replacements', () => {
    it('should register the fixTypos command', async () => {
      const commands = await vscode.commands.getCommands(true);
      assert.ok(commands.includes('typopo-vscode.fixTypos'));
    });

    for (const [input, expected] of Object.entries(rawTextProcessorTestSet)) {
      it(`should fix: ${input}`, async () => {
        const doc = await vscode.workspace.openTextDocument({
          content:  input,
          language: 'plaintext',
        });
        const editor = await vscode.window.showTextDocument(doc);

        // Select all text
        editor.selection = new vscode.Selection(
          new vscode.Position(0, 0),
          new vscode.Position(0, input.length)
        );

        await vscode.commands.executeCommand('typopo-vscode.fixTypos');

        assert.strictEqual(doc.getText(), expected);
      });
    }
  });

  describe('Processor selection (auto-detection)', () => {
    it('should use MarkdownProcessor for markdown files by default', async () => {
      const input = '# Hello "world"';

      const doc = await vscode.workspace.openTextDocument({
        content:  input,
        language: 'markdown',
      });
      const editor = await vscode.window.showTextDocument(doc);

      editor.selection = new vscode.Selection(
        new vscode.Position(0, 0),
        new vscode.Position(0, input.length)
      );

      await vscode.commands.executeCommand('typopo-vscode.fixTypos');

      const result = doc.getText();
      // MarkdownProcessor should convert quotes while preserving markdown structure
      assert.ok(result.includes('# Hello'));
      assert.ok(result.includes('“world”'));
    });

    it('should use MarkdownProcessor for mdx files', async () => {
      const input = '# Component "test"';

      const doc = await vscode.workspace.openTextDocument({
        content:  input,
        language: 'mdx',
      });
      const editor = await vscode.window.showTextDocument(doc);

      editor.selection = new vscode.Selection(
        new vscode.Position(0, 0),
        new vscode.Position(0, input.length)
      );

      await vscode.commands.executeCommand('typopo-vscode.fixTypos');

      const result = doc.getText();
      // MarkdownProcessor should preserve markdown structure
      assert.ok(result.includes('# Component'));
    });

    it('should use MarkdownProcessor for mdc files', async () => {
      const input = '# Component "test"';

      const doc = await vscode.workspace.openTextDocument({
        content:  input,
        language: 'mdc',
      });
      const editor = await vscode.window.showTextDocument(doc);

      editor.selection = new vscode.Selection(
        new vscode.Position(0, 0),
        new vscode.Position(0, input.length)
      );

      await vscode.commands.executeCommand('typopo-vscode.fixTypos');

      const result = doc.getText();
      // MarkdownProcessor should preserve markdown structure
      assert.ok(result.includes('# Component'));
    });

    it('should use RawTextProcessor for plaintext files', async () => {
      const input = '"hello"';
      const expected = '“hello”';

      const doc = await vscode.workspace.openTextDocument({
        content:  input,
        language: 'plaintext',
      });
      const editor = await vscode.window.showTextDocument(doc);

      editor.selection = new vscode.Selection(
        new vscode.Position(0, 0),
        new vscode.Position(0, input.length)
      );

      await vscode.commands.executeCommand('typopo-vscode.fixTypos');

      assert.strictEqual(doc.getText(), expected);
    });
  });

  describe('Configuration Tests', () => {
    for (const [language, testCases] of Object.entries(langConfigTestSet)) {
      for (const [input, expected] of Object.entries(testCases as Record<string, string>)) {
        it(`should respect language setting (${language}): ${input}`, async () => {
          const config = vscode.workspace.getConfiguration('typopo');
          await config.update('language', language, vscode.ConfigurationTarget.Global);

          const doc = await vscode.workspace.openTextDocument({
            content:  input,
            language: 'plaintext',
          });
          const editor = await vscode.window.showTextDocument(doc);

          editor.selection = new vscode.Selection(
            new vscode.Position(0, 0),
            new vscode.Position(0, input.length)
          );

          await vscode.commands.executeCommand('typopo-vscode.fixTypos');

          assert.strictEqual(doc.getText(), expected);
        });
      }
    }

    for (const [removeLinesStr, testCases] of Object.entries(removeLinesConfigTestSet)) {
      const removeLines = removeLinesStr === 'true';
      for (const [input, expected] of Object.entries(testCases as Record<string, string>)) {
        it(`should respect removeLines setting (${removeLinesStr}): ${input.replace(/\n/g, '\\n')}`, async () => {
          const config = vscode.workspace.getConfiguration('typopo');
          await config.update('language', 'en-us', vscode.ConfigurationTarget.Global);
          await config.update('removeLines', removeLines, vscode.ConfigurationTarget.Global);

          const doc = await vscode.workspace.openTextDocument({
            content:  input,
            language: 'plaintext',
          });
          const editor = await vscode.window.showTextDocument(doc);

          editor.selection = new vscode.Selection(
            new vscode.Position(0, 0),
            doc.lineAt(doc.lineCount - 1).range.end
          );

          await vscode.commands.executeCommand('typopo-vscode.fixTypos');

          assert.strictEqual(doc.getText(), expected);
        });
      }
    }

    it('should use default values when config is not explicitly set', async () => {
      const config = vscode.workspace.getConfiguration('typopo');
      await config.update('language', 'en-us', vscode.ConfigurationTarget.Global);

      const input = '"hello"';
      const expected = '“hello”';

      const doc = await vscode.workspace.openTextDocument({
        content:  input,
        language: 'plaintext',
      });
      const editor = await vscode.window.showTextDocument(doc);

      editor.selection = new vscode.Selection(
        new vscode.Position(0, 0),
        new vscode.Position(0, input.length)
      );

      await vscode.commands.executeCommand('typopo-vscode.fixTypos');

      assert.strictEqual(doc.getText(), expected);
    });
  });

  describe('Selection Handling Tests', () => {
    it('should process selected text only', async () => {
      const input = 'first "hello" second "hello"';

      const doc = await vscode.workspace.openTextDocument({
        content:  input,
        language: 'plaintext',
      });
      const editor = await vscode.window.showTextDocument(doc);

      editor.selection = new vscode.Selection(
        new vscode.Position(0, 6),
        new vscode.Position(0, 13)
      );

      await vscode.commands.executeCommand('typopo-vscode.fixTypos');

      // Only the first "hello" should change
      assert.strictEqual(doc.getText(), 'first “hello” second "hello"');
    });

    it('should process current line when selection is empty', async () => {
      const input = 'first "hello"\nsecond "hello"';

      const doc = await vscode.workspace.openTextDocument({
        content:  input,
        language: 'plaintext',
      });
      const editor = await vscode.window.showTextDocument(doc);

      // Empty selection
      editor.selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, 0));

      await vscode.commands.executeCommand('typopo-vscode.fixTypos');

      // First line should be processed
      const lines = doc.getText().split('\n');
      assert.strictEqual(lines[0], 'first “hello”');
      assert.strictEqual(lines[1], 'second "hello"'); // Second line unchanged
    });

    it('should handle multiple selections', async () => {
      const input = '"hello" and "world"';

      const doc = await vscode.workspace.openTextDocument({
        content:  input,
        language: 'plaintext',
      });
      const editor = await vscode.window.showTextDocument(doc);

      // Two selections: "hello" and "world"
      editor.selections = [
        new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, 7)),
        new vscode.Selection(new vscode.Position(0, 12), new vscode.Position(0, 19)),
      ];

      await vscode.commands.executeCommand('typopo-vscode.fixTypos');

      assert.strictEqual(doc.getText(), '“hello” and “world”');
    });
  });

  describe('Error Handling Tests', () => {
    it('should handle no active editor gracefully', async () => {
      await vscode.commands.executeCommand('workbench.action.closeAllEditors');

      // Should not throw
      await vscode.commands.executeCommand('typopo-vscode.fixTypos');

      // No assertions needed - just verify no error thrown
      assert.ok(true);
    });
  });

  describe('Comprehensive markdown fixture test', () => {
    it('should correctly process complete markdown document', async () => {
      const fixturesPath = join(__dirname, '../../../../src/test/fixtures');
      const source = readFileSync(join(fixturesPath, 'md-source.md'), 'utf-8');
      const expected = readFileSync(join(fixturesPath, 'md-fixed.md'), 'utf-8');

      const doc = await vscode.workspace.openTextDocument({
        content:  source,
        language: 'markdown',
      });
      const editor = await vscode.window.showTextDocument(doc);

      // Select all content
      const lastLine = doc.lineCount - 1;
      const lastChar = doc.lineAt(lastLine).text.length;
      editor.selection = new vscode.Selection(
        new vscode.Position(0, 0),
        new vscode.Position(lastLine, lastChar)
      );

      await vscode.commands.executeCommand('typopo-vscode.fixTypos');

      assert.strictEqual(doc.getText(), expected);
    });
  });
});
