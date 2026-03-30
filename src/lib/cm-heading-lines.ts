import { Range } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate } from '@codemirror/view';

function buildHeadingDecorations(view: EditorView): DecorationSet {
  const decos: Range<Decoration>[] = [];

  for (const { from, to } of view.visibleRanges) {
    let pos = from;

    while (pos <= to) {
      const line = view.state.doc.lineAt(pos);
      const text = line.text;
      const match = text.match(/^(#{1,6})\s+.*$/);

      if (match) {
        const level = match[1].length;
        decos.push(Decoration.line({ class: `cm-md-atx-h${level}` }).range(line.from));
      }

      if (line.to >= to) break;
      pos = line.to + 1;
    }
  }

  return Decoration.set(decos, true);
}

export const headingLines = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = buildHeadingDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = buildHeadingDecorations(update.view);
      }
    }
  },
  {
    decorations: (value) => value.decorations,
  }
);

export const headingLinesLightTheme = EditorView.theme({
  '.cm-md-atx-h1': { fontWeight: '700', fontSize: '1.25em', color: '#171717' },
  '.cm-md-atx-h2': { fontWeight: '600', fontSize: '1.125em', color: '#171717' },
  '.cm-md-atx-h3': { fontWeight: '600', fontSize: '1em', color: '#262626' },
  '.cm-md-atx-h4': { fontWeight: '600', color: '#262626' },
  '.cm-md-atx-h5': { fontWeight: '600', color: '#404040' },
  '.cm-md-atx-h6': { fontWeight: '600', color: '#404040' },
});

export const headingLinesDarkTheme = EditorView.theme({
  '.cm-md-atx-h1': { fontWeight: '700', fontSize: '1.25em', color: '#f5f5f5' },
  '.cm-md-atx-h2': { fontWeight: '600', fontSize: '1.125em', color: '#f5f5f5' },
  '.cm-md-atx-h3': { fontWeight: '600', fontSize: '1em', color: '#e5e5e5' },
  '.cm-md-atx-h4': { fontWeight: '600', color: '#e5e5e5' },
  '.cm-md-atx-h5': { fontWeight: '600', color: '#d4d4d4' },
  '.cm-md-atx-h6': { fontWeight: '600', color: '#d4d4d4' },
});
