const FONT_STACK = '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, "Helvetica Neue", Arial, sans-serif';

import { useEffect, useRef, useCallback, useMemo } from 'react';
import { EditorState, EditorSelection, Compartment } from '@codemirror/state';
import { EditorView, keymap, placeholder as cmPlaceholder, drawSelection, rectangularSelection } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { syntaxHighlighting, HighlightStyle, indentOnInput, bracketMatching, foldKeymap } from '@codemirror/language';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { tags } from '@lezer/highlight';
import { hideMarkdownSyntax, hideMarkdownSyntaxBaseTheme, hideMarkdownSyntaxLightTheme, hideMarkdownSyntaxDarkTheme } from '../lib/cm-hide-markdown';
import { noteTitlesFacet, onNavigateFacet, wikiLinksPlugin, wikiLinksClickHandler, wikiLinksBaseTheme, wikiLinksLightTheme, wikiLinksDarkTheme } from '../lib/cm-wiki-links';
import { headingLines, headingLinesLightTheme, headingLinesDarkTheme } from '../lib/cm-heading-lines';

// ─── Light theme ────────────────────────────────────────────────────────────
const lightHighlightStyle = HighlightStyle.define([
  { tag: tags.strong, fontWeight: '600', color: '#262626' },
  { tag: tags.emphasis, fontStyle: 'italic', color: '#525252' },
  { tag: tags.strikethrough, textDecoration: 'line-through', color: '#a3a3a3' },
  { tag: tags.link, color: '#404040', textDecoration: 'underline' },
  { tag: tags.url, color: '#737373' },
  { tag: tags.monospace, fontFamily: 'ui-monospace, monospace', color: '#525252', background: '#f5f5f5', borderRadius: '3px', padding: '1px 4px' },
  { tag: tags.quote, color: '#737373', fontStyle: 'italic' },
  { tag: tags.list, color: '#525252' },
  { tag: tags.processingInstruction, color: '#a3a3a3' },
  { tag: tags.meta, color: '#a3a3a3' },
  { tag: tags.contentSeparator, color: '#d4d4d4' },
]);

const lightTheme = EditorView.theme({
  '&': {
    backgroundColor: 'transparent',
    color: '#525252',
    fontSize: '0.9375rem',
    fontFamily: FONT_STACK,
  },
  '.cm-content': {
    padding: '1rem 0',
    lineHeight: '1.7',
    caretColor: '#171717',
    fontFamily: FONT_STACK,
  },
  '.cm-line': {
    padding: '0 1.25rem',
  },
  '&.cm-focused': {
    outline: 'none',
  },
  '.cm-cursor': {
    borderLeftColor: '#171717',
    borderLeftWidth: '1.5px',
  },
  '.cm-selectionBackground': {
    backgroundColor: '#e5e5e5 !important',
  },
  '&.cm-focused .cm-selectionBackground': {
    backgroundColor: '#d4d4d4 !important',
  },
  '.cm-gutters': {
    display: 'none',
  },
  '.cm-foldGutter': {
    display: 'none',
  },
  '.cm-scroller': {
    overflow: 'auto',
  },
  '.cm-placeholder': {
    color: '#d4d4d4',
    fontStyle: 'normal',
  },
});

