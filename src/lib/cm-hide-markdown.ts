/**
 * CodeMirror 6 extension that hides markdown syntax markers
 * (e.g. ##, **, ~~, `, []()) on lines where the cursor is NOT present.
 * When the cursor moves to a line, the raw markdown is revealed for editing.
 */
import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate, WidgetType } from '@codemirror/view';
import { EditorState, Range } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Get the set of line numbers that contain cursor(s) / selection(s) */
function cursorLines(state: EditorState): Set<number> {
  const lines = new Set<number>();
  for (const range of state.selection.ranges) {
    const startLine = state.doc.lineAt(range.from).number;
    const endLine = state.doc.lineAt(range.to).number;
    for (let l = startLine; l <= endLine; l++) {
      lines.add(l);
    }
  }
  return lines;
}

/** Simple replace decoration that hides content */
const hide = Decoration.replace({});

/** Widget that renders a horizontal rule visually */
class HrWidget extends WidgetType {
  toDOM() {
    const el = document.createElement('hr');
    el.className = 'cm-md-hr';
    return el;
  }
}

// ─── Build decorations ─────────────────────────────────────────────────────

function buildDecorations(view: EditorView): DecorationSet {
  const { state } = view;
  const active = cursorLines(state);
  const decos: Range<Decoration>[] = [];
  const tree = syntaxTree(state);

  tree.iterate({
    enter(node) {
      const lineStart = state.doc.lineAt(node.from).number;
      const lineEnd = state.doc.lineAt(node.to).number;

      // Check if ANY line in this node range is active
      let isActive = false;
      for (let l = lineStart; l <= lineEnd; l++) {
        if (active.has(l)) { isActive = true; break; }
      }
      if (isActive) return;

      switch (node.name) {
        // ── Heading marks: hide "## " prefix ──
        case 'HeaderMark': {
          // Hide the header mark plus the space after it
          const after = node.to;
          const line = state.doc.lineAt(node.from);
          const nextChar = after < line.to ? state.doc.sliceString(after, after + 1) : '';
          const end = nextChar === ' ' ? after + 1 : after;
          decos.push(hide.range(node.from, end));
          break;
        }

        // ── Bold / italic marks: hide * or ** or _ ──
        case 'EmphasisMark': {
          decos.push(hide.range(node.from, node.to));
          break;
        }

        // ── Strikethrough marks: hide ~~ ──
        case 'StrikethroughMark': {
          decos.push(hide.range(node.from, node.to));
          break;
        }

        // ── Inline code marks: hide backticks ──
        case 'CodeMark': {
          // Only hide for inline code, not fenced code blocks
          const parent = node.node.parent;
          if (parent && parent.name === 'InlineCode') {
            decos.push(hide.range(node.from, node.to));
          }
          break;
        }

        // ── Links: hide [, ](url) — show only the link text ──
        case 'Link': {
          // Structure: LinkMark[ content LinkMark] ( URL )
          // We want to hide: opening [, closing ](url)
          const children: { name: string; from: number; to: number }[] = [];
          const cursor = node.node.cursor();
          if (cursor.firstChild()) {
            do {
              children.push({ name: cursor.name, from: cursor.from, to: cursor.to });
            } while (cursor.nextSibling());
          }

          // Find the LinkMarks and URL section
          const linkMarks = children.filter(c => c.name === 'LinkMark');
          const url = children.find(c => c.name === 'URL');

          if (linkMarks.length >= 1) {
            // Hide opening [
            decos.push(hide.range(linkMarks[0].from, linkMarks[0].to));
          }
          if (linkMarks.length >= 2 && url) {
            // Hide ](url) — from second LinkMark to end of URL parent area
            // The ] is linkMarks[1], then ( URL ) follows
            decos.push(hide.range(linkMarks[1].from, node.to));
          } else if (linkMarks.length >= 2) {
            // Hide just the closing ]
            decos.push(hide.range(linkMarks[1].from, linkMarks[1].to));
          }

          // Don't recurse into Link children (we handled it)
          return false;
        }

        // ── Images: hide ![alt](url) → show alt text with decoration ──
        case 'Image': {
          const children: { name: string; from: number; to: number }[] = [];
          const cursor = node.node.cursor();
          if (cursor.firstChild()) {
            do {
              children.push({ name: cursor.name, from: cursor.from, to: cursor.to });
            } while (cursor.nextSibling());
          }

          const linkMarks = children.filter(c => c.name === 'LinkMark');

          if (linkMarks.length >= 1) {
            // Hide ![ at start
            decos.push(hide.range(node.from, linkMarks[0].to));
          }
          if (linkMarks.length >= 2) {
            // Hide ](url) at end
            decos.push(hide.range(linkMarks[1].from, node.to));
          }

          return false;
        }

        // ── Blockquote mark: hide > ──
        case 'QuoteMark': {
          const after = node.to;
          const line = state.doc.lineAt(node.from);
          const nextChar = after < line.to ? state.doc.sliceString(after, after + 1) : '';
          const end = nextChar === ' ' ? after + 1 : after;
          decos.push(hide.range(node.from, end));
          break;
        }

        // ── Horizontal rule: replace --- with styled hr ──
        case 'HorizontalRule': {
          decos.push(
            Decoration.replace({ widget: new HrWidget() }).range(node.from, node.to)
          );
          break;
        }
      }
    },
  });

  // Sort by position (required by CodeMirror)
  decos.sort((a, b) => a.from - b.from || a.to - b.to);

  return Decoration.set(decos);
}

// ─── Plugin ─────────────────────────────────────────────────────────────────

export const hideMarkdownSyntax = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = buildDecorations(view);
    }

    update(update: ViewUpdate) {
      if (
        update.docChanged ||
        update.selectionSet ||
        update.viewportChanged ||
        syntaxTree(update.state) !== syntaxTree(update.startState)
      ) {
        this.decorations = buildDecorations(update.view);
      }
    }
  },
  { decorations: (v) => v.decorations }
);

// ─── Styling for the hr widget ──────────────────────────────────────────────

export const hideMarkdownSyntaxBaseTheme = EditorView.baseTheme({
  '.cm-md-hr': {
    border: 'none',
    borderTop: '1px solid #e5e5e5',
    margin: '0.5em 0',
  },
});

export const hideMarkdownSyntaxLightTheme = EditorView.theme({
  '.cm-md-hr': {
    borderTopColor: '#e5e5e5',
  },
});

export const hideMarkdownSyntaxDarkTheme = EditorView.theme({
  '.cm-md-hr': {
    borderTopColor: '#404040',
  },
});
