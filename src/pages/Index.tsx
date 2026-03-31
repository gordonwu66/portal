import { useEffect, useState, useCallback, useRef } from 'react';
import { table } from '../lib/api';
import { cn } from '../lib/utils';
import { useTheme } from '../lib/theme';
import type { Theme } from '../lib/theme';
import { MarkdownEditor } from '../components/MarkdownEditor';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '../components/ui/resizable';
import { ScrollArea } from '../components/ui/scroll-area';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '../components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
  FilePlus,
  FolderPlus,
  Search,
  X,
  Trash2,
  MoreHorizontal,
  FileText,
  Copy,
  Sun,
  Moon,
  Monitor,
  Check,
} from 'lucide-react';

const TABLE_ID = '6b4a7072cff447389c3deecabb969409';

interface Note {
  row_id: number;
  title: string;
  content: string;
  updated_at: string;
}

// ─── Theme Toggle ────────────────────────────────────────────────────────────
function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const options: { value: Theme; label: string; icon: React.ReactNode }[] = [
    { value: 'light',  label: 'Light',  icon: <Sun     className="h-3.5 w-3.5" /> },
    { value: 'dark',   label: 'Dark',   icon: <Moon    className="h-3.5 w-3.5" /> },
    { value: 'system', label: 'System', icon: <Monitor className="h-3.5 w-3.5" /> },
  ];

  const activeIcon = options.find((o) => o.value === theme)?.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="h-6 w-6 flex items-center justify-center text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 rounded transition-colors">
          {activeIcon}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="top" className="w-32">
        {options.map((opt) => (
          <DropdownMenuItem key={opt.value} onClick={() => setTheme(opt.value)}>
            {opt.icon}
            <span>{opt.label}</span>
            {theme === opt.value && <Check className="h-3 w-3 ml-auto opacity-70" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function Index() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [unsaved, setUnsaved] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [, setTick] = useState(0);
  const saveTimeout = useRef<ReturnType<typeof setTimeout>>();
  const switchingNote = useRef(false);
  const { resolvedTheme } = useTheme();

  useEffect(() => { loadNotes(); }, []);

  // Tick every 30s so relative time label stays current
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const relativeTime = (date: Date): string => {
    const secs = Math.floor((Date.now() - date.getTime()) / 1000);
    if (secs < 10) return 'just now';
    if (secs < 60) return `${secs}s ago`;
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const sortAlpha = (list: Note[]) =>
    [...list].sort((a, b) => (a.title || '').localeCompare(b.title || '', undefined, { sensitivity: 'base' }));

  const loadNotes = async () => {
    const res = await table(TABLE_ID).getRows();
    if (res.success) {
      setNotes(sortAlpha(res.data));
      if (res.data.length > 0 && !activeNote) setActiveNote(res.data[0]);
    }
    setLoading(false);
  };

  const autoSave = useCallback((note: Note) => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    setUnsaved(true);
    saveTimeout.current = setTimeout(async () => {
      setUnsaved(false);
      setSaving(true);
      await table(TABLE_ID).updateRow(note.row_id, {
        title: note.title,
        content: note.content,
        updated_at: new Date().toISOString(),
      });
      setSaving(false);
      setLastSavedAt(new Date());
      setNotes((prev) =>
        sortAlpha(prev.map((n) => n.row_id === note.row_id ? { ...note, updated_at: new Date().toISOString() } : n))
      );
    }, 2000);
  }, []);

  const createNote = async () => {
    const res = await table(TABLE_ID).insertRow({
      title: 'Untitled', content: '', updated_at: new Date().toISOString(),
    });
    if (res.success) {
      const newNote = res.data as Note;
      setNotes((prev) => sortAlpha([...prev, newNote]));
      setActiveNote(newNote);
    }
  };

  const deleteNote = async (noteId: number) => {
    await table(TABLE_ID).deleteRow(noteId);
    setNotes((prev) => prev.filter((n) => n.row_id !== noteId));
    if (activeNote?.row_id === noteId) {
      const remaining = notes.filter((n) => n.row_id !== noteId);
      setActiveNote(remaining.length > 0 ? remaining[0] : null);
    }
  };

  const duplicateNote = async (note: Note) => {
    const res = await table(TABLE_ID).insertRow({
      title: `${note.title} (copy)`, content: note.content, updated_at: new Date().toISOString(),
    });
    if (res.success) setNotes((prev) => sortAlpha([...prev, res.data as Note]));
  };

  const noteTitles = notes.map((n) => n.title);

  const handleWikiNavigate = useCallback((title: string) => {
    const normalized = title.trim().toLowerCase();
    const target = notes.find((n) => n.title.trim().toLowerCase() === normalized);
    if (target) {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      setUnsaved(false);
      switchingNote.current = true;
      setActiveNote(target);
    }
  }, [notes]);

  const handleContentChange = (content: string) => {
    if (!activeNote) return;
    if (switchingNote.current) { switchingNote.current = false; return; }
    const updated = { ...activeNote, content };
    setActiveNote(updated);
    autoSave(updated);
  };

  const handleTitleChange = (title: string) => {
    if (!activeNote) return;
    if (switchingNote.current) { switchingNote.current = false; return; }
    const updated = { ...activeNote, title };
    setActiveNote(updated);
    autoSave(updated);
  };

  const filteredNotes = notes.filter((n) =>
    n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    n.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center text-neutral-400 dark:text-neutral-500 text-sm bg-white dark:bg-neutral-950">
        Loading notes...
      </div>
    );
  }

  const handleClass = 'w-px bg-neutral-200/60 dark:bg-neutral-700/50 hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors duration-100';

  return (
    <TooltipProvider delayDuration={400}>
      <div className="h-screen flex flex-col bg-white dark:bg-neutral-950">
        <ResizablePanelGroup direction="horizontal" className="flex-1">

          {/* ── Sidebar ── */}
          <ResizablePanel defaultSize={22} minSize={8} maxSize={50} className="overflow-hidden">
            <div className="h-full flex flex-col overflow-hidden bg-neutral-50/80 dark:bg-neutral-900/70">

              {/* Toolbar */}
              <div className="px-3 pt-3 pb-2 flex items-center justify-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
                      onClick={createNote}
                    >
                      <FilePlus className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>New note</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
                      onClick={() => {}}
                    >
                      <FolderPlus className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>New folder</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        'h-7 w-7 transition-colors',
                        searchOpen
                          ? 'text-neutral-900 dark:text-neutral-100 bg-neutral-200/60 dark:bg-neutral-700/60'
                          : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
                      )}
                      onClick={() => {
                        setSearchOpen((v) => {
                          const next = !v;
                          if (!next) setSearchQuery('');
                          else setTimeout(() => searchInputRef.current?.focus(), 50);
                          return next;
                        });
                      }}
                    >
                      <Search className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Search</TooltipContent>
                </Tooltip>
              </div>

              {/* Search bar — animated open/close */}
              <div className={cn(
                'overflow-hidden transition-all duration-200',
                searchOpen ? 'max-h-12 opacity-100 pt-px pb-2 px-3' : 'max-h-0 opacity-0'
              )}>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400 dark:text-neutral-500" />
                  <Input
                    ref={searchInputRef}
                    placeholder="Search notes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Escape') { setSearchOpen(false); setSearchQuery(''); } }}
                    className="h-8 pl-8 pr-7 text-xs bg-neutral-100 dark:bg-neutral-800 border-0 focus-visible:ring-1 focus-visible:ring-neutral-300 dark:focus-visible:ring-neutral-600 dark:text-neutral-200 dark:placeholder:text-neutral-500"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Notes List */}
              <ScrollArea className="flex-1 min-w-0">
                <div className="px-2 pb-2 overflow-hidden">
                  {filteredNotes.length === 0 ? (
                    <div className="px-3 py-8 text-center">
                      <FileText className="h-8 w-8 text-neutral-300 dark:text-neutral-600 mx-auto mb-2" />
                      <p className="text-xs text-neutral-400 dark:text-neutral-500">
                        {searchQuery ? 'No notes found' : 'No notes yet'}
                      </p>
                      {!searchQuery && (
                        <button
                          onClick={createNote}
                          className="text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 mt-1 font-medium"
                        >
                          Create your first note
                        </button>
                      )}
                    </div>
                  ) : (
                    filteredNotes.map((note) => (
                      <div
                        key={note.row_id}
                        onClick={() => { if (saveTimeout.current) clearTimeout(saveTimeout.current); setUnsaved(false); switchingNote.current = true; setActiveNote(note); }}
                        className={cn(
                          'group flex items-center justify-between gap-1 px-3 py-2 rounded-md cursor-pointer transition-colors duration-100 mb-0.5 min-w-0',
                          activeNote?.row_id === note.row_id
                            ? 'bg-white dark:bg-neutral-800'
                            : 'hover:bg-neutral-100/70 dark:hover:bg-neutral-800/50'
                        )}
                      >
                        <h3 className={cn(
                          'text-xs truncate min-w-0 flex-1',
                          activeNote?.row_id === note.row_id
                            ? 'text-neutral-900 dark:text-neutral-100'
                            : 'text-neutral-700 dark:text-neutral-300'
                        )}>
                          {note.title || 'Untitled'}
                        </h3>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              className="opacity-0 group-hover:opacity-100 h-5 w-5 flex items-center justify-center text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 shrink-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-36">
                            <DropdownMenuItem onClick={() => duplicateNote(note)}>
                              <Copy className="h-3.5 w-3.5 mr-2" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => deleteNote(note.row_id)}
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>

              {/* Footer: note count + theme toggle */}
              <div className="px-4 py-2.5 border-t border-neutral-200/40 dark:border-neutral-700/40 flex items-center justify-between">
                <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
                  {notes.length} note{notes.length !== 1 ? 's' : ''}
                </span>
                <ThemeToggle />
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle className={handleClass} />

          {/* ── Editor Area ── */}
          <ResizablePanel defaultSize={78} minSize={40}>
            {activeNote ? (
              <div className="h-full flex flex-col bg-white dark:bg-neutral-950">

                {/* Editor Header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-200/40 dark:border-neutral-700/40">
                  <div className="flex-1 mr-4">
                    <input
                      type="text"
                      value={activeNote.title}
                      onChange={(e) => handleTitleChange(e.target.value)}
                      placeholder="Untitled"
                      className="w-full text-base font-semibold text-neutral-900 dark:text-neutral-100 bg-transparent outline-none placeholder:text-neutral-300 dark:placeholder:text-neutral-600 tracking-tight"
                    />
                  </div>
                  <span className="flex items-center gap-1.5 text-[10px] text-neutral-400 dark:text-neutral-500">
                    {saving ? (
                      <>
                        <svg className="animate-spin h-3 w-3 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                        </svg>
                        Saving...
                      </>
                    ) : unsaved ? (
                      <span>Unsaved changes</span>
                    ) : (
                      <>Saved{lastSavedAt ? ` · ${relativeTime(lastSavedAt)}` : ''}</>
                    )}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden">
                  <MarkdownEditor content={activeNote.content} onChange={handleContentChange} isDark={resolvedTheme === 'dark'} noteTitles={noteTitles} onNavigate={handleWikiNavigate} />
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center bg-white dark:bg-neutral-950">
                <FileText className="h-12 w-12 text-neutral-200 dark:text-neutral-700 mb-3" />
                <p className="text-sm text-neutral-400 dark:text-neutral-500">No note selected</p>
                <button
                  onClick={createNote}
                  className="text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 mt-1 font-medium transition-colors"
                >
                  Create a new note
                </button>
              </div>
            )}
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </TooltipProvider>
  );
}


