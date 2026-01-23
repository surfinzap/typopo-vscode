import * as vscode from 'vscode';
import { TypopoConfig, TextProcessor, MarkdownProcessor, RawTextProcessor } from './processors/text-processor';
import { applyReplacementsToSelections } from './selection-helper';

export function activate(context: vscode.ExtensionContext): void {
	// Initialize processors - order matters! First match wins.
	// Add new processors (HTML, JavaScript, etc.) to this array in the future
	const processors: TextProcessor[] = [
		new MarkdownProcessor(),
		new RawTextProcessor() // Fallback - always matches, should be last
	];

	context.subscriptions.push(
		vscode.commands.registerCommand('typopo-vscode.fixTypos', function () {
			// Get the active text editor
			const editor = vscode.window.activeTextEditor;
			if (!editor) {
				return;
			}

			const document = editor.document;

			// Load user configuration
			const extensionConfig = vscode.workspace.getConfiguration('typopo');
			const language = extensionConfig.get<string>('language') || 'en-us';
			const config: TypopoConfig = {
				removeLines: extensionConfig.get<boolean>('removeLines') || false,
			};

			// Pass config with markdown-specific settings for processor selection
			const processorConfig = {
				...config,
				keepMarkdownFormatting: extensionConfig.get<boolean>('keepMarkdownFormatting') ?? true
			};

			// Find the first processor that should handle this document
			const processor = processors.find(p => p.shouldProcess(document, processorConfig));

			if (!processor) {
				// This should never happen since RawTextProcessor always matches
				console.error('No processor found for document');
				return;
			}

			try {
				// Get full document text
				const documentText = document.getText();

				// Process text and get replacements
				const replacements = processor.process(documentText, language, config);

				// Apply replacements to all selections
				applyReplacementsToSelections(editor, document, replacements);

			} catch (error) {
				console.error('Text processing failed:', error);
				vscode.window.showErrorMessage(`Typopo: Processing failed - ${error}`);
			}
		})
	);
}



// this method is called when your extension is deactivated
export function deactivate(): void {}
