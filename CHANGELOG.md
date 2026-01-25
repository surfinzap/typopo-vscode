# Changelog for Typopo VS Code extension



## 1.5.0 // 

### ✨ New features
- tbd write about better support for fixing the text written in markdown. Before the only rudimentary parts as code blocks or list items were identified and skipped 
- now when typopo fixes the text, it will skip from fixing:
  - inline code (show example)
  - code (show example)
  - raw HTML within markdown (show example)
  - YAM:/TOML frontmatter 
- it keeps the nesting for lists and blockquotes, it keeps empty checkboxes for lists 
if you wish to fix the content within the skipped parts you can only select portion you wish to fix

### 🔨 Maintenance
- Rewrite extension to typescript
- Add automating code linting and formatting



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