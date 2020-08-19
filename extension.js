// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const typopo = require('typopo');

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	console.log('typopo running');
	context.subscriptions.push(
		vscode.commands.registerCommand('typopo-vscode.fixTypos', function () {
			// Get the active text editor
			const editor = vscode.window.activeTextEditor;

			if (editor) {
				const document = editor.document;
				const selection = editor.selection;

				const text = document.getText(selection);
				const configuration = {
					removeLines: false,
				};
				const fixedText = typopo.fixTypos(text, 'en-us', configuration)
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
