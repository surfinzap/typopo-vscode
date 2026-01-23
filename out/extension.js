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
const vscode = __importStar(require("vscode"));
const text_processor_1 = require("./processors/text-processor");
const selection_helper_1 = require("./selection-helper");
function activate(context) {
    // Initialize processors - order matters! First match wins.
    // Add new processors (HTML, JavaScript, etc.) to this array in the future
    const processors = [
        new text_processor_1.MarkdownProcessor(),
        new text_processor_1.RawTextProcessor() // Fallback - always matches, should be last
    ];
    context.subscriptions.push(vscode.commands.registerCommand('typopo-vscode.fixTypos', function () {
        // Get the active text editor
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }
        const document = editor.document;
        // Load user configuration
        const extensionConfig = vscode.workspace.getConfiguration('typopo');
        const language = extensionConfig.get('language') || 'en-us';
        const config = {
            removeLines: extensionConfig.get('removeLines') || false,
        };
        // Pass config with markdown-specific settings for processor selection
        const processorConfig = {
            ...config,
            keepMarkdownFormatting: extensionConfig.get('keepMarkdownFormatting') ?? true
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
            (0, selection_helper_1.applyReplacementsToSelections)(editor, document, replacements);
        }
        catch (error) {
            console.error('Text processing failed:', error);
            vscode.window.showErrorMessage(`Typopo: Processing failed - ${error}`);
        }
    }));
}
// this method is called when your extension is deactivated
function deactivate() { }
//# sourceMappingURL=extension.js.map