import * as vscode from 'vscode';
import * as typopo from 'typopo';
import { processMarkdownText, applyReplacements } from './markdown-processor';

interface TypopoConfig {
	removeLines: boolean;
}

// Helper function to convert VS Code Position to byte offset
function positionToOffset(document: vscode.TextDocument, position: vscode.Position): number {
	const range = new vscode.Range(new vscode.Position(0, 0), position);
	return Buffer.byteLength(document.getText(range), 'utf8');
}

// Legacy processing function (non-markdown-aware)
function useLegacyProcessing(
	editor: vscode.TextEditor,
	document: vscode.TextDocument,
	language: string,
	config: TypopoConfig
): void {
	editor.edit(editBuilder => {
		editor.selections.forEach(selection => {
			let text = document.getText(selection);
			let effectiveSelection = selection;

			// if no text is selected, then select the line
			if (text === '') {
				const position = selection.active;
				const lineRange = document.lineAt(position).range;
				effectiveSelection = new vscode.Selection(lineRange.start, lineRange.end);
				text = document.getText(effectiveSelection);
			}

			const fixedText = typopo.fixTypos(text, language, config);
			editBuilder.replace(effectiveSelection, fixedText);
		});
	});
}

export function activate(context: vscode.ExtensionContext): void {
	context.subscriptions.push(
		vscode.commands.registerCommand('typopo-vscode.fixTypos', function () {
			// get the active text editor
			const editor = vscode.window.activeTextEditor;

			if (!editor) {
				return;
			}

			const document = editor.document;

			// check for user config
			const extensionConfig = vscode.workspace.getConfiguration('typopo');

			const language = extensionConfig.get<string>('language') || 'en-us';
			const config: TypopoConfig = {
				removeLines: extensionConfig.get<boolean>('removeLines') || false,
			};
			const keepMarkdownFormatting = extensionConfig.get<boolean>('keepMarkdownFormatting') ?? true;

			// Detect if markdown file
			const isMarkdown =
        document.languageId === "markdown" ||
        document.languageId === "mdx" ||
        document.languageId === "mdc";

			// Decide processing mode
			const useMarkdownAware = isMarkdown && keepMarkdownFormatting;

			if (useMarkdownAware) {
				// Markdown-aware processing
				try {
					const documentText = document.getText();
					const replacements = processMarkdownText(documentText, language, config);

					editor.edit(editBuilder => {
						editor.selections.forEach(selection => {
							// Handle empty selection (select current line)
							let effectiveSelection = selection;
							if (selection.isEmpty) {
								const lineRange = document.lineAt(selection.active).range;
								effectiveSelection = new vscode.Selection(lineRange.start, lineRange.end);
							}

							// Convert selection positions to byte offsets
							const selectionStart = positionToOffset(document, effectiveSelection.start);
							const selectionEnd = positionToOffset(document, effectiveSelection.end);

							// Filter replacements to selection range
							const relevantReplacements = replacements.filter(r =>
								r.offset >= selectionStart && r.offset < selectionEnd
							);

							// Get selection text and adjust replacement offsets to be relative
							const selectionText = document.getText(effectiveSelection);
							const adjustedReplacements = relevantReplacements.map(r => ({
								offset: r.offset - selectionStart,
								length: r.length,
								newText: r.newText
							}));

							// Apply and replace
							const fixedText = applyReplacements(selectionText, adjustedReplacements);
							editBuilder.replace(effectiveSelection, fixedText);
						});
					});

				} catch (error) {
					console.error('Markdown-aware processing failed, falling back to legacy:', error);
					useLegacyProcessing(editor, document, language, config);
				}

			} else {
				// Legacy processing for non-markdown files or when markdown-aware is disabled
				useLegacyProcessing(editor, document, language, config);
			}
		})
	);
}



// this method is called when your extension is deactivated
export function deactivate(): void {}
