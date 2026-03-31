import { ChevronDown, ChevronRight, Copy, FilePlus, FileText, Folder, FolderOpen, FolderPlus, MoreHorizontal, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import type { NoteItem, TreeNode } from '../lib/notes-tree';
import { isFolder } from '../lib/notes-tree';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

interface NotesTreeProps {
  tree: TreeNode[];
  activeNoteId: number | null;
  focusedItemId: number | null;
  expandedFolders: Set<number>;
  onToggleFolder: (item: NoteItem) => void;
  onSelectNote: (item: NoteItem) => void;
  onCreateNote: (parentId?: string) => void;
  onCreateFolder: (parentId?: string) => void;
  onDuplicate: (item: NoteItem) => void;
  onDelete: (item: NoteItem) => void;
  onMove: (item: NoteItem) => void;
}

export function NotesTree({
  tree,
  activeNoteId,
  focusedItemId,
  expandedFolders,
  onToggleFolder,
  onSelectNote,
  onCreateNote,
  onCreateFolder,
  onDuplicate,
  onDelete,
  onMove,
}: NotesTreeProps) {
  const renderNode = (node: TreeNode, depth = 0) => {
    const folder = isFolder(node);
    const expanded = folder && expandedFolders.has(node.row_id);
    const isActiveNote = !folder && activeNoteId === node.row_id;
    const isFocused = focusedItemId === node.row_id;
    const hasChildren = node.children.length > 0;

    return (
      <div key={node.row_id} className="min-w-0">
        <div
          onClick={() => {
            if (folder) {
              onToggleFolder(node);
              return;
            }
            onSelectNote(node);
          }}
          className={cn(
            'group flex items-center gap-1 rounded-md py-1.5 pr-1.5 transition-colors duration-100 mb-0.5 cursor-pointer min-w-0',
            isActiveNote
              ? 'bg-white dark:bg-neutral-800'
              : isFocused
                ? 'bg-neutral-100 dark:bg-neutral-800/70'
                : 'hover:bg-neutral-100/70 dark:hover:bg-neutral-800/50'
          )}
          style={{ paddingLeft: `${12 + depth * 14}px` }}
        >
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              if (folder) onToggleFolder(node);
            }}
            className={cn(
              'h-5 w-5 shrink-0 flex items-center justify-center rounded text-neutral-400 dark:text-neutral-500',
              folder ? 'hover:text-neutral-700 dark:hover:text-neutral-300' : 'opacity-0 pointer-events-none'
            )}
            aria-label={folder ? (expanded ? 'Collapse folder' : 'Expand folder') : undefined}
          >
            {folder ? (
              hasChildren ? (
                expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />
              ) : (
                <span className="h-3.5 w-3.5" />
              )
            ) : null}
          </button>

          <span className="shrink-0 text-neutral-400 dark:text-neutral-500">
            {folder ? (
              expanded ? <FolderOpen className="h-3.5 w-3.5" /> : <Folder className="h-3.5 w-3.5" />
            ) : (
              <FileText className="h-3.5 w-3.5" />
            )}
          </span>

          <div className="min-w-0 flex-1">
            <div
              className={cn(
                'truncate text-xs',
                isActiveNote || isFocused
                  ? 'text-neutral-900 dark:text-neutral-100'
                  : 'text-neutral-700 dark:text-neutral-300'
              )}
            >
              {node.title || (folder ? 'Untitled folder' : 'Untitled')}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="opacity-0 group-hover:opacity-100 h-5 w-5 flex items-center justify-center text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 shrink-0"
                onClick={(event) => event.stopPropagation()}
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {folder ? (
                <>
                  <DropdownMenuItem onClick={() => onCreateNote(String(node.row_id))}>
                    <FilePlus className="h-3.5 w-3.5 mr-2" />
                    New note inside
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onCreateFolder(String(node.row_id))}>
                    <FolderPlus className="h-3.5 w-3.5 mr-2" />
                    New folder inside
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onMove(node)}>
                    <Folder className="h-3.5 w-3.5 mr-2" />
                    Move folder
                  </DropdownMenuItem>
                  <DropdownMenuItem variant="destructive" onClick={() => onDelete(node)}>
                    <Trash2 className="h-3.5 w-3.5 mr-2" />
                    Delete folder + contents
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem onClick={() => onDuplicate(node)}>
                    <Copy className="h-3.5 w-3.5 mr-2" />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onMove(node)}>
                    <Folder className="h-3.5 w-3.5 mr-2" />
                    Move note
                  </DropdownMenuItem>
                  <DropdownMenuItem variant="destructive" onClick={() => onDelete(node)}>
                    <Trash2 className="h-3.5 w-3.5 mr-2" />
                    Delete note
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {folder && expanded && node.children.length > 0 && (
          <div>{node.children.map((child) => renderNode(child, depth + 1))}</div>
        )}
      </div>
    );
  };

  return <div className="min-w-0">{tree.map((node) => renderNode(node))}</div>;
}