// ─── Dark theme ─────────────────────────────────────────────────────────────
const darkHighlightStyle = HighlightStyle.define([
  { tag: tags.strong, fontWeight: '600', color: '#e5e5e5' },
  { tag: tags.emphasis, fontStyle: 'italic', color: '#a3a3a3' },
  { tag: tags.strikethrough, textDecoration: 'line-through', color: '#525252' },
  { tag: tags.link, color: '#d4d4d4', textDecoration: 'underline' },
  { tag: tags.url, color: '#737373' },
  { tag: tags.monospace, fontFamily: 'ui-monospace, monospace', color: '#a3a3a3', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', padding: '1px 4px' },
  { tag: tags.quote, color: '#737373', fontStyle: 'italic' },
  { tag: tags.list, color: '#d4d4d4' },
  { tag: tags.processingInstruction, color: '#525252' },
  { tag: tags.meta, color: '#525252' },
  { tag: tags.contentSeparator, color: '#404040' },
]);

const darkTheme = EditorView.theme({
  '&': {
    backgroundColor: 'transparent',
    color: '#d4d4d4',
    fontSize: '0.9375rem',
    fontFamily: FONT_STACK,
  },
  '.cm-content': {
    padding: '1rem 0',
    lineHeight: '1.7',
    caretColor: '#f5f5f5',
    fontFamily: FONT_STACK,
  },
  '.cm-line': {
    padding: '0 1.25rem',
  },
  '&.cm-focused': {
    outline: 'none',
  },
  '.cm-cursor': {
    borderLeftColor: '#f5f5f5',
    borderLeftWidth: '1.5px',
  },
  '.cm-selectionBackground': {
    backgroundColor: '#404040 !important',
  },
  '&.cm-focused .cm-selectionBackground': {
    backgroundColor: '#525252 !important',
  },
  '.cm-gutters': {
    display: 'none',
  },
  '.cm-foldGutter': {
    display: 'none',
  },
  '.cm-scroller': {
    overflow: 'auto',
  },
  '.cm-placeholder': {
    color: '#404040',
    fontStyle: 'normal',
  },
});

// ─── Compartments (for dynamic reconfiguration without state reset) ─────────
const themeCompartment = new Compartment();
const highlightCompartment = new Compartment();
const headingThemeCompartment = new Compartment();
const hideMarkdownThemeCompartment = new Compartment();
const wikiTitlesCompartment = new Compartment();
const wikiNavigateCompartment = new Compartment();
const wikiThemeCompartment = new Compartment();

function toggleWrapCommand(prefix: string, suffix = prefix) {
  return (view: EditorView) => {
    const { state } = view;

    const transaction = state.changeByRange((range) => {
      const selectedText = state.doc.sliceString(range.from, range.to);
      const textBefore = state.doc.sliceString(Math.max(0, range.from - prefix.length), range.from);
      const textAfter = state.doc.sliceString(range.to, Math.min(state.doc.length, range.to + suffix.length));
      const isWrapped = textBefore === prefix && textAfter === suffix;

      if (isWrapped) {
        return {
          changes: [
            { from: range.from - prefix.length, to: range.from, insert: '' },
            { from: range.to, to: range.to + suffix.length, insert: '' },
          ],
          range: EditorSelection.range(range.from - prefix.length, range.to - prefix.length),
        };
      }

      if (range.empty) {
        return {
          changes: { from: range.from, to: range.to, insert: `${prefix}${suffix}` },
          range: EditorSelection.cursor(range.from + prefix.length),
        };
      }

      return {
        changes: { from: range.from, to: range.to, insert: `${prefix}${selectedText}${suffix}` },
        range: EditorSelection.range(range.from + prefix.length, range.to + prefix.length),
      };
    });

    view.dispatch(state.update(transaction, { scrollIntoView: true, userEvent: 'input' }));
    return true;
  };
}

const markdownShortcutKeymap = [
  { key: 'Mod-b', run: toggleWrapCommand('**') },
  { key: 'Mod-i', run: toggleWrapCommand('*') },
  { key: 'Mod-Shift-s', run: toggleWrapCommand('~~') },
  { key: 'Mod-e', run: toggleWrapCommand('`') },
];

// ─── Component ──────────────────────────────────────────────────────────────
interface MarkdownEditorProps {
  content: string;
  onChange: (value: string) => void;
  isDark?: boolean;
  noteTitles?: string[];
  onNavigate?: (title: string) => void;
}

export function MarkdownEditor({ content, onChange, isDark = false, noteTitles = [], onNavigate }: MarkdownEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onNavigateRef = useRef(onNavigate);
  onNavigateRef.current = onNavigate;

  // Track the last content we sent via onChange so we can skip echoes
  const lastEmittedContent = useRef<string | null>(null);

  // Stable serialized key for noteTitles to avoid unnecessary reconfiguration
  const titlesKey = useMemo(() => JSON.stringify(noteTitles), [noteTitles]);

  const getExtensions = useCallback((dark: boolean) => [
    themeCompartment.of(dark ? darkTheme : lightTheme),
    highlightCompartment.of(syntaxHighlighting(dark ? darkHighlightStyle : lightHighlightStyle)),
    markdown({ base: markdownLanguage, codeLanguages: languages }),
    history(),
    drawSelection(),
    rectangularSelection(),
    highlightSelectionMatches(),
    indentOnInput(),
    bracketMatching(),
    closeBrackets(),
    autocompletion(),
    headingLines,
    headingThemeCompartment.of(dark ? headingLinesDarkTheme : headingLinesLightTheme),
    hideMarkdownSyntax,
    hideMarkdownSyntaxBaseTheme,
    hideMarkdownThemeCompartment.of(dark ? hideMarkdownSyntaxDarkTheme : hideMarkdownSyntaxLightTheme),
    wikiTitlesCompartment.of(noteTitlesFacet.of(noteTitles)),
    wikiNavigateCompartment.of(onNavigateFacet.of((...args: Parameters<typeof onNavigateRef.current & Function>) => onNavigateRef.current?.(...args))),
    wikiLinksPlugin,
    wikiLinksClickHandler,
    wikiLinksBaseTheme,
    wikiThemeCompartment.of(dark ? wikiLinksDarkTheme : wikiLinksLightTheme),
    cmPlaceholder('Start writing in markdown...'),
    keymap.of([
      ...markdownShortcutKeymap,
      ...defaultKeymap,
      ...historyKeymap,
      ...searchKeymap,
      ...completionKeymap,
      ...closeBracketsKeymap,
      ...foldKeymap,
      indentWithTab,
    ]),
    EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        const newContent = update.state.doc.toString();
        lastEmittedContent.current = newContent;
        onChangeRef.current(newContent);
      }
    }),
    EditorView.lineWrapping,
  ], []);

  // Create editor (once)
  useEffect(() => {
    if (!containerRef.current) return;

    const state = EditorState.create({
      doc: content,
      extensions: getExtensions(isDark),
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // Only create once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync content from parent (e.g., switching notes)
  // Skip if the incoming content is just the echo of what CodeMirror last emitted
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    // If the parent is feeding back exactly what we last typed, skip
    if (content === lastEmittedContent.current) return;

    const currentContent = view.state.doc.toString();
    if (currentContent !== content) {
      lastEmittedContent.current = null;
      view.dispatch({
        changes: { from: 0, to: currentContent.length, insert: content },
      });
    }
  }, [content]);

  // Reconfigure theme when dark mode changes (preserves cursor, selection, history)
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    view.dispatch({
      effects: [
        themeCompartment.reconfigure(isDark ? darkTheme : lightTheme),
        highlightCompartment.reconfigure(syntaxHighlighting(isDark ? darkHighlightStyle : lightHighlightStyle)),
        headingThemeCompartment.reconfigure(isDark ? headingLinesDarkTheme : headingLinesLightTheme),
        hideMarkdownThemeCompartment.reconfigure(isDark ? hideMarkdownSyntaxDarkTheme : hideMarkdownSyntaxLightTheme),
        wikiThemeCompartment.reconfigure(isDark ? wikiLinksDarkTheme : wikiLinksLightTheme),
      ],
    });
  }, [isDark]);

  // Reconfigure wiki-link titles when they change
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    view.dispatch({
      effects: [
        wikiTitlesCompartment.reconfigure(noteTitlesFacet.of(noteTitles)),
      ],
    });
    // Use titlesKey for stable comparison instead of noteTitles array ref
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [titlesKey]);

  // Reconfigure wiki-link navigation callback when it changes
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    view.dispatch({
      effects: [
        wikiNavigateCompartment.reconfigure(
          onNavigateFacet.of((...args: Parameters<NonNullable<typeof onNavigate>>) => onNavigateRef.current?.(...args))
        ),
      ],
    });
  }, [onNavigate]);

  return (
    <div
      ref={containerRef}
      className="w-full [&_.cm-editor]:min-h-full [&_.cm-scroller]:min-h-full"
    />
  );
}
