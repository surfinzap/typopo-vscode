import * as vscode from 'vscode';
import { TextProcessor, TypopoConfig, applyReplacements } from './processors/text-processor';

/**
 * Process and apply typography fixes to all selections in the editor.
 * Each selection is processed independently with its own text and replacements.
 * Handles empty selections by falling back to the current line.
 *
 * @param editor - The VS Code text editor
 * @param document - The text document being edited
 * @param processor - The text processor to use (e.g., MarkdownProcessor, RawTextProcessor)
 * @param language - The language code for typography rules (e.g., 'en-us', 'de-de')
 * @param config - Typopo configuration options
 */
export function processAndApplySelections(
	editor: vscode.TextEditor,
	document: vscode.TextDocument,
	processor: TextProcessor,
	language: string,
	config: TypopoConfig
): Thenable<boolean> {
	return editor.edit(editBuilder => {
		editor.selections.forEach(selection => {
			// Handle empty selection (expand to current line)
			let effectiveSelection = selection;
			if (selection.isEmpty) {
				const lineRange = document.lineAt(selection.active).range;
				effectiveSelection = new vscode.Selection(lineRange.start, lineRange.end);
			}

			// Get text for THIS selection only
			const selectionText = document.getText(effectiveSelection);

			// Process this text (replacements will be relative to selection start, offset 0)
			const replacements = processor.process(selectionText, language, config);

			// Apply replacements to get fixed text
			const fixedText = applyReplacements(selectionText, replacements);

			// Replace selection with fixed text
			editBuilder.replace(effectiveSelection, fixedText);
		});
	});
}
