// @ts-nocheck
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const typopo = require('typopo');
let language = 'en-us';
let config = {
	removeLines: false,
};

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	context.subscriptions.push(
		vscode.commands.registerCommand('typopo-vscode.fixTypos', function () {
			// Get the active text editor
			const editor = vscode.window.activeTextEditor;
			
			if (editor) {
				const document = editor.document;
				const position = editor.selection.active;

				let selection = editor.selection;
				let text = document.getText(selection);

				// if no text is selected, then select the line
				if (text == '') {
					let lineRange = editor.document.lineAt(position).range;
					selection = new vscode.Selection(lineRange.start, lineRange.end);
					text = document.getText(selection)				
				}
				
				// check for user config
				const extensionConfig = vscode.workspace.getConfiguration('typopo');
				
				language = extensionConfig.get('language');
        config.removeLines = extensionConfig.get('removeLines');
        config.removeWhitespacesBeforeMarkdownList = extensionConfig.get('removeWhitespacesBeforeMarkdownList');
        config.keepMarkdownCodeBlocks = extensionConfig.get('keepMarkdownCodeBlocks');
				
				const fixedText = typopo.fixTypos(text, language, config)
				editor.edit(editBuilder => {
					editBuilder.replace(selection, fixedText);
				});
			}
		})
	);
}




exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}
