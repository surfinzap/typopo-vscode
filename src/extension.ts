// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as typopo from 'typopo';

interface TypopoConfig {
	removeLines: boolean;
	removeWhitespacesBeforeMarkdownList?: boolean;
	keepMarkdownCodeBlocks?: boolean;
}

let language = 'en-us';
let config: TypopoConfig = {
	removeLines: false,
};

export function activate(context: vscode.ExtensionContext): void {
	context.subscriptions.push(
		vscode.commands.registerCommand('typopo-vscode.fixTypos', function () {
			// get the active text editor
			const editor = vscode.window.activeTextEditor;

			if (editor) {
				const document = editor.document;

				// check for user config
				const extensionConfig = vscode.workspace.getConfiguration('typopo');

				language = extensionConfig.get<string>('language') || 'en-us';
				config.removeLines = extensionConfig.get<boolean>('removeLines') || false;
				config.removeWhitespacesBeforeMarkdownList = extensionConfig.get<boolean>('removeWhitespacesBeforeMarkdownList');
				config.keepMarkdownCodeBlocks = extensionConfig.get<boolean>('keepMarkdownCodeBlocks');


				editor.edit(editBuilder => {
					editor.selections.forEach(selection => {
						let text = document.getText(selection);

						// if no text is selected, then select the line
						if (text === '') {
							const position = selection.active;
							let lineRange = editor.document.lineAt(position).range;
							selection = new vscode.Selection(lineRange.start, lineRange.end);
							text = document.getText(selection);
						}

						const fixedText = typopo.fixTypos(text, language, config);
						editBuilder.replace(selection, fixedText);
					});
				});
			}
		})
	);
}



// this method is called when your extension is deactivated
export function deactivate(): void {}
