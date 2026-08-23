import { uid } from './normalize';
import type { ColumnDef, SubjectTemplate } from '../types/core';

function normalizeNode(raw: Partial<ColumnDef> & { label?: string }): ColumnDef {
  const children = Array.isArray(raw.children)
    ? raw.children.map((c) => normalizeNode(c))
    : [];
  return {
    id: raw.id || uid('col'),
    label: (raw.label || '').trim() || 'عمود',
    children,
  };
}

/** Ensure subject has a valid nested columns tree */
export function ensureColumns(sub: SubjectTemplate | null | undefined): ColumnDef[] {
  if (!sub) return [makeLeaf('الدرجة النهائية')];
  if (Array.isArray(sub.columns) && sub.columns.length) {
    return sub.columns.map((c) => normalizeNode(c));
  }
  if (Array.isArray(sub.components) && sub.components.length) {
    return sub.components.map((label) => makeLeaf(label));
  }
  return [makeLeaf('الدرجة النهائية')];
}

/** Leaf columns only — hold actual score values */
export function flatLeaves(cols: ColumnDef[]): ColumnDef[] {
  const result: ColumnDef[] = [];
  for (const c of cols) {
    if (!c.children?.length) result.push(c);
    else result.push(...flatLeaves(c.children));
  }
  return result;
}

export function leafCount(col: ColumnDef): number {
  if (!col.children?.length) return 1;
  return col.children.reduce((sum, child) => sum + leafCount(child), 0);
}

export function maxDepth(cols: ColumnDef[]): number {
  if (!cols.length) return 0;
  return Math.max(
    ...cols.map((c) => (c.children?.length ? 1 + maxDepth(c.children) : 1)),
  );
}

/**
 * Build header matrix for nested table headers.
 * Each cell knows colspan / rowspan so mixed leaf+group columns align.
 */
export interface HeaderCell {
  id: string;
  label: string;
  colSpan: number;
  rowSpan: number;
}

export function buildHeaderMatrix(cols: ColumnDef[]): HeaderCell[][] {
  const depth = maxDepth(cols);
  if (depth === 0) return [];

  const rows: HeaderCell[][] = Array.from({ length: depth }, () => []);

  function walk(node: ColumnDef, level: number) {
    const hasChildren = Boolean(node.children?.length);
    rows[level].push({
      id: node.id,
      label: node.label,
      colSpan: leafCount(node),
      rowSpan: hasChildren ? 1 : depth - level,
    });
    if (hasChildren) {
      for (const child of node.children) walk(child, level + 1);
    }
  }

  for (const col of cols) walk(col, 0);
  return rows;
}

/** @deprecated use buildHeaderMatrix */
export function buildHeaderRows(cols: ColumnDef[]): ColumnDef[][] {
  const depth = maxDepth(cols);
  const rows: ColumnDef[][] = Array.from({ length: depth }, () => []);
  function walk(node: ColumnDef, level: number) {
    rows[level].push(node);
    if (node.children?.length) {
      for (const child of node.children) walk(child, level + 1);
    }
  }
  for (const col of cols) walk(col, 0);
  return rows;
}

export function makeLeaf(label: string): ColumnDef {
  return { id: uid('col'), label: label.trim(), children: [] };
}

export function makeGroup(label: string, childLabels: string[]): ColumnDef {
  return {
    id: uid('col'),
    label: label.trim(),
    children: childLabels.map((l) => makeLeaf(l)),
  };
}

/** Update a column label by id anywhere in the tree */
export function mapColumns(
  cols: ColumnDef[],
  mapper: (col: ColumnDef) => ColumnDef,
): ColumnDef[] {
  return cols.map((c) => {
    const next = mapper(c);
    return { ...next, children: mapColumns(next.children ?? [], mapper) };
  });
}

export function updateColumnLabel(cols: ColumnDef[], columnId: string, label: string): ColumnDef[] {
  return mapColumns(cols, (c) => (c.id === columnId ? { ...c, label: label.trim() } : c));
}

export function insertColumn(
  cols: ColumnDef[],
  parentId: string | null,
  newCol: ColumnDef,
): ColumnDef[] {
  if (!parentId) return [...cols, newCol];
  return cols.map((c) =>
    c.id === parentId
      ? { ...c, children: [...(c.children ?? []), newCol] }
      : { ...c, children: insertColumn(c.children ?? [], parentId, newCol) },
  );
}

export function removeColumnById(cols: ColumnDef[], columnId: string): ColumnDef[] {
  return cols
    .filter((c) => c.id !== columnId)
    .map((c) => ({ ...c, children: removeColumnById(c.children ?? [], columnId) }));
}

export function convertColumnToGroup(cols: ColumnDef[], columnId: string): ColumnDef[] {
  return cols.map((c) => {
    if (c.id === columnId) {
      if (c.children?.length) return c;
      return {
        ...c,
        children: [makeLeaf('فرعي ١'), makeLeaf('فرعي ٢'), makeLeaf('فرعي ٣')],
      };
    }
    return { ...c, children: convertColumnToGroup(c.children ?? [], columnId) };
  });
}
