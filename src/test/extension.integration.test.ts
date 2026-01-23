import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { rawTextProcessorTestSet } from './processors/text-processor.test';

// Mock the vscode module before importing it
// Note: vi.mock is hoisted, so we must define the mock inline
vi.mock('vscode', () => ({
	window: {
		activeTextEditor: undefined,
		showErrorMessage: vi.fn(),
	},
	workspace: {
		getConfiguration: vi.fn(),
	},
	commands: {
		registerCommand: vi.fn(),
		_handlers: new Map(),
	},
	EndOfLine: {
		LF: 1,
		CRLF: 2,
	},
	ViewColumn: {
		One: 1,
		Two: 2,
		Three: 3,
	},
	Range: class Range {
		constructor(public start: any, public end: any) {}
	},
	Position: class Position {
		constructor(public line: number, public character: number) {}
	},
	Selection: class Selection {
		constructor(public anchor: any, public active: any) {}
	},
}));

import * as vscode from 'vscode';
import { activate } from '../extension';

// ============================================================================
// Mock Factory Functions
// ============================================================================

/**
 * Creates a mock VS Code Position object
 */
function createMockPosition(line: number, character: number): vscode.Position {
	return {
		line,
		character,
		isAfter: vi.fn(),
		isAfterOrEqual: vi.fn(),
		isBefore: vi.fn(),
		isBeforeOrEqual: vi.fn(),
		isEqual: vi.fn(),
		compareTo: vi.fn(),
		translate: vi.fn(),
		with: vi.fn(),
	} as any;
}

/**
 * Creates a mock VS Code Range object
 */
function createMockRange(start: vscode.Position, end: vscode.Position): vscode.Range {
	return {
		start,
		end,
		isEmpty: start.line === end.line && start.character === end.character,
		isSingleLine: start.line === end.line,
		contains: vi.fn(),
		isEqual: vi.fn(),
		intersection: vi.fn(),
		union: vi.fn(),
		with: vi.fn(),
	} as any;
}

/**
 * Creates a mock VS Code Selection object
 */
function createMockSelection(
	startLine: number,
	startChar: number,
	endLine: number,
	endChar: number
): vscode.Selection {
	const start = createMockPosition(startLine, startChar);
	const end = createMockPosition(endLine, endChar);
	const isEmpty = startLine === endLine && startChar === endChar;

	return {
		start,
		end,
		active: end,
		anchor: start,
		isEmpty,
		isSingleLine: startLine === endLine,
		isReversed: false,
		contains: vi.fn(),
		isEqual: vi.fn(),
		intersection: vi.fn(),
		union: vi.fn(),
		with: vi.fn(),
	} as any;
}

/**
 * Creates a mock VS Code TextDocument
 */
function createMockDocument(text: string, languageId: string = 'plaintext'): vscode.TextDocument {
	const lines = text.split('\n');

	// Helper to convert position to offset
	const positionToOffset = (pos: any): number => {
		if (!pos || pos.line === undefined || pos.character === undefined) {
			return 0;
		}
		let offset = 0;
		for (let i = 0; i < pos.line && i < lines.length; i++) {
			offset += lines[i].length + 1; // +1 for newline
		}
		offset += Math.min(pos.character, lines[pos.line]?.length || 0);
		return offset;
	};

	// Helper to convert offset to position
	const offsetToPosition = (offset: number): vscode.Position => {
		let currentOffset = 0;
		for (let line = 0; line < lines.length; line++) {
			const lineLength = lines[line].length + 1; // +1 for newline
			if (currentOffset + lineLength > offset || line === lines.length - 1) {
				return createMockPosition(line, offset - currentOffset);
			}
			currentOffset += lineLength;
		}
		return createMockPosition(lines.length - 1, 0);
	};

	return {
		getText(range?: any): string {
			if (!range) return text;

			const startOffset = positionToOffset(range.start);
			const endOffset = positionToOffset(range.end);
			return text.substring(startOffset, endOffset);
		},

		languageId,

		lineAt(lineOrPosition: number | vscode.Position): any {
			const lineNum = typeof lineOrPosition === 'number' ? lineOrPosition : lineOrPosition.line;
			const lineText = lines[lineNum] || '';

			return {
				text: lineText,
				lineNumber: lineNum,
				range: createMockRange(
					createMockPosition(lineNum, 0),
					createMockPosition(lineNum, lineText.length)
				),
				rangeIncludingLineBreak: createMockRange(
					createMockPosition(lineNum, 0),
					createMockPosition(lineNum + 1, 0)
				),
				firstNonWhitespaceCharacterIndex: lineText.search(/\S/),
				isEmptyOrWhitespace: lineText.trim().length === 0,
			};
		},

		positionAt(offset: number): vscode.Position {
			return offsetToPosition(offset);
		},

		offsetAt(position: vscode.Position): number {
			return positionToOffset(position);
		},

		uri: { fsPath: '/test/file.txt' } as any,
		fileName: '/test/file.txt',
		isUntitled: false,
		isDirty: false,
		isClosed: false,
		eol: vscode.EndOfLine.LF,
		lineCount: lines.length,
		save: vi.fn(),
		version: 1,
		validatePosition: vi.fn((pos) => pos),
		validateRange: vi.fn((range) => range),
		getWordRangeAtPosition: vi.fn(),
	} as any;
}

