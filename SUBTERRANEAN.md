# Markdown Note Editor

A minimal markdown note editor with resizable panel layout, live preview, and auto-save.

## Stack
React 19, Vite, TypeScript, Tailwind CSS v4, shadcn/ui, React Router, hosted on Subterranean.

## Architecture
- SPA with React Router; pages in `src/pages/`
- `src/pages/Index.tsx` — Main editor page (sidebar, note list, editor/preview layout)
- `src/pages/NotFound.tsx` — 404 page
- `src/components/MarkdownEditor.tsx` — CodeMirror 6 markdown editor component
- `src/lib/cm-hide-markdown.ts` — CodeMirror extension for Obsidian-style syntax hiding
- `src/lib/markdown.ts` — Custom markdown-to-HTML parser for preview pane
- `src/lib/theme.tsx` — Theme context provider (light/dark/system + `resolvedTheme`)
- `src/lib/api.ts` — Backend API helpers (table CRUD)
- `src/lib/utils.ts` — Utility functions (`cn` class merger)
- `src/App.tsx` — Router setup and route definitions
- Uses `resizable` shadcn component for panel layout

## Data Model
- **Notes table** (`6b4a7072cff447389c3deecabb969409`): `title` (text), `content` (multiline), `updated_at` (dateTime)

## Key Decisions
- Auto-save with 600ms debounce on content/title changes
- Three view modes: Edit only, Split (editor + preview), Preview only
- **CodeMirror 6** for the markdown editor (`src/components/MarkdownEditor.tsx`) with syntax highlighting, active line, history, search, and bracket matching
- Custom light/dark CodeMirror themes that match the app's neutral monochrome palette
- **Live preview hiding** (`src/lib/cm-hide-markdown.ts`): hides markdown syntax markers (#, **, ~~, `, [](), >) on non-cursor lines; reveals raw syntax when cursor enters the line (Obsidian-style)
- Theme context (`src/lib/theme.tsx`) exposes `resolvedTheme` ('light'|'dark') for CodeMirror theme switching
- Client-side markdown rendering via custom parser for preview pane (no external library)
- **Wiki links** (`[[note_name]]`): `src/lib/cm-wiki-links.ts` provides a CodeMirror extension that regex-matches `[[...]]` patterns, hides brackets on non-cursor lines, styles resolved links as underlined clickable text, and navigates to the matching note on click. Uses `noteTitlesFacet` and `onNavigateFacet` for configuration. Titles matched case-insensitively with whitespace trimming.
- Sidebar shows note list with search, context menu for duplicate/delete

## Style
Follows DESIGN.md monochrome system. Neutral-50 sidebar, white editor. Minimal borders using opacity.
