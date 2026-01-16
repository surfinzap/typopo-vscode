"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = __importStar(require("vscode"));
const typopo = __importStar(require("typopo"));
let language = 'en-us';
let config = {
    removeLines: false,
};
function activate(context) {
    context.subscriptions.push(vscode.commands.registerCommand('typopo-vscode.fixTypos', function () {
        // get the active text editor
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const document = editor.document;
            // check for user config
            const extensionConfig = vscode.workspace.getConfiguration('typopo');
            language = extensionConfig.get('language') || 'en-us';
            config.removeLines = extensionConfig.get('removeLines') || false;
            config.removeWhitespacesBeforeMarkdownList = extensionConfig.get('removeWhitespacesBeforeMarkdownList');
            config.keepMarkdownCodeBlocks = extensionConfig.get('keepMarkdownCodeBlocks');
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
    }));
}
// this method is called when your extension is deactivated
function deactivate() { }
//# sourceMappingURL=extension.js.map