/**
 * Creates a mock VS Code TextEditor with edit capture
 */
function createMockEditor(
	document: vscode.TextDocument,
	selections: vscode.Selection[]
): any {
	const capturedEdits: Array<{ selection: vscode.Selection; newText: string }> = [];

	return {
		document,
		selections,
		selection: selections[0],
		visibleRanges: [],
		options: {},
		viewColumn: vscode.ViewColumn.One,

		edit: vi.fn((callback: (builder: vscode.TextEditorEdit) => void) => {
			const mockEditBuilder = {
				replace: vi.fn((selection: vscode.Selection, text: string) => {
					capturedEdits.push({ selection, newText: text });
				}),
				insert: vi.fn(),
				delete: vi.fn(),
				setEndOfLine: vi.fn(),
			};

			callback(mockEditBuilder as any);
			return Promise.resolve(true);
		}),

		insertSnippet: vi.fn(),
		setDecorations: vi.fn(),
		revealRange: vi.fn(),
		show: vi.fn(),
		hide: vi.fn(),

		// Test helper method (not part of VS Code API)
		_getCapturedEdits() {
			return capturedEdits;
		},
	};
}

/**
 * Sets up VS Code API mocks and returns the command handler
 */
function setupVSCodeMocks(
	editor: any,
	configMap: Map<string, any> = new Map<string, any>()
): () => void {
	// Set the active editor
	(vscode.window as any).activeTextEditor = editor;

	// Mock window.showErrorMessage
	(vscode.window.showErrorMessage as any) = vi.fn().mockResolvedValue(undefined);

	// Mock workspace.getConfiguration
	(vscode.workspace.getConfiguration as any) = vi.fn().mockReturnValue({
		get: (key: string, defaultValue?: any) => {
			return configMap.has(key) ? configMap.get(key) : defaultValue;
		},
		has: vi.fn((key: string) => configMap.has(key)),
		inspect: vi.fn(),
		update: vi.fn(),
	});

	// Mock commands.registerCommand to capture command handlers
	(vscode.commands.registerCommand as any) = vi.fn().mockImplementation((cmdName, handler) => {
		(vscode.commands as any)._handlers.set(cmdName, handler);
		return { dispose: vi.fn() } as any;
	});

	// Return a function that retrieves the command handler after activation
	return () => {
		const handler = (vscode.commands as any)._handlers.get('typopo-vscode.fixTypos');
		if (!handler) {
			throw new Error('Command handler not registered');
		}
		return handler();
	};
}

// ============================================================================
// Test Suites
// ============================================================================

