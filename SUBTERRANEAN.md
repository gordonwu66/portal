# Markdown Note Editor

A minimal markdown note editor with resizable panel layout, live preview, and auto-save.

## Stack
React 19, Vite, TypeScript, Tailwind CSS v4, shadcn/ui, React Router, hosted on Subterranean.

## Architecture
- SPA with React Router; pages in `src/pages/`
- `src/pages/Index.tsx` — Main editor page with folder tree sidebar, note search, move dialog, and editor/empty states
- `src/pages/NotFound.tsx` — 404 page
- `src/components/MarkdownEditor.tsx` — CodeMirror 6 markdown editor component
- `src/components/NotesTree.tsx` — Recursive sidebar tree for nested folders and notes with per-item actions
- `src/lib/notes-tree.ts` — Helpers for building/sorting the flat notes table into a nested tree, folder paths, descendants, and move targets
- `src/lib/cm-hide-markdown.ts` — CodeMirror extension for Obsidian-style syntax hiding
- `src/lib/markdown.ts` — Custom markdown-to-HTML parser for preview pane
- `src/lib/theme.tsx` — Theme context provider (light/dark/system + `resolvedTheme`)
- `src/lib/api.ts` — Backend API helpers (table CRUD)
- `src/lib/utils.ts` — Utility functions (`cn` class merger)
- `src/App.tsx` — Router setup and route definitions
- Uses `resizable` shadcn component for panel layout

## Data Model
- **Notes table** (`6b4a7072cff447389c3deecabb969409`): `title` (text), `content` (multiline), `updated_at` (dateTime), `is_folder` (checkbox), `parent_id` (text)
- Notes and folders now share one table. Root items use empty `parent_id`; folder rows use empty content.

## Key Decisions
- Auto-save with 2s debounce on content/title changes, with pending saves flushed before switching notes/folders
- Three core sidebar behaviors: nested tree when browsing, flat note-only results when searching, and folder-only focus without opening folders in the editor
- **Recursive delete** is the defined deletion behavior for folders; deleting a folder also deletes all descendants
- Tree sorting uses folders first, then notes; folders sort alphabetically while notes sort by `updated_at` descending with title fallback
- **CodeMirror 6** for the markdown editor (`src/components/MarkdownEditor.tsx`) with syntax highlighting, active line, history, search, and bracket matching
- Custom light/dark CodeMirror themes that match the app's neutral monochrome palette
- **Live preview hiding** (`src/lib/cm-hide-markdown.ts`): hides markdown syntax markers (#, **, ~~, `, [](), >) on non-cursor lines; reveals raw syntax when cursor enters the line (Obsidian-style)
- Theme context (`src/lib/theme.tsx`) exposes `resolvedTheme` ('light'|'dark') for CodeMirror theme switching
- Client-side markdown rendering via custom parser for preview pane (no external library)
- **Wiki links** (`[[note_name]]`): `src/lib/cm-wiki-links.ts` provides a CodeMirror extension that regex-matches `[[...]]` patterns, hides brackets on non-cursor lines, styles resolved links as underlined clickable text, and navigates to the matching note on Cmd/Ctrl-click. Titles matched case-insensitively against note rows only.
- Sidebar supports create note/create folder flows, move-to-folder actions, and nested folder expansion/collapse

## Style
Follows DESIGN.md monochrome system. Neutral-50 sidebar, white editor. Minimal borders using opacity.
