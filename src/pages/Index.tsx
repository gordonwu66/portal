import type React from 'react';
import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { table } from '../lib/api';
import { cn } from '../lib/utils';
import { useTheme } from '../lib/theme';
import type { Theme } from '../lib/theme';
import { MarkdownEditor } from '../components/MarkdownEditor';
import { NotesTree } from '../components/NotesTree';
import {
  buildNoteTree,
  collectDescendantIds,
  getAncestorFolderIds,
  getFolderPath,
  getMoveTargets,
  isFolder,
  normalizeParentId,
  sortTreeItems,
  type NoteItem,
} from '../lib/notes-tree';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  FilePlus,
  FolderPlus,
  Search,
  X,
  FileText,
  Sun,
  Moon,
  Monitor,
  Check,
  Folder,
  ArrowRight,
  Pencil,
} from 'lucide-react';

const TABLE_ID = '6b4a7072cff447389c3deecabb969409';
const ROOT_MOVE_TARGET = '__root__';

type Note = NoteItem;

function normalizeNote(item: Record<string, unknown>): Note {
  return {
    row_id: Number(item.row_id ?? item._row_id),
    title: String(item.title ?? ''),
    content: String(item.content ?? ''),
    updated_at: String(item.updated_at ?? new Date().toISOString()),
    is_folder: Boolean(item.is_folder),
    parent_id: normalizeParentId(item.parent_id as string | null | undefined),
  };
}