describe('Extension Integration Tests', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		(vscode.commands as any)._handlers = new Map();
		(vscode.window as any).activeTextEditor = undefined;
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	// ========================================================================
	// Suite 1: Basic Flow Tests
	// ========================================================================

	describe('fixTypos command - Basic Flow', () => {
		describe('RawTextProcessor scenarios', () => {
			for (const [input, expected] of Object.entries(rawTextProcessorTestSet)) {
				it(`should convert: ${input}`, async () => {
					// Setup: Create mock document with input text
					const mockDocument = createMockDocument(input, 'plaintext');
					const mockSelection = createMockSelection(0, 0, 0, input.length);
					const mockEditor = createMockEditor(mockDocument, [mockSelection]);

					// Setup: Configure extension
					const configMap = new Map<string, any>([
						['language', 'en-us'],
						['removeLines', false],
						['keepMarkdownFormatting', true],
					]);

					const getCommandHandler = setupVSCodeMocks(mockEditor, configMap);

					// Act: Activate extension
					const mockContext = { subscriptions: [] } as any;
					activate(mockContext);

					// Act: Invoke command
					await getCommandHandler();

					// Assert: Check captured edits
					const edits = mockEditor._getCapturedEdits();
					expect(edits).toHaveLength(1);
					expect(edits[0].newText).toBe(expected);
				});
			}
		});
	});

	// ===========================================================
	// Suite 2: Processor Selection Tests
	// ===========================================================
	describe('fixTypos command - Processor Selection', () => {
		it('should use MarkdownProcessor for markdown files when keepMarkdownFormatting=true', async () => {
			const input = '# Hello "world"';
			const mockDocument = createMockDocument(input, 'markdown');
			const mockSelection = createMockSelection(0, 0, 0, input.length);
			const mockEditor = createMockEditor(mockDocument, [mockSelection]);

			const configMap = new Map<string, any>([
				['language', 'en-us'],
				['removeLines', false],
				['keepMarkdownFormatting', true],
			]);

			const getCommandHandler = setupVSCodeMocks(mockEditor, configMap);

			const mockContext = { subscriptions: [] } as any;
			activate(mockContext);
			await getCommandHandler();

			const edits = mockEditor._getCapturedEdits();
			expect(edits).toHaveLength(1);
			// MarkdownProcessor should convert quotes while preserving markdown structure
			expect(edits[0].newText).toContain('# Hello');
			expect(edits[0].newText).toContain('world');
		});

		it('should use RawTextProcessor for markdown files when keepMarkdownFormatting=false', async () => {
			const input = '"hello"';
			const expected = '“hello”';
			const mockDocument = createMockDocument(input, 'markdown');
			const mockSelection = createMockSelection(0, 0, 0, input.length);
			const mockEditor = createMockEditor(mockDocument, [mockSelection]);

			const configMap = new Map<string, any>([
				['language', 'en-us'],
				['removeLines', false],
				['keepMarkdownFormatting', false],
			]);

			const getCommandHandler = setupVSCodeMocks(mockEditor, configMap);

			const mockContext = { subscriptions: [] } as any;
			activate(mockContext);
			await getCommandHandler();

			const edits = mockEditor._getCapturedEdits();
			expect(edits).toHaveLength(1);
			expect(edits[0].newText).toBe(expected);
		});

		it('should use RawTextProcessor for plaintext files', async () => {
			const input = '"hello"';
			const expected = '“hello”';
			const mockDocument = createMockDocument(input, 'plaintext');
			const mockSelection = createMockSelection(0, 0, 0, input.length);
			const mockEditor = createMockEditor(mockDocument, [mockSelection]);

			const configMap = new Map<string, any>([
				['language', 'en-us'],
				['removeLines', false],
				['keepMarkdownFormatting', true],
			]);

			const getCommandHandler = setupVSCodeMocks(mockEditor, configMap);

			const mockContext = { subscriptions: [] } as any;
			activate(mockContext);
			await getCommandHandler();

			const edits = mockEditor._getCapturedEdits();
			expect(edits).toHaveLength(1);
			expect(edits[0].newText).toBe(expected);
		});
	});

	// ========================================================================
	// Suite 3: Configuration Tests
	// ========================================================================

	describe('fixTypos command - Configuration', () => {
		it('should respect language setting (en-us)', async () => {
			const input = '"hello"';
			const expected = '“hello”';
			const mockDocument = createMockDocument(input, 'plaintext');
			const mockSelection = createMockSelection(0, 0, 0, input.length);
			const mockEditor = createMockEditor(mockDocument, [mockSelection]);

			const configMap = new Map<string, any>([['language', 'en-us']]);

			const getCommandHandler = setupVSCodeMocks(mockEditor, configMap);

			const mockContext = { subscriptions: [] } as any;
			activate(mockContext);
			await getCommandHandler();

			const edits = mockEditor._getCapturedEdits();
			expect(edits).toHaveLength(1);
			expect(edits[0].newText).toBe(expected);
		});

		it('should respect removeLines setting', async () => {
			const input = '"hello"';
			const expected = "“hello”";
			const mockDocument = createMockDocument(input, 'plaintext');
			const mockSelection = createMockSelection(0, 0, 0, input.length);
			const mockEditor = createMockEditor(mockDocument, [mockSelection]);

			const configMap = new Map<string, any>([
				['language', 'en-us'],
				['removeLines', true],
			]);

			const getCommandHandler = setupVSCodeMocks(mockEditor, configMap);

			const mockContext = { subscriptions: [] } as any;
			activate(mockContext);
			await getCommandHandler();

			const edits = mockEditor._getCapturedEdits();
			expect(edits).toHaveLength(1);
			expect(edits[0].newText).toBe(expected);
		});

		it('should use default values when config is missing', async () => {
			const input = '"hello"';
			const expected = '“hello”';
			const mockDocument = createMockDocument(input, 'plaintext');
			const mockSelection = createMockSelection(0, 0, 0, input.length);
			const mockEditor = createMockEditor(mockDocument, [mockSelection]);

			// Empty config map - should use defaults
			const configMap = new Map<string, any>();

			const getCommandHandler = setupVSCodeMocks(mockEditor, configMap);

			const mockContext = { subscriptions: [] } as any;
			activate(mockContext);
			await getCommandHandler();

			const edits = mockEditor._getCapturedEdits();
			expect(edits).toHaveLength(1);
			expect(edits[0].newText).toBe(expected);
		});
	});

	// ========================================================================
	// Suite 4: Selection Handling Tests
	// ========================================================================

	describe('fixTypos command - Selection Handling', () => {
		it('should process selected text only', async () => {
			const input = 'Start "hello" end';
			const mockDocument = createMockDocument(input, 'plaintext');
			// Select only the word "hello" with quotes (positions 6-13)
			const mockSelection = createMockSelection(0, 6, 0, 13);
			const mockEditor = createMockEditor(mockDocument, [mockSelection]);

			const configMap = new Map<string, any>([['language', 'en-us']]);

			const getCommandHandler = setupVSCodeMocks(mockEditor, configMap);

			const mockContext = { subscriptions: [] } as any;
			activate(mockContext);
			await getCommandHandler();

			const edits = mockEditor._getCapturedEdits();
			expect(edits).toHaveLength(1);
			// Should only fix the selected portion
			expect(edits[0].newText).toBe('“hello”');
		});

		it('should process current line when selection is empty', async () => {
			const input = '"hello" world\nsecond line';
			const mockDocument = createMockDocument(input, 'plaintext');
			// Empty selection at start of first line
			const mockSelection = createMockSelection(0, 0, 0, 13);
			const mockEditor = createMockEditor(mockDocument, [mockSelection]);

			const configMap = new Map<string, any>([['language', 'en-us']]);

			const getCommandHandler = setupVSCodeMocks(mockEditor, configMap);

			const mockContext = { subscriptions: [] } as any;
			activate(mockContext);
			await getCommandHandler();

			const edits = mockEditor._getCapturedEdits();
			expect(edits).toHaveLength(1);
			expect(edits[0].newText).toBe('“hello” world');
		});

		it('should handle multiple selections', async () => {
			const input = '"hello" and "hello"';
			const mockDocument = createMockDocument(input, 'plaintext');
			// Two selections: "hello" and "world"
			const mockSelection1 = createMockSelection(0, 0, 0, 7);
			const mockSelection2 = createMockSelection(0, 12, 0, 19);
			const mockEditor = createMockEditor(mockDocument, [mockSelection1, mockSelection2]);

			const configMap = new Map<string, any>([['language', 'en-us']]);

			const getCommandHandler = setupVSCodeMocks(mockEditor, configMap);

			const mockContext = { subscriptions: [] } as any;
			activate(mockContext);
			await getCommandHandler();

			const edits = mockEditor._getCapturedEdits();
			expect(edits).toHaveLength(2);
			expect(edits[0].newText).toBe('“hello”');
			expect(edits[1].newText).toBe('“hello”');
		});
	});

	// ========================================================================
	// Suite 5: Error Handling Tests
	// ========================================================================

	describe('fixTypos command - Error Handling', () => {
		it('should handle missing editor gracefully', async () => {
			// Setup: No active editor
			const getCommandHandler = setupVSCodeMocks(undefined, new Map<string, any>());

			const mockContext = { subscriptions: [] } as any;
			activate(mockContext);
			await getCommandHandler();

			// Should return early without errors
			expect(vscode.window.showErrorMessage).not.toHaveBeenCalled();
		});

		it('should show error message when processing fails', async () => {
			const input = '"hello"';
			const mockDocument = createMockDocument(input, 'plaintext');
			const mockSelection = createMockSelection(0, 0, 0, input.length);
			const mockEditor = createMockEditor(mockDocument, [mockSelection]);

			// Mock edit to fail
			mockEditor.edit = vi.fn(() => {
				throw new Error('Mock processing error');
			});

			const configMap = new Map<string, any>([['language', 'en-us']]);
			const getCommandHandler = setupVSCodeMocks(mockEditor, configMap);

			const mockContext = { subscriptions: [] } as any;
			activate(mockContext);

			await getCommandHandler();

			// Should catch error and show message
			expect(vscode.window.showErrorMessage).toHaveBeenCalled();
			const errorCall = (vscode.window.showErrorMessage as any).mock.calls[0][0];
			expect(errorCall).toContain('Typopo');
		});

		it('should handle processor errors gracefully', async () => {
			// This test verifies the try-catch in extension.ts handles processor exceptions
			const input = '"hello"';
			const mockDocument = createMockDocument(input, 'plaintext');
			const mockSelection = createMockSelection(0, 0, 0, input.length);
			const mockEditor = createMockEditor(mockDocument, [mockSelection]);

			// Mock getText to throw an error
			mockDocument.getText = vi.fn(() => {
				throw new Error('Mock document error');
			});

			const configMap = new Map<string, any>([['language', 'en-us']]);
			const getCommandHandler = setupVSCodeMocks(mockEditor, configMap);

			const mockContext = { subscriptions: [] } as any;
			activate(mockContext);

			await getCommandHandler();

			// Should catch error and show message
			expect(vscode.window.showErrorMessage).toHaveBeenCalled();
		});
	});
});
