export interface NoteItem {
  row_id: number;
  title: string;
  content: string;
  updated_at: string;
  is_folder?: boolean | null;
  parent_id?: string | null;
}

export interface TreeNode extends NoteItem {
  children: TreeNode[];
}

export interface MoveTarget {
  value: string;
  label: string;
  depth: number;
}

export function isFolder(item: NoteItem) {
  return Boolean(item.is_folder);
}

export function normalizeParentId(parentId: string | number | null | undefined) {
  if (parentId === null || parentId === undefined) return '';
  return String(parentId).trim();
}

function sortByTitle(items: NoteItem[]) {
  return [...items].sort((a, b) =>
    (a.title || 'Untitled').localeCompare(b.title || 'Untitled', undefined, { sensitivity: 'base' })
  );
}

function sortNotes(items: NoteItem[]) {
  return [...items].sort((a, b) => {
    const aTime = new Date(a.updated_at || 0).getTime();
    const bTime = new Date(b.updated_at || 0).getTime();

    if (aTime !== bTime) return bTime - aTime;

    return (a.title || 'Untitled').localeCompare(b.title || 'Untitled', undefined, {
      sensitivity: 'base',
    });
  });
}

export function sortTreeItems(items: NoteItem[]) {
  const folders = sortByTitle(items.filter(isFolder));
  const notes = sortNotes(items.filter((item) => !isFolder(item)));
  return [...folders, ...notes];
}

export function buildNoteTree(items: NoteItem[]): TreeNode[] {
  const nodeMap = new Map<string, TreeNode>();

  for (const item of items) {
    nodeMap.set(String(item.row_id), { ...item, children: [] });
  }

  const roots: TreeNode[] = [];

  for (const item of items) {
    const node = nodeMap.get(String(item.row_id));
    if (!node) continue;

    const parentId = normalizeParentId(item.parent_id);
    const parent = parentId ? nodeMap.get(parentId) : null;

    if (!parent || parentId === String(item.row_id)) {
      roots.push(node);
    } else {
      parent.children.push(node);
    }
  }

  const sortNodeChildren = (nodes: TreeNode[]): TreeNode[] => {
    const sorted = sortTreeItems(nodes);
    return sorted.map((node) => ({
      ...node,
      children: sortNodeChildren(node.children),
    }));
  };

  return sortNodeChildren(roots);
}

export function collectDescendantIds(items: NoteItem[], itemId: number | string): Set<string> {
  const descendants = new Set<string>();
  const queue = [String(itemId)];

  while (queue.length > 0) {
    const currentId = queue.shift();
    if (!currentId) continue;

    for (const item of items) {
      if (normalizeParentId(item.parent_id) === currentId) {
        const childId = String(item.row_id);
        if (!descendants.has(childId)) {
          descendants.add(childId);
          queue.push(childId);
        }
      }
    }
  }

  return descendants;
}

export function getAncestorFolderIds(items: NoteItem[], item: NoteItem | null | undefined): number[] {
  if (!item) return [];

  const byId = new Map(items.map((entry) => [String(entry.row_id), entry]));
  const ancestors: number[] = [];
  const visited = new Set<string>();
  let currentParentId = normalizeParentId(item.parent_id);

  while (currentParentId) {
    if (visited.has(currentParentId)) break;
    visited.add(currentParentId);

    const parent = byId.get(currentParentId);
    if (!parent || !isFolder(parent)) break;

    ancestors.unshift(parent.row_id);
    currentParentId = normalizeParentId(parent.parent_id);
  }

  return ancestors;
}

export function getFolderPath(items: NoteItem[], item: NoteItem): string {
  const byId = new Map(items.map((entry) => [String(entry.row_id), entry]));
  const segments: string[] = [];
  const visited = new Set<string>();
  let currentParentId = normalizeParentId(item.parent_id);

  while (currentParentId) {
    if (visited.has(currentParentId)) break;
    visited.add(currentParentId);

    const parent = byId.get(currentParentId);
    if (!parent || !isFolder(parent)) break;

    segments.unshift(parent.title || 'Untitled folder');
    currentParentId = normalizeParentId(parent.parent_id);
  }

  return segments.length > 0 ? segments.join(' / ') : 'Root';
}

export function getMoveTargets(items: NoteItem[], item?: NoteItem | null): MoveTarget[] {
  const excluded = new Set<string>();

  if (item) {
    excluded.add(String(item.row_id));
    if (isFolder(item)) {
      for (const descendantId of collectDescendantIds(items, item.row_id)) {
        excluded.add(descendantId);
      }
    }
  }

  const folders = sortByTitle(items.filter((entry) => isFolder(entry) && !excluded.has(String(entry.row_id))));
  const byParent = new Map<string, NoteItem[]>();

  for (const folder of folders) {
    const parentId = normalizeParentId(folder.parent_id);
    const list = byParent.get(parentId) ?? [];
    list.push(folder);
    byParent.set(parentId, list);
  }

  const ordered: MoveTarget[] = [{ value: '', label: 'Root', depth: 0 }];

  const visit = (parentId: string, depth: number) => {
    const children = sortByTitle(byParent.get(parentId) ?? []);
    for (const child of children) {
      ordered.push({
        value: String(child.row_id),
        label: child.title || 'Untitled folder',
        depth,
      });
      visit(String(child.row_id), depth + 1);
    }
  };

  visit('', 1);
  return ordered;
}
