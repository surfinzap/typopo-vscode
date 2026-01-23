import * as vscode from 'vscode';
import { TextReplacement } from './processors/text-processor';
import { applyReplacements } from './markdown-processor';

/**
 * Convert VS Code Position to byte offset in the document
 */
export function positionToOffset(document: vscode.TextDocument, position: vscode.Position): number {
	const range = new vscode.Range(new vscode.Position(0, 0), position);
	return Buffer.byteLength(document.getText(range), 'utf8');
}

/**
 * Apply text replacements to all selections in the editor.
 * Handles empty selections by falling back to the current line.
 * Filters replacements to only those within each selection range.
 */
export function applyReplacementsToSelections(
	editor: vscode.TextEditor,
	document: vscode.TextDocument,
	replacements: TextReplacement[]
): void {
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
}
