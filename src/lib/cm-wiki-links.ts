/**
 * CodeMirror 6 extension for Obsidian-style wiki links ([[note_name]]).
 * - Decorates resolved wiki links as clickable styled links
 * - Unresolved links get a dimmed style
 * - Clicking/Cmd-clicking a resolved link calls onNavigate
 */
import {
  EditorView,
  Decoration,
  DecorationSet,
  ViewPlugin,
  ViewUpdate,
  WidgetType,
} from '@codemirror/view';
import { EditorState, Range, Facet } from '@codemirror/state';

// ─── Facets for configuration ───────────────────────────────────────────────

/** Facet to provide the list of known note titles */
export const noteTitlesFacet = Facet.define<string[], string[]>({
  combine: (values) => values[0] ?? [],
});

/** Facet to provide the navigation callback */
export const onNavigateFacet = Facet.define<((title: string) => void) | null, ((title: string) => void) | null>({
  combine: (values) => values[0] ?? null,
});

// ─── Regex ──────────────────────────────────────────────────────────────────

const WIKI_LINK_RE = /\[\[([^\[\]]+?)\]\]/g;

// ─── Decoration marks ───────────────────────────────────────────────────────

const resolvedLinkMark = Decoration.mark({ class: 'cm-wiki-link cm-wiki-link-resolved' });
const unresolvedLinkMark = Decoration.mark({ class: 'cm-wiki-link cm-wiki-link-unresolved' });
const bracketHide = Decoration.replace({});

// ─── Helpers ────────────────────────────────────────────────────────────────

function cursorLines(state: EditorState): Set<number> {
  const lines = new Set<number>();
  for (const range of state.selection.ranges) {
    const startLine = state.doc.lineAt(range.from).number;
    const endLine = state.doc.lineAt(range.to).number;
    for (let l = startLine; l <= endLine; l++) lines.add(l);
  }
  return lines;
}

function normalizeTitle(t: string): string {
  return t.trim().toLowerCase();
}

// ─── Build decorations ─────────────────────────────────────────────────────

function buildWikiDecorations(view: EditorView): DecorationSet {
  const { state } = view;
  const titles = state.facet(noteTitlesFacet);
  const titleSet = new Set(titles.map(normalizeTitle));
  const active = cursorLines(state);
  const decos: Range<Decoration>[] = [];

  for (let i = 1; i <= state.doc.lines; i++) {
    const line = state.doc.line(i);
    const isActive = active.has(i);
    let match: RegExpExecArray | null;
    WIKI_LINK_RE.lastIndex = 0;

    while ((match = WIKI_LINK_RE.exec(line.text)) !== null) {
      const linkTitle = match[1];
      const from = line.from + match.index;
      const to = from + match[0].length;
      const innerFrom = from + 2; // after [[
      const innerTo = to - 2; // before ]]
      const resolved = titleSet.has(normalizeTitle(linkTitle));

      if (isActive) {
        // On cursor line: show full [[title]] but still mark the inner text
        decos.push((resolved ? resolvedLinkMark : unresolvedLinkMark).range(innerFrom, innerTo));
      } else {
        // On non-cursor line: hide [[ and ]] brackets, style inner text
        decos.push(bracketHide.range(from, innerFrom));
        decos.push((resolved ? resolvedLinkMark : unresolvedLinkMark).range(innerFrom, innerTo));
        decos.push(bracketHide.range(innerTo, to));
      }
    }
  }

  decos.sort((a, b) => a.from - b.from || a.to - b.to);
  return Decoration.set(decos);
}

// ─── Plugin ─────────────────────────────────────────────────────────────────

export const wikiLinksPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = buildWikiDecorations(view);
    }

    update(update: ViewUpdate) {
      if (
        update.docChanged ||
        update.selectionSet ||
        update.viewportChanged
      ) {
        this.decorations = buildWikiDecorations(update.view);
      }
    }
  },
  { decorations: (v) => v.decorations }
);

// ─── Click handler ──────────────────────────────────────────────────────────

export const wikiLinksClickHandler = EditorView.domEventHandlers({
  click(event, view) {
    const target = event.target as HTMLElement;
    if (!target.classList.contains('cm-wiki-link-resolved')) return false;

    const pos = view.posAtDOM(target);
    const line = view.state.doc.lineAt(pos);
    WIKI_LINK_RE.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = WIKI_LINK_RE.exec(line.text)) !== null) {
      const from = line.from + match.index;
      const to = from + match[0].length;
      if (pos >= from && pos <= to) {
        const linkTitle = match[1].trim();
        const onNavigate = view.state.facet(onNavigateFacet);
        if (onNavigate) {
          event.preventDefault();
          onNavigate(linkTitle);
          return true;
        }
      }
    }
    return false;
  },
});

// ─── Theme ──────────────────────────────────────────────────────────────────

export const wikiLinksBaseTheme = EditorView.baseTheme({
  '.cm-wiki-link': {
    cursor: 'default',
  },
  '.cm-wiki-link-resolved': {
    textDecoration: 'underline',
    textUnderlineOffset: '2px',
    cursor: 'pointer',
  },
});

export const wikiLinksLightTheme = EditorView.theme({
  '.cm-wiki-link-resolved': {
    color: '#404040',
    textDecorationColor: '#a3a3a3',
  },
  '.cm-wiki-link-unresolved': {
    color: '#a3a3a3',
  },
});

export const wikiLinksDarkTheme = EditorView.theme({
  '.cm-wiki-link-resolved': {
    color: '#d4d4d4',
    textDecorationColor: '#525252',
  },
  '.cm-wiki-link-unresolved': {
    color: '#525252',
  },
});
