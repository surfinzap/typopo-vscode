# Changelog for Typopo VS Code extension



## 2.0.3 // 2026-02-20


### 🐛 Fixes
- Typography fixes now work correctly after inline formatting (bold, italic, strikethrough) in Markdown. Previously, non-breaking spaces and em dashes weren’t applied when text followed formatted text—for example, `*a* word` now properly gets a non-breaking space, and `**word** - word` correctly converts to an em dash.

### 📦️ Updates
- Bump devDependencies to their latest versions




## 2.0.2 // 2026-02-01

### 📦️ Updates
- Bump Typopo package to its latest version ([3.0.0](https://github.com/surfinzap/typopo/releases/tag/3.0.0))
- Bump devDependencies to their latest versions



## 2.0.0 // 2026-01-25

This major release brings comprehensive markdown support to Typopo. The extension now intelligently understands markdown structure, automatically preserving code blocks, inline code, HTML, and frontmatter while fixing typography in your prose. File type detection is automatic—just open a markdown file and fix typos without any configuration.

### ✨ New features

Typopo now features **structure-aware markdown processing**. The extension parses your markdown files using an Abstract Syntax Tree (AST), allowing it to intelligently distinguish between code/syntax elements (which should be preserved) and prose content (which should be fixed). This means you can now select and fix an entire markdown file without worrying about corrupting code blocks or inline code.

**What gets automatically skipped:**
- **Inline code**: `` `"code with quotes"` `` → preserved unchanged
- **Code blocks**:
  ````python
  print("Hello, World!")  # Straight quotes preserved
  ````
- **Raw HTML**: `<div id="test">"quoted text"</div>` → unchanged
- **YAML/TOML frontmatter**: Front matter data preserved exactly

**What gets processed:**

While preserving code and syntax, Typopo fixes typography in all prose content:
- Paragraphs and headings
- List items (while maintaining nesting and checkboxes)
- Blockquote content
- Table cell content
- Image alt text
- Link text (URLs are preserved)

**Auto-detection:**

File type detection is automatic. Typopo recognizes markdown files (`.md`, `.mdx`, `.mdc`) based on VS Code’s language mode and applies structure-aware processing automatically. No configuration needed.

**Usage notes:**
- For untitled files: Set VS Code language mode to "Markdown" (bottom-right status bar) to enable structure-aware processing
- To fix content within skipped elements (like text inside `“inline code”`), select only the specific text you want to process
- **Caution for MDX/MDC files**: Be mindful of JSX syntax in `*.mdx` files or custom components in `*.mdc` files, as these are supported yet. Support for these extensions will be enhanced in future releases.

### 💥 Breaking changes
The following settings have been removed, as their functionality is now handled automatically via markdown processing:
- **`removeWhitespacesBeforeMarkdownList`** — Markdown structure (including list nesting) is now preserved automatically
- **`keepMarkdownCodeBlocks`** — Code blocks are now automatically detected and skipped; no manual configuration needed

### 🔨 Maintenance
- Complete rewrite of extension codebase to TypeScript for improved type safety and maintainability
- Implement comprehensive testing infrastructure (Vitest for unit tests, Mocha for integration tests)
- Add automated code linting (ESLint) and formatting (Prettier) to maintain code quality



## 1.4.5 // 2026-01-16

### 📦️ Updates
- Bump Typopo package to its latest version ([2.9.1](https://github.com/surfinzap/typopo/releases/tag/2.9.1))
 


## 1.4.4 // 2026-01-11

### 📦️ Updates
- Bump Typopo package to its latest version ([2.9.0](https://github.com/surfinzap/typopo/releases/tag/2.9.0))
- Bump devDependencies to their latest versions
 


## 1.4.3 // 2025-11-30

### 📦️ Updates
- Bump Typopo package to its latest version ([2.8.0](https://github.com/surfinzap/typopo/releases/tag/2.8.0))
- Bump devDependencies to their latest versions
 


## 1.4.2 // 2025-10-05

### 📦️ Updates
- Add auto-publishing of the extension to [Open VSX Registry](https://open-vsx.org/extension/brano/typopo-vscode)  


## 1.4.1 // 2025-10-04

### 📦️ Updates
- Bump Typopo package to its latest version ([2.7.1](https://github.com/surfinzap/typopo/releases/tag/2.7.1))
- Bump devDependencies to their latest versions
- Reduce the *.vsix package size



## 1.4.0 // 2025-09-25

### ✨ New features
- Add support for multi-cursor and multi-selection editing—fix typos across multiple text selections simultaneously

### 📦️ Updates
- Bump Typopo package to its latest version ([2.7.0](https://github.com/surfinzap/typopo/releases/tag/2.7.0))
- Bump devDependencies to their latest versions



## 1.3.5 // 2025-09-08
### 📦️ Updates
- Bump Typopo package to its latest version ([2.6.0](https://github.com/surfinzap/typopo/releases/tag/2.6.0))
- Bump devDependencies to their latest versions



## 1.3.4 // 2024-09-22
### 📦️ Updates
- Bump Typopo package to its latest version ([2.5.8](https://github.com/surfinzap/typopo/releases/tag/2%2F5%2F8))
- Bump devDependencies to their latest versions



## 1.3.3 // 2024-09-11
### 📦️ Updates
- Bump Typopo package to its latest version ([2.5.7](https://github.com/surfinzap/typopo/releases/tag/2%2F5%2F7))
- Bump devDependencies to their latest versions



## 1.3.2 // 2023-12-23
### 📦️ Updates
- Bump Typopo package to its latest version ([2.5.6](https://github.com/surfinzap/typopo/releases/tag/2%2F5%2F6))
- Bump devDependencies to their latest versions



## 1.3.1 // 2023-08-27

### 📦️ Updates
- Bump Typopo package to its latest version ([2.5.5](https://github.com/surfinzap/typopo/releases/tag/2%2F5%2F5))
- Bump devDependencies to their latest versions



## 1.3.0 // 2023-05-01

### ✨ New features
- When no text is selected and you run `fixTypos`, the typos get fixed for the current line.

### 📦️ Updates
- Bump devDependencies to their latest versions



## 1.2.2 // 2022-07-12

### 📦️ Updates
- Bump Typopo package to its latest version ([2.5.4](https://github.com/surfinzap/typopo/releases/tag/2%2F5%2F4))
- Bump devDependencies to their latest versions



## 1.2.1 // 2022-01-17

### 📦️ Updates
- Bump Typopo package to its latest version ([2.5.3](https://github.com/surfinzap/typopo/releases/tag/2%2F5%2F3))
- Bump devDependencies to their latest versions



## 1.2.0 // 2021-06-09

### ✨ New features
New configuration option to keep Markdown code blocks in your Markdown files:
- `keepMarkdownCodeBlocks: true` when you want to keep Markdown code blocks in your Markdown files
- `keepMarkdownCodeBlocks: false` want to fix grave accents (`) in generic texts to single quotes 


### 📦️ Updates
- Bump Typopo package to its latest version ([2.5.0](https://github.com/surfinzap/typopo/releases/tag/2%2F5%2F0))




## 1.1.0 // 2020-11-25
### New features
New configuration option to remove/keep whitespaces before nested markdown lists. By default, whitespaces before markdown list are kept.

**Typopo now keeps nested lists:**

![Typopo keeps nested lists](assets/typopo-keeps-nested-lists.gif "Typopo keeps nested lists")

**Optionally, you can set whitespaces before nested markdown lists to be removed:**

![Typopo removes nested lists](assets/typopo-removes-nested-lists.gif "Typopo removes nested lists")





## 1.0.3 // 2020-11-01
### Updates
- Bump Typopo package to its latest version ([2.3.7](https://github.com/surfinzap/typopo/releases/tag/2%2F3%2F7))



## 1.0.2 // 2020-10-03
This version has no functional changes. I’ve repacked the distribution so it includes all dependencies.



## 1.0.1 // 2020-10-03
### Updates
- Bump Typopo package to its latest version ([2.3.6](https://github.com/surfinzap/typopo/releases/tag/2%2F3%2F6))



## 1.0.0 // 2020-09-01
This version has no functional changes, but I’ve updated the icon and README.md, so it looks like a real extension.
- Add VS Code extension icon
- Update README.md 
- Add LICENSE.txt



## 0.0.4 // 2020-08-25

### Fixes
- Change keyboard for shortcut from `Option+CMD+T` to `Ctrl+CMD+T`. Previous shortcut was colliding with `Close Other Editors in Group`.



## 0.0.3 // 2020-08-20
Fix typos in the selected text. As of this version you can:
- set your default language (en-us, de-de, cs, sk, rue)
- choose whether to remove empty lines the text