function findFirstEditableNote(items: Note[]): Note | null {
  const tree = buildNoteTree(items);
  const stack = [...tree];

  while (stack.length > 0) {
    const current = stack.shift();
    if (!current) continue;
    if (!isFolder(current)) return current;
    stack.unshift(...current.children);
  }

  return null;
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const options: { value: Theme; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: 'Light', icon: <Sun className="h-3.5 w-3.5" /> },
    { value: 'dark', label: 'Dark', icon: <Moon className="h-3.5 w-3.5" /> },
    { value: 'system', label: 'System', icon: <Monitor className="h-3.5 w-3.5" /> },
  ];

  const activeIcon = options.find((option) => option.value === theme)?.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="h-6 w-6 flex items-center justify-center text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 rounded transition-colors">
          {activeIcon}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="top" className="w-32">
        {options.map((option) => (
          <DropdownMenuItem key={option.value} onClick={() => setTheme(option.value)}>
            {option.icon}
            <span>{option.label}</span>
            {theme === option.value && <Check className="h-3 w-3 ml-auto opacity-70" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function Index() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [focusedItemId, setFocusedItemId] = useState<number | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [unsaved, setUnsaved] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [moveItem, setMoveItem] = useState<Note | null>(null);
  const [moveTarget, setMoveTarget] = useState(ROOT_MOVE_TARGET);
  const [renamingFolder, setRenamingFolder] = useState(false);
  const folderRenameRef = useRef('');
  const [, setTick] = useState(0);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const saveTimeout = useRef<ReturnType<typeof setTimeout>>();
  const switchingNote = useRef(false);
  const pendingSaveRef = useRef<Note | null>(null);
  const notesRef = useRef<Note[]>([]);
  notesRef.current = notes;
  const { resolvedTheme } = useTheme();

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

  const tree = useMemo(() => buildNoteTree(notes), [notes]);
  const moveTargets = useMemo(
    () => getMoveTargets(notes, moveItem).map((target) => ({
      ...target,
      value: target.value === '' ? ROOT_MOVE_TARGET : target.value,
    })),
    [notes, moveItem]
  );
  const noteTitles = useMemo(() => notes.filter((item) => !isFolder(item)).map((item) => item.title), [notes]);

  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [];

    return sortTreeItems(
      notes.filter((item) =>
        !isFolder(item) && (
          item.title.toLowerCase().includes(query) ||
          item.content.toLowerCase().includes(query)
        )
      )
    );
  }, [notes, searchQuery]);

  const editableCount = notes.filter((item) => !isFolder(item)).length;
  const folderCount = notes.filter((item) => isFolder(item)).length;
  const focusedItem = notes.find((item) => item.row_id === focusedItemId) ?? null;

  const expandAncestors = useCallback((item: Note | null, sourceItems?: Note[]) => {
    if (!item) return;
    const items = sourceItems ?? notesRef.current;
    const ancestorIds = getAncestorFolderIds(items, item);
    if (ancestorIds.length === 0) return;

    setExpandedFolders((prev) => {
      const next = new Set(prev);
      ancestorIds.forEach((id) => next.add(id));
      return next;
    });
  }, []);

  const persistNote = useCallback(async (note: Note) => {
    const timestamp = new Date().toISOString();
    pendingSaveRef.current = null;
    setSaving(true);

    const result = await table(TABLE_ID).updateRow(note.row_id, {
      title: note.title,
      content: note.content,
      updated_at: timestamp,
    });

    setSaving(false);

    if (result.success) {
      const savedAt = new Date(timestamp);
      setLastSavedAt(savedAt);
      setNotes((prev) => prev.map((item) => (
        item.row_id === note.row_id ? { ...item, updated_at: timestamp } : item
      )));
      setActiveNote((prev) => (
        prev?.row_id === note.row_id ? { ...prev, updated_at: timestamp } : prev
      ));
    }
  }, []);

  const flushPendingSave = useCallback(async () => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    const pending = pendingSaveRef.current;
    if (!pending) return;
    setUnsaved(false);
    await persistNote(pending);
  }, [persistNote]);

  const autoSave = useCallback((note: Note) => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    pendingSaveRef.current = note;
    setUnsaved(true);

    saveTimeout.current = setTimeout(async () => {
      const pending = pendingSaveRef.current;
      if (!pending) return;
      setUnsaved(false);
      await persistNote(pending);
    }, 2000);
  }, [persistNote]);

  const loadNotes = useCallback(async () => {
    setLoading(true);
    const res = await table(TABLE_ID).getRows();

    if (res.success) {
      const nextNotes = ((res.data as Record<string, unknown>[]) ?? []).map(normalizeNote);
      setNotes(nextNotes);

      setActiveNote((prev) => {
        if (prev) {
          const updated = nextNotes.find((item) => item.row_id === prev.row_id && !isFolder(item)) ?? null;
          if (updated) {
            expandAncestors(updated, nextNotes);
            return updated;
          }
        }

        const firstNote = findFirstEditableNote(nextNotes);
        if (firstNote) {
          expandAncestors(firstNote, nextNotes);
          setFocusedItemId(firstNote.row_id);
        }
        return firstNote;
      });

      setFocusedItemId((prev) => {
        if (prev && nextNotes.some((item) => item.row_id === prev)) return prev;
        const firstNote = findFirstEditableNote(nextNotes);
        return firstNote?.row_id ?? nextNotes[0]?.row_id ?? null;
      });
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void loadNotes();
  }, [loadNotes]);

  useEffect(() => {
    const id = setInterval(() => setTick((tick) => tick + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, []);

  const handleSelectNote = useCallback(async (note: Note) => {
    await flushPendingSave();
    switchingNote.current = true;
    expandAncestors(note);
    setFocusedItemId(note.row_id);
    setActiveNote(note);
    setRenamingFolder(false);
  }, [expandAncestors, flushPendingSave]);

  const handleToggleFolder = useCallback(async (folder: Note) => {
    await flushPendingSave();
    setRenamingFolder(false);
    setFocusedItemId(folder.row_id);
    setActiveNote(null);
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folder.row_id)) next.delete(folder.row_id);
      else next.add(folder.row_id);
      return next;
    });
  }, [flushPendingSave]);

  const getDefaultParentId = useCallback(() => {
    if (focusedItem && isFolder(focusedItem)) return String(focusedItem.row_id);
    if (activeNote) return normalizeParentId(activeNote.parent_id);
    return '';
  }, [focusedItem, activeNote]);

  const createNote = useCallback(async (parentId?: string) => {
    await flushPendingSave();
    const targetParentId = normalizeParentId(parentId ?? getDefaultParentId());

    const res = await table(TABLE_ID).insertRow({
      title: 'Untitled',
      content: '',
      updated_at: new Date().toISOString(),
      is_folder: false,
      parent_id: targetParentId,
    });

    if (!res.success) return;

    const newNote = normalizeNote(res.data as Record<string, unknown>);
    const nextNotes = [...notes, newNote];
    setNotes(nextNotes);
    expandAncestors(newNote, nextNotes);
    setFocusedItemId(newNote.row_id);
    setActiveNote(newNote);
  }, [expandAncestors, flushPendingSave, getDefaultParentId, notes]);

  const createFolder = useCallback(async (parentId?: string) => {
    await flushPendingSave();
    const targetParentId = normalizeParentId(parentId ?? getDefaultParentId());

    const res = await table(TABLE_ID).insertRow({
      title: 'New Folder',
      content: '',
      updated_at: new Date().toISOString(),
      is_folder: true,
      parent_id: targetParentId,
    });

    if (!res.success) return;

    const newFolder = normalizeNote(res.data as Record<string, unknown>);
    const nextNotes = [...notes, newFolder];
    setNotes(nextNotes);
    expandAncestors(newFolder, nextNotes);
    setExpandedFolders((prev) => new Set(prev).add(newFolder.row_id));
    setFocusedItemId(newFolder.row_id);
  }, [expandAncestors, flushPendingSave, getDefaultParentId, notes]);

  const saveFolderRename = useCallback(async (folderId: number, oldTitle: string) => {
    const trimmed = folderRenameRef.current.trim();
    setRenamingFolder(false);
    if (!trimmed || trimmed === oldTitle) return;
    const res = await table(TABLE_ID).updateRow(folderId, {
      title: trimmed,
      updated_at: new Date().toISOString(),
    });
    if (res.success) {
      setNotes((prev) =>
        prev.map((n) => (n.row_id === folderId ? { ...n, title: trimmed, updated_at: new Date().toISOString() } : n))
      );
    }
  }, []);

  const duplicateNote = useCallback(async (note: Note) => {
    await flushPendingSave();

    const res = await table(TABLE_ID).insertRow({
      title: `${note.title} (copy)`,
      content: note.content,
      updated_at: new Date().toISOString(),
      is_folder: false,
      parent_id: normalizeParentId(note.parent_id),
    });

    if (!res.success) return;

    const duplicated = normalizeNote(res.data as Record<string, unknown>);
    const nextNotes = [...notes, duplicated];
    setNotes(nextNotes);
    expandAncestors(duplicated, nextNotes);
  }, [expandAncestors, notes]);

  const deleteItem = useCallback(async (item: Note) => {
    await flushPendingSave();

    if (moveItem?.row_id === item.row_id) {
      setMoveItem(null);
      setMoveTarget(ROOT_MOVE_TARGET);
    }

    const message = isFolder(item)
      ? `Delete “${item.title || 'Untitled folder'}” and all nested notes and folders?`
      : `Delete “${item.title || 'Untitled'}”?`;

    if (!window.confirm(message)) return;

    const descendantIds = isFolder(item)
      ? Array.from(collectDescendantIds(notes, item.row_id)).map((id) => Number(id)).reverse()
      : [];

    for (const id of descendantIds) {
      await table(TABLE_ID).deleteRow(id);
    }

    await table(TABLE_ID).deleteRow(item.row_id);

    const removedIds = new Set<number>([item.row_id, ...descendantIds]);
    const survivors = notes.filter((entry) => !removedIds.has(entry.row_id));
    setNotes(survivors);

    setExpandedFolders((prev) => {
      const next = new Set<number>();
      prev.forEach((id) => {
        if (!removedIds.has(id)) next.add(id);
      });
      return next;
    });

    const activeWasRemoved = activeNote ? removedIds.has(activeNote.row_id) : false;
    const focusedWasRemoved = focusedItemId ? removedIds.has(focusedItemId) : false;

    if (activeWasRemoved) {
      const nextActive = findFirstEditableNote(survivors);
      setActiveNote(nextActive);
      if (nextActive) {
        expandAncestors(nextActive, survivors);
        setFocusedItemId(nextActive.row_id);
      } else if (focusedWasRemoved) {
        setFocusedItemId(survivors[0]?.row_id ?? null);
      }
    } else if (focusedWasRemoved) {
      setFocusedItemId(activeNote?.row_id ?? survivors[0]?.row_id ?? null);
    }
  }, [activeNote, expandAncestors, flushPendingSave, focusedItemId, notes]);

  const openMoveDialog = useCallback((item: Note) => {
    setMoveItem(item);
    setMoveTarget(normalizeParentId(item.parent_id) || ROOT_MOVE_TARGET);
  }, []);

  const confirmMove = useCallback(async () => {
    if (!moveItem) return;

    const targetParentId = moveTarget === ROOT_MOVE_TARGET ? '' : normalizeParentId(moveTarget);
    const result = await table(TABLE_ID).updateRow(moveItem.row_id, {
      parent_id: targetParentId,
    });

    if (!result.success) return;

    const updatedItem = { ...moveItem, parent_id: targetParentId };
    const nextNotes = notes.map((item) => (
      item.row_id === moveItem.row_id ? updatedItem : item
    ));

    setNotes(nextNotes);
    setMoveItem(null);
    setMoveTarget(ROOT_MOVE_TARGET);
    setFocusedItemId(updatedItem.row_id);
    expandAncestors(updatedItem, nextNotes);

    if (activeNote?.row_id === updatedItem.row_id && !isFolder(updatedItem)) {
      setActiveNote(updatedItem);
    }
  }, [activeNote, expandAncestors, moveItem, moveTarget, notes]);

  const handleWikiNavigate = useCallback(async (title: string) => {
    const normalized = title.trim().toLowerCase();
    const target = notes.find((item) => !isFolder(item) && item.title.trim().toLowerCase() === normalized);
    if (!target) return;
    await handleSelectNote(target);
  }, [handleSelectNote, notes]);

  const handleContentChange = (content: string) => {
    if (!activeNote) return;
    if (switchingNote.current) {
      switchingNote.current = false;
      return;
    }

    const updated = { ...activeNote, content };
    setActiveNote(updated);
    setNotes((prev) => prev.map((item) => item.row_id === updated.row_id ? updated : item));
    autoSave(updated);
  };

  const handleTitleChange = (title: string) => {
    if (!activeNote) return;
    if (switchingNote.current) {
      switchingNote.current = false;
      return;
    }

    const updated = { ...activeNote, title };
    setActiveNote(updated);
    setNotes((prev) => prev.map((item) => item.row_id === updated.row_id ? updated : item));
    autoSave(updated);
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center text-neutral-400 dark:text-neutral-500 text-sm bg-white dark:bg-neutral-950">
        Loading notes...
      </div>
    );
  }

  const handleClass = 'w-px bg-neutral-200/60 dark:bg-neutral-700/50 hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors duration-100';
  const activeNoteFolderPath = activeNote ? getFolderPath(notes, activeNote) : '';

  return (
    <TooltipProvider delayDuration={400}>
      <Dialog open={Boolean(moveItem)} onOpenChange={(open) => {
        if (!open) {
          setMoveItem(null);
          setMoveTarget(ROOT_MOVE_TARGET);
        }
      }}>
        <div className="h-screen flex flex-col bg-white dark:bg-neutral-950">
          <ResizablePanelGroup direction="horizontal" className="flex-1">
            <ResizablePanel defaultSize={24} minSize={10} maxSize={50} className="overflow-hidden">
              <div className="h-full flex flex-col overflow-hidden bg-neutral-50/80 dark:bg-neutral-900/70">
                <div className="px-3 pt-6 pb-2 flex items-center justify-center gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
                        onClick={() => void createNote()}
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
                        onClick={() => void createFolder()}
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
                          setSearchOpen((value) => {
                            const next = !value;
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
                      onChange={(event) => setSearchQuery(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Escape') {
                          setSearchOpen(false);
                          setSearchQuery('');
                        }
                      }}
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

                <ScrollArea className="flex-1 min-w-0">
                  <div className="px-2 pb-2 overflow-hidden">
                    {notes.length === 0 ? (
                      <div className="px-3 py-8 text-center">
                        <FileText className="h-8 w-8 text-neutral-300 dark:text-neutral-600 mx-auto mb-2" />
                        <p className="text-xs text-neutral-400 dark:text-neutral-500">No notes or folders yet</p>
                        <div className="mt-2 flex items-center justify-center gap-2">
                          <button
                            onClick={() => void createNote()}
                            className="text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 font-medium"
                          >
                            New note
                          </button>
                          <span className="text-neutral-300 dark:text-neutral-700">•</span>
                          <button
                            onClick={() => void createFolder()}
                            className="text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 font-medium"
                          >
                            New folder
                          </button>
                        </div>
                      </div>
                    ) : searchQuery ? (
                      searchResults.length === 0 ? (
                        <div className="px-3 py-8 text-center">
                          <FileText className="h-8 w-8 text-neutral-300 dark:text-neutral-600 mx-auto mb-2" />
                          <p className="text-xs text-neutral-400 dark:text-neutral-500">No matching notes found</p>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {searchResults.map((note) => (
                            <button
                              key={note.row_id}
                              onClick={() => void handleSelectNote(note)}
                              className={cn(
                                'w-full text-left px-3 py-2 rounded-md transition-colors',
                                activeNote?.row_id === note.row_id
                                  ? 'bg-white dark:bg-neutral-800'
                                  : 'hover:bg-neutral-100/70 dark:hover:bg-neutral-800/50'
                              )}
                            >
                              <div className="text-xs text-neutral-800 dark:text-neutral-100 truncate">
                                {note.title || 'Untitled'}
                              </div>
                              <div className="mt-1 text-[10px] text-neutral-400 dark:text-neutral-500 truncate">
                                {getFolderPath(notes, note)}
                              </div>
                            </button>
                          ))}
                        </div>
                      )
                    ) : (
                      <NotesTree
                        tree={tree}
                        activeNoteId={activeNote?.row_id ?? null}
                        focusedItemId={focusedItemId}
                        expandedFolders={expandedFolders}
                        onToggleFolder={(item) => void handleToggleFolder(item)}
                        onSelectNote={(item) => void handleSelectNote(item)}
                        onCreateNote={(parentId) => void createNote(parentId)}
                        onCreateFolder={(parentId) => void createFolder(parentId)}
                        onDuplicate={(item) => void duplicateNote(item)}
                        onDelete={(item) => void deleteItem(item)}
                        onMove={openMoveDialog}
                      />
                    )}
                  </div>
                </ScrollArea>

                <div className="px-4 py-2.5 border-t border-neutral-200/40 dark:border-neutral-700/40 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-neutral-400 dark:text-neutral-500 truncate">
                    {editableCount} note{editableCount !== 1 ? 's' : ''} · {folderCount} folder{folderCount !== 1 ? 's' : ''}
                  </span>
                  <ThemeToggle />
                </div>
              </div>
            </ResizablePanel>

            <ResizableHandle className={handleClass} />

            <ResizablePanel defaultSize={76} minSize={40}>
              {activeNote ? (
                <div className="h-full flex flex-col bg-white dark:bg-neutral-950">
                  <div className="px-5 pt-2 pb-3 border-b border-neutral-200/40 dark:border-neutral-700/40">
                    <div className="text-[10px] text-neutral-400 dark:text-neutral-500 text-center truncate min-h-[14px]">
                      {activeNoteFolderPath !== 'Root' ? activeNoteFolderPath : null}
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <input
                          type="text"
                          value={activeNote.title}
                          onChange={(event) => handleTitleChange(event.target.value)}
                          placeholder="Untitled"
                          className="w-full text-base font-semibold text-neutral-900 dark:text-neutral-100 bg-transparent outline-none placeholder:text-neutral-300 dark:placeholder:text-neutral-600 tracking-tight"
                        />
                      </div>
                      <span className="flex items-center gap-1.5 text-[10px] text-neutral-400 dark:text-neutral-500 shrink-0">
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
                  </div>

                  <div className="flex-1 overflow-hidden">
                    <MarkdownEditor
                      content={activeNote.content}
                      onChange={handleContentChange}
                      isDark={resolvedTheme === 'dark'}
                      noteTitles={noteTitles}
                      onNavigate={(title) => void handleWikiNavigate(title)}
                    />
                  </div>
                </div>
              ) : focusedItem && isFolder(focusedItem) ? (
                <div className="h-full flex flex-col items-center justify-center bg-white dark:bg-neutral-950 px-8 text-center">
                  <Folder className="h-12 w-12 text-neutral-200 dark:text-neutral-700 mb-3" />
                  {renamingFolder ? (
                    <Input
                      autoFocus
                      defaultValue={focusedItem.title}
                      onChange={(e) => { folderRenameRef.current = e.target.value; }}
                      onBlur={() => void saveFolderRename(focusedItem.row_id, focusedItem.title)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          (e.target as HTMLInputElement).blur();
                        }
                        if (e.key === 'Escape') {
                          folderRenameRef.current = focusedItem.title;
                          (e.target as HTMLInputElement).blur();
                        }
                      }}
                      className="h-8 text-sm w-48 text-center"
                    />
                  ) : (
                    <button
                      className="text-sm text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 flex items-center gap-1.5 group cursor-pointer"
                      onClick={() => {
                        folderRenameRef.current = focusedItem.title;
                        setRenamingFolder(true);
                      }}
                    >
                      {focusedItem.title || 'Untitled folder'}
                      <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                    </button>
                  )}
                  <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500 max-w-sm">
                    Folders stay in the sidebar tree. Create a note inside this folder or select an existing note to edit.
                  </p>
                  <div className="mt-4 flex items-center gap-2">
                    <Button variant="outline" size="sm" className="border-neutral-200/80 dark:border-neutral-800" onClick={() => void createNote(String(focusedItem.row_id))}>
                      <FilePlus className="h-3.5 w-3.5 mr-1.5" />
                      New note here
                    </Button>
                    <Button variant="ghost" size="sm" className="text-neutral-600 dark:text-neutral-300" onClick={() => void createFolder(String(focusedItem.row_id))}>
                      <FolderPlus className="h-3.5 w-3.5 mr-1.5" />
                      New folder here
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center bg-white dark:bg-neutral-950">
                  <FileText className="h-12 w-12 text-neutral-200 dark:text-neutral-700 mb-3" />
                  <p className="text-sm text-neutral-400 dark:text-neutral-500">No note selected</p>
                  <button
                    onClick={() => void createNote()}
                    className="text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 mt-1 font-medium transition-colors"
                  >
                    Create a new note
                  </button>
                </div>
              )}
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>

        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Move {moveItem && isFolder(moveItem) ? 'folder' : 'note'}</DialogTitle>
            <DialogDescription>
              Choose a destination folder. Root keeps the item at the top level.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {moveItem && (
              <div className="rounded-md border border-neutral-200/70 dark:border-neutral-800 px-3 py-2 text-sm text-neutral-600 dark:text-neutral-300 flex items-center justify-between gap-3">
                <span className="truncate">{moveItem.title || (isFolder(moveItem) ? 'Untitled folder' : 'Untitled')}</span>
                <ArrowRight className="h-4 w-4 text-neutral-400 shrink-0" />
              </div>
            )}

            <div>
              <div className="mb-1.5 text-xs text-neutral-500 dark:text-neutral-400">Destination</div>
              <Select value={moveTarget} onValueChange={setMoveTarget}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a folder" />
                </SelectTrigger>
                <SelectContent>
                  {moveTargets.map((target) => (
                    <SelectItem key={`${target.value}-target`} value={target.value}>
                      <span style={{ paddingLeft: `${target.depth * 12}px` }}>{target.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setMoveItem(null); setMoveTarget(ROOT_MOVE_TARGET); }}>
              Cancel
            </Button>
            <Button onClick={() => void confirmMove()}>Move</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
