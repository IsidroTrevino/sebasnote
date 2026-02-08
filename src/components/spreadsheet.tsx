'use client';

import React, { useState, useCallback, useRef, useEffect, useMemo, memo } from 'react';
import {
  ChevronDown,
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Plus,
  Grid3x3,
  Paintbrush,
  Type,
  Hash,
  Percent,
  DollarSign,
  X,
  Move,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

interface CellFormat {
  bold?: boolean;
  italic?: boolean;
  align?: 'left' | 'center' | 'right';
  backgroundColor?: string;
  textColor?: string;
  fontSize?: number;
  borderTop?: string;
  borderBottom?: string;
  borderLeft?: string;
  borderRight?: string;
  numberFormat?: 'text' | 'number' | 'currency' | 'percent';
}

interface Cell {
  value: string;
  formula?: string;
  format?: CellFormat;
}

interface SpreadsheetData {
  rows: number;
  cols: number;
  cells: Record<string, Cell>;
}

interface SpreadsheetProps {
  data: SpreadsheetData;
  onCellUpdate: (row: number, col: number, value: string, formula?: string) => void;
  onCellFormatUpdate: (row: number, col: number, format: CellFormat) => void;
  onResize?: (rows: number, cols: number) => void;
  onBatchUpdate?: (updates: Array<{ row: number; col: number; value?: string; formula?: string; format?: CellFormat; replaceFormat?: boolean }>) => void;
}

// ═══════════════════════════════════════════════════════════════
// Constants & helpers (outside component — zero cost)
// ═══════════════════════════════════════════════════════════════

const COLUMN_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DEFAULT_CELL_HEIGHT = 32;
const DEFAULT_CELL_WIDTH = 120;
const EMPTY_CELL: Cell = { value: '' };

const getColumnLetter = (index: number): string => {
  if (index < 26) return COLUMN_LETTERS[index];
  return COLUMN_LETTERS[Math.floor(index / 26) - 1] + COLUMN_LETTERS[index % 26];
};

const parseCellReference = (ref: string): { row: number; col: number } | null => {
  const match = ref.trim().match(/^([A-Z]+)(\d+)$/i);
  if (!match) return null;
  const colStr = match[1].toUpperCase();
  const row = parseInt(match[2]) - 1;
  let col = 0;
  for (let i = 0; i < colStr.length; i++) {
    col = col * 26 + (colStr.charCodeAt(i) - 'A'.charCodeAt(0));
  }
  return { row, col };
};

const getCellKey = (row: number, col: number) => `${row}_${col}`;

const PRESET_COLORS = [
  '#1a1a1a', '#2a2a2a', '#3a3a3a', '#4a4a4a', '#6a6a6a', '#8a8a8a', '#aaaaaa', '#cccccc',
  '#22c55e', '#16a34a', '#15803d', '#3b82f6', '#2563eb', '#1d4ed8', '#ef4444', '#dc2626',
  '#f59e0b', '#d97706', '#f97316', '#ec4899', '#a855f7', '#8b5cf6', '#06b6d4', '#14b8a6',
];

const BORDER_COLORS = ['#3a3a3a', '#4a4a4a', '#6a6a6a', '#22c55e', '#3b82f6', '#ef4444', '#f59e0b', '#ffffff'];

const formatCellValue = (value: string, format?: CellFormat): string => {
  if (!format?.numberFormat || !value) return value;
  const num = parseFloat(value);
  if (isNaN(num)) return value;
  switch (format.numberFormat) {
    case 'currency': return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case 'percent': return `${(num * 100).toFixed(1)}%`;
    case 'number': return num.toLocaleString('en-US');
    default: return value;
  }
};

/** Check if a formula string is "open" — i.e. the cursor is inside a function argument position */
const isFormulaExpectingRef = (formula: string): boolean => {
  if (!formula.startsWith('=')) return false;
  const upper = formula.toUpperCase();
  // Matches patterns like =SUM(  =SUM(A1:  =SUM(A1,  =A1+  etc.
  if (/[,(+\-*/:]$/.test(upper.trim())) return true;
  // Just typed '='
  if (upper.trim() === '=') return true;
  // Inside an open parenthesis: =SUM(
  const opens = (upper.match(/\(/g) || []).length;
  const closes = (upper.match(/\)/g) || []).length;
  if (opens > closes) return true;
  return false;
};

// ═══════════════════════════════════════════════════════════════
// Memoized cell component
// ═══════════════════════════════════════════════════════════════
interface SpreadsheetCellProps {
  row: number;
  col: number;
  cellValue: string;
  cellFormula: string | undefined;
  cellFormat: CellFormat | undefined;
  width: number;
  height: number;
  isSelected: boolean;
  isEditing: boolean;
  isCopied: boolean;
  isInSelection: boolean;
  isFormulaHighlight: boolean;
  isTableDragHandle: boolean;
  editValue: string;
  onMouseDown: (row: number, col: number, e: React.MouseEvent) => void;
  onDoubleClick: (row: number, col: number) => void;
  onEditChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onEditBlur: (e: React.FocusEvent<HTMLInputElement>) => void;
  onEditKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onDragHandleDown: (row: number, col: number, e: React.MouseEvent) => void;
  editInputRef: React.RefObject<HTMLInputElement | null>;
}

const SpreadsheetCell = memo<SpreadsheetCellProps>(({
  row, col, cellValue, cellFormat, width, height,
  isSelected, isEditing, isCopied, isInSelection, isFormulaHighlight, isTableDragHandle,
  editValue, onMouseDown, onDoubleClick, onEditChange, onEditBlur, onEditKeyDown,
  onDragHandleDown, editInputRef,
}) => {
  return (
    <td
      className={cn(
        'border-b border-r border-[#2a2a2a] p-0 relative group/cell',
        isSelected && 'ring-2 ring-green-500 ring-inset z-[5]',
        isInSelection && !isSelected && 'bg-green-500/10',
        isCopied && !isSelected && 'ring-2 ring-green-400/50 ring-inset',
        isFormulaHighlight && !isSelected && 'ring-2 ring-blue-400/60 ring-inset',
      )}
      style={{
        width, minWidth: width, height,
        backgroundColor: cellFormat?.backgroundColor || undefined,
        borderTop: cellFormat?.borderTop || undefined,
        borderBottom: cellFormat?.borderBottom || undefined,
        borderLeft: cellFormat?.borderLeft || undefined,
        borderRight: cellFormat?.borderRight || undefined,
      }}
      onMouseDown={(e) => {
        if (isEditing) { e.stopPropagation(); return; }
        onMouseDown(row, col, e);
      }}
      onDoubleClick={() => { if (!isEditing) onDoubleClick(row, col); }}
    >
      {isEditing ? (
        <input
          ref={editInputRef}
          type="text"
          value={editValue}
          onChange={onEditChange}
          onBlur={onEditBlur}
          onKeyDown={onEditKeyDown}
          onMouseDown={(e) => e.stopPropagation()}
          className="w-full h-full bg-[#2a2a2a] text-gray-200 px-2 py-0.5 border-0 outline-none text-xs"
          autoFocus
        />
      ) : (
        <div
          className={cn(
            'w-full h-full px-2 py-0.5 overflow-hidden text-ellipsis whitespace-nowrap flex items-center cursor-cell text-xs',
            cellFormat?.bold && 'font-bold',
            cellFormat?.italic && 'italic',
            cellFormat?.align === 'center' && 'justify-center',
            cellFormat?.align === 'right' && 'justify-end',
          )}
          style={{
            color: cellFormat?.textColor || undefined,
            fontSize: cellFormat?.fontSize ? `${cellFormat.fontSize}px` : undefined,
          }}
        >
          {formatCellValue(cellValue, cellFormat)}
        </div>
      )}
      {/* Table drag handle — shown on top-left cell of detected tables */}
      {isTableDragHandle && !isEditing && (
        <div
          className="absolute -top-0.5 -left-0.5 w-4 h-4 bg-green-600 rounded-br flex items-center justify-center cursor-move z-10 opacity-0 group-hover/cell:opacity-100 transition-opacity"
          onMouseDown={(e) => { e.stopPropagation(); onDragHandleDown(row, col, e); }}
          title="Drag to move table"
        >
          <Move className="w-2.5 h-2.5 text-white" />
        </div>
      )}
    </td>
  );
});
SpreadsheetCell.displayName = 'SpreadsheetCell';

// ═══════════════════════════════════════════════════════════════
// Main Spreadsheet Component
// ═══════════════════════════════════════════════════════════════
export const Spreadsheet: React.FC<SpreadsheetProps> = ({
  data,
  onCellUpdate,
  onCellFormatUpdate,
  onResize,
  onBatchUpdate,
}) => {
  // ── State ──
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [copiedCell, setCopiedCell] = useState<{ row: number; col: number } | null>(null);
  const [columnWidths, setColumnWidths] = useState<Record<number, number>>({});
  const [rowHeights, setRowHeights] = useState<Record<number, number>>({});

  // Toolbar popovers
  const [showFormatMenu, setShowFormatMenu] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showTextColorPicker, setShowTextColorPicker] = useState(false);
  const [showBorderMenu, setShowBorderMenu] = useState(false);
  const [showTableModal, setShowTableModal] = useState(false);
  const [tableRows, setTableRows] = useState(5);
  const [tableCols, setTableCols] = useState(4);
  const [customColor, setCustomColor] = useState('#22c55e');
  const [customTextColor, setCustomTextColor] = useState('#ffffff');
  const [tableTitle, setTableTitle] = useState('');
  const [tableHeaderColor, setTableHeaderColor] = useState('#22c55e');
  const [tableBorderColor, setTableBorderColor] = useState('#3a3a3a');

  // Multi-cell range selection: anchor is where selection started, end is current extent
  const [selectionRange, setSelectionRange] = useState<{ anchor: { row: number; col: number }; end: { row: number; col: number } } | null>(null);
  const selectionRangeRef = useRef(selectionRange);
  selectionRangeRef.current = selectionRange;
  const isSelectingRef = useRef(false);

  // Formula-mode cell selection highlighting
  const [formulaHighlightCells, setFormulaHighlightCells] = useState<Set<string>>(new Set());

  // Table drag state
  const [isDraggingTable, setIsDraggingTable] = useState(false);
  const [tableDragPreview, setTableDragPreview] = useState<{
    srcTopLeft: { row: number; col: number };
    srcBottomRight: { row: number; col: number };
    dstTopLeft: { row: number; col: number };
    dstBottomRight: { row: number; col: number };
  } | null>(null);
  const tableDragRef = useRef<{
    tableTopLeft: { row: number; col: number };
    tableBottomRight: { row: number; col: number };
    grabOffsetRow: number; // offset from top-left of table to where user grabbed
    grabOffsetCol: number;
  } | null>(null);

  // ── Refs ──
  const containerRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const formulaBarRef = useRef<HTMLInputElement>(null);

  // Stable refs for callbacks to avoid re-creating handlers
  const dataRef = useRef(data);
  dataRef.current = data;
  const editingCellRef = useRef(editingCell);
  editingCellRef.current = editingCell;
  const editValueRef = useRef(editValue);
  editValueRef.current = editValue;
  const selectedCellRef = useRef(selectedCell);
  selectedCellRef.current = selectedCell;
  const onCellUpdateRef = useRef(onCellUpdate);
  onCellUpdateRef.current = onCellUpdate;
  const onCellFormatUpdateRef = useRef(onCellFormatUpdate);
  onCellFormatUpdateRef.current = onCellFormatUpdate;
  const onBatchUpdateRef = useRef(onBatchUpdate);
  onBatchUpdateRef.current = onBatchUpdate;

  // Resize refs
  const resizeStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const columnWidthsRef = useRef(columnWidths);
  const rowHeightsRef = useRef(rowHeights);
  const resizingColumnRef = useRef<number | null>(null);
  const resizingRowRef = useRef<number | null>(null);
  columnWidthsRef.current = columnWidths;
  rowHeightsRef.current = rowHeights;

  // ── Cell access (via ref — no dependency on data.cells) ──

  // Measure origin of cell (0,0) relative to the scroll container
  const getCellOrigin = useCallback(() => {
    if (tableRef.current && containerRef.current) {
      const firstCell = tableRef.current.querySelector('tbody tr td') as HTMLElement | null;
      if (firstCell) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const cellRect = firstCell.getBoundingClientRect();
        return {
          x: cellRect.left - containerRect.left + containerRef.current.scrollLeft,
          y: cellRect.top - containerRect.top + containerRef.current.scrollTop,
        };
      }
    }
    return { x: 40, y: 28 }; // fallback
  }, []);
  const getCellOriginRef = useRef(getCellOrigin);
  getCellOriginRef.current = getCellOrigin;

  // Compute overlay rect for a cell range (all overlays use this)
  const computeOverlayRect = useCallback((topLeft: { row: number; col: number }, bottomRight: { row: number; col: number }) => {
    const origin = getCellOrigin();
    let x = origin.x;
    for (let c = 0; c < topLeft.col; c++) x += (columnWidthsRef.current[c] || DEFAULT_CELL_WIDTH);
    let y = origin.y;
    for (let r = 0; r < topLeft.row; r++) y += (rowHeightsRef.current[r] || DEFAULT_CELL_HEIGHT);
    let w = 0;
    for (let c = topLeft.col; c <= bottomRight.col; c++) w += (columnWidthsRef.current[c] || DEFAULT_CELL_WIDTH);
    let h = 0;
    for (let r = topLeft.row; r <= bottomRight.row; r++) h += (rowHeightsRef.current[r] || DEFAULT_CELL_HEIGHT);
    return { x, y, w, h };
  }, [getCellOrigin]);

  // ═══════════════════════════════════════════════════════════════
  // Formula Engine (stable — reads from ref)
  // ═══════════════════════════════════════════════════════════════

  const getCellRangeValues = useCallback((start: string, end: string): number[] => {
    const values: number[] = [];
    const startRef = parseCellReference(start);
    const endRef = parseCellReference(end);
    if (!startRef || !endRef) return values;
    const cells = dataRef.current.cells;
    for (let r = Math.min(startRef.row, endRef.row); r <= Math.max(startRef.row, endRef.row); r++) {
      for (let c = Math.min(startRef.col, endRef.col); c <= Math.max(startRef.col, endRef.col); c++) {
        const num = parseFloat((cells[getCellKey(r, c)] || EMPTY_CELL).value);
        if (!isNaN(num)) values.push(num);
      }
    }
    return values;
  }, []);

  const getSingleCellValue = useCallback((ref: string): number => {
    const parsed = parseCellReference(ref);
    if (!parsed) return 0;
    const num = parseFloat((dataRef.current.cells[getCellKey(parsed.row, parsed.col)] || EMPTY_CELL).value);
    return isNaN(num) ? 0 : num;
  }, []);

  const evaluateFormula = useCallback((formula: string): string => {
    if (!formula.startsWith('=')) return formula;
    try {
      const expr = formula.slice(1).toUpperCase().trim();

      // Helper: collect numeric values from a comma-separated argument list
      // Each argument can be a range (A1:B3) or a single cell (A1) or a number
      const collectArgs = (argsStr: string): number[] => {
        const values: number[] = [];
        const parts = argsStr.split(',').map(s => s.trim());
        for (const part of parts) {
          const rangeMatch = part.match(/^([A-Z]+\d+):([A-Z]+\d+)$/);
          if (rangeMatch) {
            values.push(...getCellRangeValues(rangeMatch[1], rangeMatch[2]));
          } else {
            const cellMatch = part.match(/^([A-Z]+\d+)$/);
            if (cellMatch) {
              values.push(getSingleCellValue(cellMatch[1]));
            } else {
              const num = parseFloat(part);
              if (!isNaN(num)) values.push(num);
            }
          }
        }
        return values;
      };

      const sumMatch = expr.match(/^SUM\((.+)\)$/);
      if (sumMatch) { const v = collectArgs(sumMatch[1]); return v.reduce((a, b) => a + b, 0).toString(); }

      const avgMatch = expr.match(/^AVERAGE\((.+)\)$/);
      if (avgMatch) { const v = collectArgs(avgMatch[1]); return v.length === 0 ? '0' : (v.reduce((a, b) => a + b, 0) / v.length).toFixed(2); }

      const countMatch = expr.match(/^COUNT\((.+)\)$/);
      if (countMatch) return collectArgs(countMatch[1]).length.toString();

      const minMatch = expr.match(/^MIN\((.+)\)$/);
      if (minMatch) { const v = collectArgs(minMatch[1]); return v.length === 0 ? '0' : Math.min(...v).toString(); }

      const maxMatch = expr.match(/^MAX\((.+)\)$/);
      if (maxMatch) { const v = collectArgs(maxMatch[1]); return v.length === 0 ? '0' : Math.max(...v).toString(); }

      const ifMatch = expr.match(/^IF\((.+),\s*(.+),\s*(.+)\)$/);
      if (ifMatch) {
        const condMatch = ifMatch[1].trim().match(/^([A-Z]+\d+)\s*(>=|<=|>|<|=|!=)\s*(.+)$/);
        if (condMatch) {
          const cellVal = getSingleCellValue(condMatch[1]);
          const cmp = parseFloat(condMatch[3]);
          const tv = ifMatch[2].trim().replace(/"/g, '');
          const fv = ifMatch[3].trim().replace(/"/g, '');
          let r = false;
          switch (condMatch[2]) {
            case '>': r = cellVal > cmp; break; case '<': r = cellVal < cmp; break;
            case '=': r = cellVal === cmp; break; case '>=': r = cellVal >= cmp; break;
            case '<=': r = cellVal <= cmp; break; case '!=': r = cellVal !== cmp; break;
          }
          return r ? tv : fv;
        }
      }

      const concatMatch = expr.match(/^CONCAT\((.+)\)$/);
      if (concatMatch) {
        return concatMatch[1].split(',').map(s => s.trim()).map(arg => {
          if (arg.startsWith('"') && arg.endsWith('"')) return arg.slice(1, -1);
          const ref = parseCellReference(arg);
          return ref ? (dataRef.current.cells[getCellKey(ref.row, ref.col)] || EMPTY_CELL).value : '';
        }).join('');
      }

      const absMatch = expr.match(/^ABS\(([A-Z]+\d+)\)$/);
      if (absMatch) return Math.abs(getSingleCellValue(absMatch[1])).toString();

      const roundMatch = expr.match(/^ROUND\(([A-Z]+\d+)(?:,\s*(\d+))?\)$/);
      if (roundMatch) return getSingleCellValue(roundMatch[1]).toFixed(roundMatch[2] ? parseInt(roundMatch[2]) : 0);

      const arith = expr.match(/^([A-Z]+\d+)\s*([+\-*/])\s*([A-Z]+\d+)$/);
      if (arith) {
        const l = getSingleCellValue(arith[1]), r = getSingleCellValue(arith[3]);
        switch (arith[2]) { case '+': return (l + r).toString(); case '-': return (l - r).toString(); case '*': return (l * r).toString(); case '/': return r !== 0 ? (l / r).toString() : '#DIV/0!'; }
      }

      const cellRefM = expr.match(/^([A-Z]+\d+)$/);
      if (cellRefM) { const ref = parseCellReference(cellRefM[1]); if (ref) return (dataRef.current.cells[getCellKey(ref.row, ref.col)] || EMPTY_CELL).value || '0'; }

      const nc = expr.match(/^(\d+\.?\d*)\s*([+\-*/])\s*([A-Z]+\d+)$/);
      if (nc) { const l = parseFloat(nc[1]), r = getSingleCellValue(nc[3]); switch (nc[2]) { case '+': return (l + r).toString(); case '-': return (l - r).toString(); case '*': return (l * r).toString(); case '/': return r !== 0 ? (l / r).toString() : '#DIV/0!'; } }

      const cn2 = expr.match(/^([A-Z]+\d+)\s*([+\-*/])\s*(\d+\.?\d*)$/);
      if (cn2) { const l = getSingleCellValue(cn2[1]), r = parseFloat(cn2[3]); switch (cn2[2]) { case '+': return (l + r).toString(); case '-': return (l - r).toString(); case '*': return (l * r).toString(); case '/': return r !== 0 ? (l / r).toString() : '#DIV/0!'; } }

      return '#ERROR';
    } catch { return '#ERROR'; }
  }, [getCellRangeValues, getSingleCellValue]);

  // ═══════════════════════════════════════════════════════════════
  // Auto-update formulas — debounced, stable deps
  // ═══════════════════════════════════════════════════════════════
  const formulaTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const formulaUpdateRunning = useRef(false);

  useEffect(() => {
    if (formulaTimerRef.current) clearTimeout(formulaTimerRef.current);
    formulaTimerRef.current = setTimeout(() => {
      if (formulaUpdateRunning.current) return;
      const updates: Array<{ row: number; col: number; value: string; formula: string }> = [];
      const cells = dataRef.current.cells;
      for (const key of Object.keys(cells)) {
        const cell = cells[key];
        if (cell.formula && cell.formula.startsWith('=')) {
          const [r, c] = key.split('_').map(Number);
          const newVal = evaluateFormula(cell.formula);
          if (cell.value !== newVal) updates.push({ row: r, col: c, value: newVal, formula: cell.formula });
        }
      }
      if (updates.length > 0) {
        formulaUpdateRunning.current = true;
        const batch = onBatchUpdateRef.current;
        if (batch) batch(updates.map(u => ({ row: u.row, col: u.col, value: u.value, formula: u.formula })));
        else updates.forEach(u => onCellUpdateRef.current(u.row, u.col, u.value, u.formula));
        setTimeout(() => { formulaUpdateRunning.current = false; }, 400);
      }
    }, 300);
    return () => { if (formulaTimerRef.current) clearTimeout(formulaTimerRef.current); };
  }, [data.cells, evaluateFormula]);

  // ═══════════════════════════════════════════════════════════════
  // Table detection — find contiguous blocks with borders/bg
  // ═══════════════════════════════════════════════════════════════

  const detectTableAt = useCallback((row: number, col: number): { topLeft: { row: number; col: number }; bottomRight: { row: number; col: number } } | null => {
    const cells = dataRef.current.cells;
    const cell = cells[getCellKey(row, col)];
    if (!cell?.format) return null;
    const hasBorder = (f?: CellFormat) => f && (f.borderTop || f.borderBottom || f.borderLeft || f.borderRight || f.backgroundColor);

    if (!hasBorder(cell.format)) return null;

    // Flood-fill to find bounds of contiguous formatted block
    let minR = row, maxR = row, minC = col, maxC = col;
    const visited = new Set<string>();
    const stack = [getCellKey(row, col)];

    while (stack.length > 0) {
      const k = stack.pop()!;
      if (visited.has(k)) continue;
      visited.add(k);
      const [r, c] = k.split('_').map(Number);
      const cc = cells[k];
      if (!cc?.format || !hasBorder(cc.format)) continue;
      minR = Math.min(minR, r); maxR = Math.max(maxR, r);
      minC = Math.min(minC, c); maxC = Math.max(maxC, c);
      // Check 4 neighbors
      for (const [nr, nc] of [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]) {
        if (nr >= 0 && nc >= 0 && nr < dataRef.current.rows && nc < dataRef.current.cols) {
          const nk = getCellKey(nr, nc);
          if (!visited.has(nk)) stack.push(nk);
        }
      }
    }

    // Only consider it a "table" if it's at least 2x2
    if (maxR - minR < 1 || maxC - minC < 1) return null;

    return { topLeft: { row: minR, col: minC }, bottomRight: { row: maxR, col: maxC } };
  }, []);

  // Memoize table top-left cells for drag handles
  const tableTopLefts = useMemo(() => {
    const set = new Set<string>();
    const visited = new Set<string>();
    const cells = data.cells;
    for (const key of Object.keys(cells)) {
      if (visited.has(key)) continue;
      const cell = cells[key];
      if (!cell?.format) continue;
      const hasBorder = cell.format.borderTop || cell.format.borderBottom || cell.format.borderLeft || cell.format.borderRight || cell.format.backgroundColor;
      if (!hasBorder) continue;
      const [r, c] = key.split('_').map(Number);
      const table = detectTableAt(r, c);
      if (table) {
        set.add(getCellKey(table.topLeft.row, table.topLeft.col));
        // Mark all cells as visited so we don't detect the same table again
        for (let tr = table.topLeft.row; tr <= table.bottomRight.row; tr++) {
          for (let tc = table.topLeft.col; tc <= table.bottomRight.col; tc++) {
            visited.add(getCellKey(tr, tc));
          }
        }
      }
    }
    return set;
  }, [data.cells, detectTableAt]);

  // ═══════════════════════════════════════════════════════════════
  // Cell save
  // ═══════════════════════════════════════════════════════════════

  const handleCellSave = useCallback(() => {
    const ec = editingCellRef.current;
    const ev = editValueRef.current;
    if (ec) {
      const isFormula = ev.startsWith('=');
      const displayValue = isFormula ? evaluateFormula(ev) : ev;
      onCellUpdateRef.current(ec.row, ec.col, displayValue, isFormula ? ev : undefined);
      setEditingCell(null);
      setFormulaHighlightCells(new Set());
    }
  }, [evaluateFormula]);

  // ═══════════════════════════════════════════════════════════════
  // Click-to-select cells in formulas
  // When editing a formula and user clicks a cell, insert ref
  // ═══════════════════════════════════════════════════════════════

  const handleCellMouseDown = useCallback((row: number, col: number, e: React.MouseEvent) => {
    const ec = editingCellRef.current;
    const ev = editValueRef.current;

    // If currently editing a formula and the formula expects a cell reference,
    // insert the clicked cell's reference instead of navigating
    if (ec && ev.startsWith('=') && isFormulaExpectingRef(ev)) {
      e.preventDefault();
      e.stopPropagation();
      const ref = `${getColumnLetter(col)}${row + 1}`;
      const newVal = ev + ref;
      setEditValue(newVal);
      editValueRef.current = newVal;

      // Highlight the referenced cell
      setFormulaHighlightCells(prev => {
        const next = new Set(prev);
        next.add(getCellKey(row, col));
        return next;
      });

      // Refocus the editing input
      setTimeout(() => editInputRef.current?.focus(), 0);
      return;
    }

    // Normal click — save editing cell if different
    if (ec && (ec.row !== row || ec.col !== col)) {
      handleCellSave();
    }

    // Shift+Click: extend selection range from current selected cell
    if (e.shiftKey && selectedCellRef.current) {
      const anchor = selectionRangeRef.current?.anchor || selectedCellRef.current;
      setSelectionRange({ anchor, end: { row, col } });
      setSelectedCell({ row, col });
      if (!ec || ec.row !== row || ec.col !== col) setEditingCell(null);
      setFormulaHighlightCells(new Set());
      return;
    }

    // Normal click — start potential drag-to-select
    setSelectedCell({ row, col });
    setSelectionRange(null);
    isSelectingRef.current = true;
    if (!ec || ec.row !== row || ec.col !== col) {
      setEditingCell(null);
    }
    setFormulaHighlightCells(new Set());
  }, [handleCellSave]);

  const handleCellDoubleClick = useCallback((row: number, col: number) => {
    const cell = dataRef.current.cells[getCellKey(row, col)] || EMPTY_CELL;
    setSelectedCell({ row, col });
    setEditingCell({ row, col });
    setEditValue(cell.formula || cell.value);
    setTimeout(() => editInputRef.current?.focus(), 0);
  }, []);

  const handleCellChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEditValue(val);
    editValueRef.current = val;

    // Update formula highlights in real-time
    if (val.startsWith('=')) {
      const refs = val.match(/[A-Z]+\d+/gi) || [];
      const highlights = new Set<string>();
      for (const ref of refs) {
        const parsed = parseCellReference(ref);
        if (parsed) highlights.add(getCellKey(parsed.row, parsed.col));
      }
      setFormulaHighlightCells(highlights);
    } else {
      setFormulaHighlightCells(new Set());
    }
  }, []);

  const handleEditBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    const related = e.relatedTarget as HTMLElement | null;
    if (related && related === formulaBarRef.current) return;
    // Don't save if user clicked on the grid (formula click-to-select)
    // We use a small delay to let mousedown handlers fire first
    setTimeout(() => {
      const ec = editingCellRef.current;
      if (ec && document.activeElement !== editInputRef.current && document.activeElement !== formulaBarRef.current) {
        handleCellSave();
      }
    }, 100);
  }, [handleCellSave]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCellSave();
      const sc = selectedCellRef.current;
      if (sc && sc.row < dataRef.current.rows - 1) setSelectedCell({ row: sc.row + 1, col: sc.col });
    } else if (e.key === 'Escape') {
      setEditingCell(null);
      setFormulaHighlightCells(new Set());
    } else if (e.key === 'Tab') {
      e.preventDefault();
      handleCellSave();
      const sc = selectedCellRef.current;
      if (sc && sc.col < dataRef.current.cols - 1) setSelectedCell({ row: sc.row, col: sc.col + 1 });
    }
  }, [handleCellSave]);

  // ── Formula bar ──
  const handleFormulaBarChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEditValue(val);
    editValueRef.current = val;
    const sc = selectedCellRef.current;
    const ec = editingCellRef.current;
    if (sc && !ec) setEditingCell({ row: sc.row, col: sc.col });

    // Update formula highlights
    if (val.startsWith('=')) {
      const refs = val.match(/[A-Z]+\d+/gi) || [];
      const highlights = new Set<string>();
      for (const ref of refs) {
        const parsed = parseCellReference(ref);
        if (parsed) highlights.add(getCellKey(parsed.row, parsed.col));
      }
      setFormulaHighlightCells(highlights);
    } else {
      setFormulaHighlightCells(new Set());
    }
  }, []);

  const handleFormulaBarKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCellSave();
      const sc = selectedCellRef.current;
      if (sc && sc.row < dataRef.current.rows - 1) setSelectedCell({ row: sc.row + 1, col: sc.col });
    } else if (e.key === 'Escape') {
      setEditingCell(null);
      setFormulaHighlightCells(new Set());
      const sc = selectedCellRef.current;
      if (sc) {
        const cell = dataRef.current.cells[getCellKey(sc.row, sc.col)] || EMPTY_CELL;
        setEditValue(cell.formula || cell.value);
      }
    }
  }, [handleCellSave]);

  const handleFormulaBarFocus = useCallback(() => {
    const sc = selectedCellRef.current;
    const ec = editingCellRef.current;
    if (sc && !ec) {
      const cell = dataRef.current.cells[getCellKey(sc.row, sc.col)] || EMPTY_CELL;
      setEditingCell({ row: sc.row, col: sc.col });
      setEditValue(cell.formula || cell.value);
    }
  }, []);

  const handleFormulaBarBlur = useCallback(() => {
    setTimeout(() => {
      const ec = editingCellRef.current;
      if (ec && document.activeElement !== editInputRef.current) {
        handleCellSave();
      }
    }, 100);
  }, [handleCellSave]);

  // Update formula bar display when selection changes
  useEffect(() => {
    if (selectedCell && !editingCell) {
      const cell = dataRef.current.cells[getCellKey(selectedCell.row, selectedCell.col)] || EMPTY_CELL;
      setEditValue(cell.formula || cell.value);
    }
  }, [selectedCell, editingCell]);

  // ═══════════════════════════════════════════════════════════════
  // Keyboard handlers (stable — use refs, attached once)
  // ═══════════════════════════════════════════════════════════════

  // Auto-type
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (editingCellRef.current || !selectedCellRef.current) return;
      if (document.activeElement === formulaBarRef.current) return;
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        const sc = selectedCellRef.current!;
        setEditingCell({ row: sc.row, col: sc.col });
        setEditValue(e.key);
        editValueRef.current = e.key;
        setSelectionRange(null);
        setTimeout(() => editInputRef.current?.focus(), 0);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Ctrl+A (Select All) & Escape (clear selection)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (editingCellRef.current) return;
      if (document.activeElement === formulaBarRef.current) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        const rows = dataRef.current.rows;
        const cols = dataRef.current.cols;
        setSelectionRange({ anchor: { row: 0, col: 0 }, end: { row: rows - 1, col: cols - 1 } });
        setSelectedCell({ row: 0, col: 0 });
      } else if (e.key === 'Escape' && selectionRangeRef.current) {
        setSelectionRange(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (editingCell && editInputRef.current) editInputRef.current.focus();
  }, [editingCell]);

  // Arrow keys (+ Shift for range selection)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (editingCellRef.current) return;
      const sc = selectedCellRef.current;
      if (!sc) return;
      if (document.activeElement === formulaBarRef.current) return;

      let nR = sc.row, nC = sc.col, moved = false;
      switch (e.key) {
        case 'ArrowUp': e.preventDefault(); nR = Math.max(0, nR - 1); moved = true; break;
        case 'ArrowDown': e.preventDefault(); nR = Math.min(dataRef.current.rows - 1, nR + 1); moved = true; break;
        case 'ArrowLeft': e.preventDefault(); nC = Math.max(0, nC - 1); moved = true; break;
        case 'ArrowRight': e.preventDefault(); nC = Math.min(dataRef.current.cols - 1, nC + 1); moved = true; break;
      }
      if (moved) {
        if (e.shiftKey) {
          // Extend selection range
          const anchor = selectionRangeRef.current?.anchor || sc;
          setSelectionRange({ anchor, end: { row: nR, col: nC } });
        } else {
          // Clear selection range on normal arrow move
          setSelectionRange(null);
        }
        setSelectedCell({ row: nR, col: nC });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Copy/Paste/Delete (supports range selection)
  useEffect(() => {
    let copiedRange: { cells: Array<{ dr: number; dc: number; cell: Cell }>; rows: number; cols: number } | null = null;
    const handler = (e: KeyboardEvent) => {
      const sc = selectedCellRef.current;
      if (!sc || editingCellRef.current) return;
      if (document.activeElement === formulaBarRef.current) return;

      // Compute selection bounds (or just the single selected cell)
      const sr = selectionRangeRef.current;
      const minR = sr ? Math.min(sr.anchor.row, sr.end.row) : sc.row;
      const maxR = sr ? Math.max(sr.anchor.row, sr.end.row) : sc.row;
      const minC = sr ? Math.min(sr.anchor.col, sr.end.col) : sc.col;
      const maxC = sr ? Math.max(sr.anchor.col, sr.end.col) : sc.col;

      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        e.preventDefault();
        // Copy entire range
        const cellData: Array<{ dr: number; dc: number; cell: Cell }> = [];
        for (let r = minR; r <= maxR; r++) {
          for (let c = minC; c <= maxC; c++) {
            const cell = dataRef.current.cells[getCellKey(r, c)];
            if (cell) cellData.push({ dr: r - minR, dc: c - minC, cell: { ...cell, format: cell.format ? { ...cell.format } : undefined } });
          }
        }
        copiedRange = { cells: cellData, rows: maxR - minR + 1, cols: maxC - minC + 1 };
        if (!sr) setCopiedCell({ ...sc });
        else setCopiedCell(null);
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault();
        if (copiedRange) {
          const batch = onBatchUpdateRef.current;
          if (batch) {
            const updates: Array<{ row: number; col: number; value?: string; formula?: string; format?: CellFormat }> = [];
            for (const cd of copiedRange.cells) {
              updates.push({ row: sc.row + cd.dr, col: sc.col + cd.dc, value: cd.cell.value, formula: cd.cell.formula, format: cd.cell.format || {} });
            }
            batch(updates);
          } else {
            for (const cd of copiedRange.cells) {
              onCellUpdateRef.current(sc.row + cd.dr, sc.col + cd.dc, cd.cell.value, cd.cell.formula);
              if (cd.cell.format) onCellFormatUpdateRef.current(sc.row + cd.dr, sc.col + cd.dc, cd.cell.format);
            }
          }
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        // Clear all cells in range
        const batch = onBatchUpdateRef.current;
        if (sr && batch) {
          const updates: Array<{ row: number; col: number; value?: string; formula?: string; format?: CellFormat; replaceFormat?: boolean }> = [];
          for (let r = minR; r <= maxR; r++) {
            for (let c = minC; c <= maxC; c++) {
              updates.push({ row: r, col: c, value: '', formula: '', format: {}, replaceFormat: true });
            }
          }
          batch(updates);
        } else {
          // Single cell or no batch
          for (let r = minR; r <= maxR; r++) {
            for (let c = minC; c <= maxC; c++) {
              onCellUpdateRef.current(r, c, '');
            }
          }
        }
        setSelectionRange(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Ctrl+B / Ctrl+I (supports range selection)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const sc = selectedCellRef.current;
      if (!sc) return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        const cell = dataRef.current.cells[getCellKey(sc.row, sc.col)] || EMPTY_CELL;
        const newBold = !cell.format?.bold;
        const sr = selectionRangeRef.current;
        const minR = sr ? Math.min(sr.anchor.row, sr.end.row) : sc.row;
        const maxR = sr ? Math.max(sr.anchor.row, sr.end.row) : sc.row;
        const minC = sr ? Math.min(sr.anchor.col, sr.end.col) : sc.col;
        const maxC = sr ? Math.max(sr.anchor.col, sr.end.col) : sc.col;
        for (let r = minR; r <= maxR; r++) {
          for (let c = minC; c <= maxC; c++) {
            const cl = dataRef.current.cells[getCellKey(r, c)] || EMPTY_CELL;
            onCellFormatUpdateRef.current(r, c, { ...cl.format, bold: newBold });
          }
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
        e.preventDefault();
        const cell = dataRef.current.cells[getCellKey(sc.row, sc.col)] || EMPTY_CELL;
        const newItalic = !cell.format?.italic;
        const sr = selectionRangeRef.current;
        const minR = sr ? Math.min(sr.anchor.row, sr.end.row) : sc.row;
        const maxR = sr ? Math.max(sr.anchor.row, sr.end.row) : sc.row;
        const minC = sr ? Math.min(sr.anchor.col, sr.end.col) : sc.col;
        const maxC = sr ? Math.max(sr.anchor.col, sr.end.col) : sc.col;
        for (let r = minR; r <= maxR; r++) {
          for (let c = minC; c <= maxC; c++) {
            const cl = dataRef.current.cells[getCellKey(r, c)] || EMPTY_CELL;
            onCellFormatUpdateRef.current(r, c, { ...cl.format, italic: newItalic });
          }
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // Column/Row resize (ref-based — no re-attach)
  // ═══════════════════════════════════════════════════════════════

  const handleColumnResizeStart = useCallback((col: number, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    resizingColumnRef.current = col;
    resizeStartRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleRowResizeStart = useCallback((row: number, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    resizingRowRef.current = row;
    resizeStartRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const rc = resizingColumnRef.current;
      const rr = resizingRowRef.current;
      if (rc !== null) {
        const diff = e.clientX - resizeStartRef.current.x;
        const nw = Math.max(50, (columnWidthsRef.current[rc] || DEFAULT_CELL_WIDTH) + diff);
        columnWidthsRef.current = { ...columnWidthsRef.current, [rc]: nw };
        setColumnWidths({ ...columnWidthsRef.current });
        resizeStartRef.current.x = e.clientX;
      }
      if (rr !== null) {
        const diff = e.clientY - resizeStartRef.current.y;
        const nh = Math.max(24, (rowHeightsRef.current[rr] || DEFAULT_CELL_HEIGHT) + diff);
        rowHeightsRef.current = { ...rowHeightsRef.current, [rr]: nh };
        setRowHeights({ ...rowHeightsRef.current });
        resizeStartRef.current.y = e.clientY;
      }

      // Drag-to-select cells
      if (isSelectingRef.current && !tableDragRef.current && containerRef.current && selectedCellRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const scrollLeft = containerRef.current.scrollLeft;
        const scrollTop = containerRef.current.scrollTop;
        const mx = e.clientX - rect.left + scrollLeft;
        const my = e.clientY - rect.top + scrollTop;

        const origin = getCellOriginRef.current();
        let accW = origin.x;
        let mouseCol = 0;
        for (let c = 0; c < dataRef.current.cols; c++) {
          const w = columnWidthsRef.current[c] || DEFAULT_CELL_WIDTH;
          if (mx < accW + w) { mouseCol = c; break; }
          accW += w;
          mouseCol = c;
        }
        let accH = origin.y;
        let mouseRow = 0;
        for (let r = 0; r < dataRef.current.rows; r++) {
          const h = rowHeightsRef.current[r] || DEFAULT_CELL_HEIGHT;
          if (my < accH + h) { mouseRow = r; break; }
          accH += h;
          mouseRow = r;
        }

        const anchor = selectionRangeRef.current?.anchor || selectedCellRef.current;
        // Only create selection range if we've moved to a different cell
        if (mouseRow !== anchor.row || mouseCol !== anchor.col) {
          setSelectionRange({ anchor, end: { row: mouseRow, col: mouseCol } });
          setSelectedCell({ row: mouseRow, col: mouseCol });
        }
      }

      // Table drag — compute preview destination
      if (tableDragRef.current && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const scrollLeft = containerRef.current.scrollLeft;
        const scrollTop = containerRef.current.scrollTop;
        const mx = e.clientX - rect.left + scrollLeft;
        const my = e.clientY - rect.top + scrollTop;

        // Convert mouse position to row/col
        const origin = getCellOriginRef.current();
        let accW = origin.x;
        let mouseCol = 0;
        for (let c = 0; c < dataRef.current.cols; c++) {
          const w = columnWidthsRef.current[c] || DEFAULT_CELL_WIDTH;
          if (mx < accW + w) { mouseCol = c; break; }
          accW += w;
          mouseCol = c;
        }
        let accH = origin.y;
        let mouseRow = 0;
        for (let r = 0; r < dataRef.current.rows; r++) {
          const h = rowHeightsRef.current[r] || DEFAULT_CELL_HEIGHT;
          if (my < accH + h) { mouseRow = r; break; }
          accH += h;
          mouseRow = r;
        }

        const drag = tableDragRef.current;
        const tableH = drag.tableBottomRight.row - drag.tableTopLeft.row;
        const tableW = drag.tableBottomRight.col - drag.tableTopLeft.col;

        // Destination top-left = mouse position minus grab offset
        let dstR = mouseRow - drag.grabOffsetRow;
        let dstC = mouseCol - drag.grabOffsetCol;
        // Clamp to grid bounds
        dstR = Math.max(0, Math.min(dstR, dataRef.current.rows - 1 - tableH));
        dstC = Math.max(0, Math.min(dstC, dataRef.current.cols - 1 - tableW));

        setTableDragPreview({
          srcTopLeft: drag.tableTopLeft,
          srcBottomRight: drag.tableBottomRight,
          dstTopLeft: { row: dstR, col: dstC },
          dstBottomRight: { row: dstR + tableH, col: dstC + tableW },
        });
        setIsDraggingTable(true);
      }
    };

    const onUp = () => {
      // End drag-to-select
      isSelectingRef.current = false;

      // Finish table drag — read destination from preview
      if (tableDragRef.current && isDraggingTable && tableDragPreview) {
        const tl = tableDragPreview.srcTopLeft;
        const br = tableDragPreview.srcBottomRight;
        const newTLR = tableDragPreview.dstTopLeft.row;
        const newTLC = tableDragPreview.dstTopLeft.col;
        const dR = newTLR - tl.row;
        const dC = newTLC - tl.col;

        if (dR !== 0 || dC !== 0) {
          const batch = onBatchUpdateRef.current;
          const cells = dataRef.current.cells;
          const updates: Array<{ row: number; col: number; value?: string; formula?: string; format?: CellFormat; replaceFormat?: boolean }> = [];

          // Collect old table data
          const tableCellData: Array<{ dr: number; dc: number; cell: Cell }> = [];
          for (let r = tl.row; r <= br.row; r++) {
            for (let c = tl.col; c <= br.col; c++) {
              const cell = cells[getCellKey(r, c)];
              if (cell) tableCellData.push({ dr: r - tl.row, dc: c - tl.col, cell: { ...cell, format: cell.format ? { ...cell.format } : undefined } });
            }
          }

          // Clear old position — use replaceFormat to fully reset (not merge)
          for (let r = tl.row; r <= br.row; r++) {
            for (let c = tl.col; c <= br.col; c++) {
              // Skip cells that will be overwritten by the new position anyway
              const isInNewArea = r >= newTLR && r <= newTLR + (br.row - tl.row) && c >= newTLC && c <= newTLC + (br.col - tl.col);
              if (!isInNewArea) {
                updates.push({ row: r, col: c, value: '', formula: '', format: {}, replaceFormat: true });
              }
            }
          }

          // Write to new position — use replaceFormat so format is set exactly
          for (const td of tableCellData) {
            const nr = newTLR + td.dr;
            const nc = newTLC + td.dc;
            updates.push({ row: nr, col: nc, value: td.cell.value, formula: td.cell.formula, format: td.cell.format || {}, replaceFormat: true });
          }

          if (batch) batch(updates);
          else updates.forEach(u => {
            if (u.value !== undefined) onCellUpdateRef.current(u.row, u.col, u.value, u.formula);
            if (u.format) onCellFormatUpdateRef.current(u.row, u.col, u.format);
          });
        }
      }

      resizingColumnRef.current = null;
      resizingRowRef.current = null;
      tableDragRef.current = null;
      setIsDraggingTable(false);
      setTableDragPreview(null);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [isDraggingTable, tableDragPreview]);

  // ═══════════════════════════════════════════════════════════════
  // Table drag start
  // ═══════════════════════════════════════════════════════════════

  const handleDragHandleDown = useCallback((row: number, col: number, e: React.MouseEvent) => {
    e.preventDefault();
    const table = detectTableAt(row, col);
    if (!table) return;
    tableDragRef.current = {
      tableTopLeft: table.topLeft,
      tableBottomRight: table.bottomRight,
      grabOffsetRow: row - table.topLeft.row,
      grabOffsetCol: col - table.topLeft.col,
    };
  }, [detectTableAt]);

  // ═══════════════════════════════════════════════════════════════
  // Formatting helpers
  // ═══════════════════════════════════════════════════════════════

  // Helper: iterate all cells in current selection (or just the selected cell)
  const forEachSelectedCell = useCallback((fn: (row: number, col: number) => void) => {
    const sc = selectedCellRef.current;
    if (!sc) return;
    const sr = selectionRangeRef.current;
    const minR = sr ? Math.min(sr.anchor.row, sr.end.row) : sc.row;
    const maxR = sr ? Math.max(sr.anchor.row, sr.end.row) : sc.row;
    const minC = sr ? Math.min(sr.anchor.col, sr.end.col) : sc.col;
    const maxC = sr ? Math.max(sr.anchor.col, sr.end.col) : sc.col;
    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) fn(r, c);
    }
  }, []);

  const toggleFormat = useCallback((format: 'bold' | 'italic' | '', align?: 'left' | 'center' | 'right') => {
    const sc = selectedCellRef.current;
    if (!sc) return;
    // Toggle based on the active cell's current state
    const cell = dataRef.current.cells[getCellKey(sc.row, sc.col)] || EMPTY_CELL;
    const newBold = format === 'bold' ? !cell.format?.bold : cell.format?.bold;
    const newItalic = format === 'italic' ? !cell.format?.italic : cell.format?.italic;
    const newAlign = align ? (cell.format?.align === align ? 'left' : align) : cell.format?.align;
    forEachSelectedCell((r, c) => {
      const cl = dataRef.current.cells[getCellKey(r, c)] || EMPTY_CELL;
      const nf = { ...cl.format };
      if (format === 'bold') nf.bold = newBold;
      else if (format === 'italic') nf.italic = newItalic;
      if (align) nf.align = newAlign;
      onCellFormatUpdateRef.current(r, c, nf);
    });
  }, [forEachSelectedCell]);

  const setCellBackgroundColor = useCallback((color: string) => {
    forEachSelectedCell((r, c) => {
      const cl = dataRef.current.cells[getCellKey(r, c)] || EMPTY_CELL;
      onCellFormatUpdateRef.current(r, c, { ...cl.format, backgroundColor: color });
    });
    setShowColorPicker(false);
  }, [forEachSelectedCell]);

  const setCellTextColor = useCallback((color: string) => {
    forEachSelectedCell((r, c) => {
      const cl = dataRef.current.cells[getCellKey(r, c)] || EMPTY_CELL;
      onCellFormatUpdateRef.current(r, c, { ...cl.format, textColor: color });
    });
    setShowTextColorPicker(false);
  }, [forEachSelectedCell]);

  const applyBorderStyle = useCallback((style: 'all' | 'outer' | 'none' | 'bottom' | 'right', color: string = '#3a3a3a') => {
    const sc = selectedCellRef.current;
    if (!sc) return;
    const sr = selectionRangeRef.current;
    const minR = sr ? Math.min(sr.anchor.row, sr.end.row) : sc.row;
    const maxR = sr ? Math.max(sr.anchor.row, sr.end.row) : sc.row;
    const minC = sr ? Math.min(sr.anchor.col, sr.end.col) : sc.col;
    const maxC = sr ? Math.max(sr.anchor.col, sr.end.col) : sc.col;
    const border = `1px solid ${color}`;
    const thick = `2px solid ${color}`;

    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        const cl = dataRef.current.cells[getCellKey(r, c)] || EMPTY_CELL;
        let nf = { ...cl.format };
        switch (style) {
          case 'all': nf = { ...nf, borderTop: border, borderBottom: border, borderLeft: border, borderRight: border }; break;
          case 'outer': {
            nf.borderTop = r === minR ? thick : nf.borderTop;
            nf.borderBottom = r === maxR ? thick : nf.borderBottom;
            nf.borderLeft = c === minC ? thick : nf.borderLeft;
            nf.borderRight = c === maxC ? thick : nf.borderRight;
            break;
          }
          case 'bottom': nf = { ...nf, borderBottom: thick }; break;
          case 'right': nf = { ...nf, borderRight: thick }; break;
          case 'none': nf = { ...nf, borderTop: undefined, borderBottom: undefined, borderLeft: undefined, borderRight: undefined }; break;
        }
        onCellFormatUpdateRef.current(r, c, nf);
      }
    }
    setShowBorderMenu(false);
  }, []);

  const setNumberFormat = useCallback((format: 'text' | 'number' | 'currency' | 'percent') => {
    forEachSelectedCell((r, c) => {
      const cl = dataRef.current.cells[getCellKey(r, c)] || EMPTY_CELL;
      onCellFormatUpdateRef.current(r, c, { ...cl.format, numberFormat: format });
    });
  }, [forEachSelectedCell]);

  // ═══════════════════════════════════════════════════════════════
  // Table insertion — batch mode
  // ═══════════════════════════════════════════════════════════════

  const insertTable = useCallback(() => {
    const sc = selectedCellRef.current;
    if (!sc) return;

    const updates: Array<{ row: number; col: number; value?: string; format?: CellFormat }> = [];
    let startRow = sc.row;
    const startCol = sc.col;

    if (tableTitle.trim()) {
      updates.push({ row: startRow, col: startCol, value: tableTitle.trim(), format: { bold: true, fontSize: 14, textColor: '#ffffff', align: 'left' } });
      startRow += 1;
    }

    const border = `1px solid ${tableBorderColor}`;
    const thick = `2px solid ${tableBorderColor}`;

    for (let row = 0; row < tableRows; row++) {
      for (let col = 0; col < tableCols; col++) {
        const r = startRow + row;
        const c = startCol + col;
        if (row === 0) {
          updates.push({
            row: r, col: c, value: `Header ${col + 1}`,
            format: { bold: true, backgroundColor: tableHeaderColor + '22', textColor: tableHeaderColor, align: 'center', borderTop: thick, borderBottom: `2px solid ${tableHeaderColor}`, borderLeft: col === 0 ? thick : border, borderRight: col === tableCols - 1 ? thick : border },
          });
        } else {
          updates.push({
            row: r, col: c, value: '',
            format: { backgroundColor: row % 2 === 0 ? '#2a2a2a' : '#1a1a1a', borderBottom: row === tableRows - 1 ? thick : border, borderLeft: col === 0 ? thick : border, borderRight: col === tableCols - 1 ? thick : border, borderTop: border },
          });
        }
      }
    }

    if (onBatchUpdateRef.current) onBatchUpdateRef.current(updates);
    else updates.forEach(u => { if (u.value !== undefined) onCellUpdateRef.current(u.row, u.col, u.value); if (u.format) onCellFormatUpdateRef.current(u.row, u.col, u.format); });

    setShowTableModal(false);
    setTableTitle('');
  }, [tableTitle, tableBorderColor, tableHeaderColor, tableRows, tableCols]);

  // Close popovers
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest('[data-popover]')) {
        setShowFormatMenu(false);
        setShowColorPicker(false);
        setShowTextColorPicker(false);
        setShowBorderMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════════════

  const selectedCellData = selectedCell ? (data.cells[getCellKey(selectedCell.row, selectedCell.col)] || EMPTY_CELL) : null;
  const cellReference = selectedCell ? `${getColumnLetter(selectedCell.col)}${selectedCell.row + 1}` : '';

  // Show formula mode indicator in status bar
  const isInFormulaMode = editingCell && editValue.startsWith('=');

  return (
    <div className={cn('flex flex-col h-full bg-[#1a1a1a] text-gray-200 overflow-hidden select-none', isDraggingTable && 'cursor-move')}>
      {/* ─── Toolbar ─── */}
      <div className="flex items-center gap-1.5 px-2 py-1.5 bg-[#252525] border-b border-[#333] flex-shrink-0 flex-wrap">
        {/* Format dropdown */}
        <div className="relative" data-popover>
          <button onClick={() => { setShowFormatMenu(!showFormatMenu); setShowColorPicker(false); setShowTextColorPicker(false); setShowBorderMenu(false); }} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded hover:bg-[#3a3a3a] transition-colors text-xs">
            <span>Format</span><ChevronDown className="w-3 h-3" />
          </button>
          {showFormatMenu && selectedCell && (
            <div className="absolute top-full left-0 mt-1 bg-[#2a2a2a] border border-[#444] rounded-lg shadow-xl p-1.5 z-50 flex gap-0.5" data-popover>
              <button onClick={() => toggleFormat('bold')} className={cn('p-1.5 rounded transition-colors', selectedCellData?.format?.bold ? 'bg-green-500/20 text-green-400' : 'hover:bg-[#3a3a3a]')} title="Bold"><Bold className="w-3.5 h-3.5" /></button>
              <button onClick={() => toggleFormat('italic')} className={cn('p-1.5 rounded transition-colors', selectedCellData?.format?.italic ? 'bg-green-500/20 text-green-400' : 'hover:bg-[#3a3a3a]')} title="Italic"><Italic className="w-3.5 h-3.5" /></button>
              <div className="w-px bg-[#444] mx-0.5" />
              <button onClick={() => toggleFormat('', 'left')} className={cn('p-1.5 rounded transition-colors', selectedCellData?.format?.align === 'left' ? 'bg-green-500/20 text-green-400' : 'hover:bg-[#3a3a3a]')} title="Left"><AlignLeft className="w-3.5 h-3.5" /></button>
              <button onClick={() => toggleFormat('', 'center')} className={cn('p-1.5 rounded transition-colors', selectedCellData?.format?.align === 'center' ? 'bg-green-500/20 text-green-400' : 'hover:bg-[#3a3a3a]')} title="Center"><AlignCenter className="w-3.5 h-3.5" /></button>
              <button onClick={() => toggleFormat('', 'right')} className={cn('p-1.5 rounded transition-colors', selectedCellData?.format?.align === 'right' ? 'bg-green-500/20 text-green-400' : 'hover:bg-[#3a3a3a]')} title="Right"><AlignRight className="w-3.5 h-3.5" /></button>
              <div className="w-px bg-[#444] mx-0.5" />
              <button onClick={() => setNumberFormat('text')} className={cn('p-1.5 rounded transition-colors', selectedCellData?.format?.numberFormat === 'text' ? 'bg-green-500/20 text-green-400' : 'hover:bg-[#3a3a3a]')} title="Text"><Type className="w-3.5 h-3.5" /></button>
              <button onClick={() => setNumberFormat('number')} className={cn('p-1.5 rounded transition-colors', selectedCellData?.format?.numberFormat === 'number' ? 'bg-green-500/20 text-green-400' : 'hover:bg-[#3a3a3a]')} title="Number"><Hash className="w-3.5 h-3.5" /></button>
              <button onClick={() => setNumberFormat('currency')} className={cn('p-1.5 rounded transition-colors', selectedCellData?.format?.numberFormat === 'currency' ? 'bg-green-500/20 text-green-400' : 'hover:bg-[#3a3a3a]')} title="Currency"><DollarSign className="w-3.5 h-3.5" /></button>
              <button onClick={() => setNumberFormat('percent')} className={cn('p-1.5 rounded transition-colors', selectedCellData?.format?.numberFormat === 'percent' ? 'bg-green-500/20 text-green-400' : 'hover:bg-[#3a3a3a]')} title="Percent"><Percent className="w-3.5 h-3.5" /></button>
            </div>
          )}
        </div>

        <div className="w-px h-5 bg-[#444]" />

        {/* Quick Bold / Italic */}
        <button onClick={() => toggleFormat('bold')} className={cn('p-1.5 rounded transition-colors', selectedCellData?.format?.bold ? 'bg-green-500/20 text-green-400' : 'hover:bg-[#3a3a3a]')} title="Bold (Ctrl+B)"><Bold className="w-3.5 h-3.5" /></button>
        <button onClick={() => toggleFormat('italic')} className={cn('p-1.5 rounded transition-colors', selectedCellData?.format?.italic ? 'bg-green-500/20 text-green-400' : 'hover:bg-[#3a3a3a]')} title="Italic (Ctrl+I)"><Italic className="w-3.5 h-3.5" /></button>

        <div className="w-px h-5 bg-[#444]" />

        {/* Background Color */}
        <div className="relative" data-popover>
          <button onClick={() => { setShowColorPicker(!showColorPicker); setShowTextColorPicker(false); setShowFormatMenu(false); setShowBorderMenu(false); }} className="flex items-center gap-1 p-1.5 rounded hover:bg-[#3a3a3a] transition-colors" title="Background color">
            <Paintbrush className="w-3.5 h-3.5" />
            <div className="w-3 h-1.5 rounded-sm" style={{ backgroundColor: selectedCellData?.format?.backgroundColor || '#1a1a1a' }} />
          </button>
          {showColorPicker && selectedCell && (
            <div className="absolute top-full left-0 mt-1 bg-[#2a2a2a] border border-[#444] rounded-lg shadow-xl p-3 z-50 w-[200px]" data-popover>
              <div className="text-xs text-gray-400 mb-2 font-medium">Background</div>
              <div className="grid grid-cols-8 gap-1 mb-3">
                {PRESET_COLORS.map(c => (
                  <button key={c} onClick={() => setCellBackgroundColor(c)} className={cn('w-5 h-5 rounded border border-[#555] hover:border-white hover:scale-110 transition-all', selectedCellData?.format?.backgroundColor === c && 'ring-1 ring-white ring-offset-1 ring-offset-[#2a2a2a]')} style={{ backgroundColor: c }} />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input type="color" value={customColor} onChange={(e) => setCustomColor(e.target.value)} className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent" />
                <input type="text" value={customColor} onChange={(e) => setCustomColor(e.target.value)} className="flex-1 bg-[#1a1a1a] text-gray-200 px-2 py-1 border border-[#444] rounded text-xs font-mono" placeholder="#hex" />
                <button onClick={() => setCellBackgroundColor(customColor)} className="px-2 py-1 bg-green-600 hover:bg-green-700 rounded text-xs font-medium transition-colors">Set</button>
              </div>
              <button onClick={() => setCellBackgroundColor('#1a1a1a')} className="mt-2 w-full px-2 py-1 text-xs text-gray-400 hover:text-white hover:bg-[#3a3a3a] rounded transition-colors">Clear background</button>
            </div>
          )}
        </div>

        {/* Text Color */}
        <div className="relative" data-popover>
          <button onClick={() => { setShowTextColorPicker(!showTextColorPicker); setShowColorPicker(false); setShowFormatMenu(false); setShowBorderMenu(false); }} className="flex items-center gap-1 p-1.5 rounded hover:bg-[#3a3a3a] transition-colors" title="Text color">
            <Type className="w-3.5 h-3.5" />
            <div className="w-3 h-1.5 rounded-sm" style={{ backgroundColor: selectedCellData?.format?.textColor || '#e5e7eb' }} />
          </button>
          {showTextColorPicker && selectedCell && (
            <div className="absolute top-full left-0 mt-1 bg-[#2a2a2a] border border-[#444] rounded-lg shadow-xl p-3 z-50 w-[200px]" data-popover>
              <div className="text-xs text-gray-400 mb-2 font-medium">Text Color</div>
              <div className="grid grid-cols-8 gap-1 mb-3">
                {[...PRESET_COLORS, '#ffffff', '#e5e7eb', '#d1d5db', '#9ca3af', '#6b7280', '#4b5563', '#374151', '#1f2937'].map(c => (
                  <button key={`t-${c}`} onClick={() => setCellTextColor(c)} className={cn('w-5 h-5 rounded border border-[#555] hover:border-white hover:scale-110 transition-all', selectedCellData?.format?.textColor === c && 'ring-1 ring-white ring-offset-1 ring-offset-[#2a2a2a]')} style={{ backgroundColor: c }} />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input type="color" value={customTextColor} onChange={(e) => setCustomTextColor(e.target.value)} className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent" />
                <input type="text" value={customTextColor} onChange={(e) => setCustomTextColor(e.target.value)} className="flex-1 bg-[#1a1a1a] text-gray-200 px-2 py-1 border border-[#444] rounded text-xs font-mono" placeholder="#hex" />
                <button onClick={() => setCellTextColor(customTextColor)} className="px-2 py-1 bg-green-600 hover:bg-green-700 rounded text-xs font-medium transition-colors">Set</button>
              </div>
            </div>
          )}
        </div>

        <div className="w-px h-5 bg-[#444]" />

        {/* Borders */}
        <div className="relative" data-popover>
          <button onClick={() => { setShowBorderMenu(!showBorderMenu); setShowColorPicker(false); setShowTextColorPicker(false); setShowFormatMenu(false); }} className="p-1.5 rounded hover:bg-[#3a3a3a] transition-colors" title="Borders">
            <Grid3x3 className="w-3.5 h-3.5" />
          </button>
          {showBorderMenu && selectedCell && (
            <div className="absolute top-full left-0 mt-1 bg-[#2a2a2a] border border-[#444] rounded-lg shadow-xl p-3 z-50 w-48" data-popover>
              <div className="text-xs text-gray-400 mb-2 font-medium">Borders</div>
              <div className="space-y-1 mb-3">
                <button onClick={() => applyBorderStyle('all')} className="w-full text-left px-2 py-1.5 rounded hover:bg-[#3a3a3a] text-xs transition-colors">All borders</button>
                <button onClick={() => applyBorderStyle('outer')} className="w-full text-left px-2 py-1.5 rounded hover:bg-[#3a3a3a] text-xs transition-colors">Thick outer</button>
                <button onClick={() => applyBorderStyle('bottom')} className="w-full text-left px-2 py-1.5 rounded hover:bg-[#3a3a3a] text-xs transition-colors">Bottom border</button>
                <button onClick={() => applyBorderStyle('right')} className="w-full text-left px-2 py-1.5 rounded hover:bg-[#3a3a3a] text-xs transition-colors">Right border</button>
                <button onClick={() => applyBorderStyle('none')} className="w-full text-left px-2 py-1.5 rounded hover:bg-[#3a3a3a] text-xs text-red-400 transition-colors">Clear borders</button>
              </div>
              <div className="text-xs text-gray-400 mb-1.5 font-medium">Border color</div>
              <div className="grid grid-cols-8 gap-1">
                {BORDER_COLORS.map(c => (
                  <button key={`b-${c}`} onClick={() => applyBorderStyle('all', c)} className="w-5 h-5 rounded border border-[#555] hover:border-white hover:scale-110 transition-all" style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="w-px h-5 bg-[#444]" />

        {/* Table Insertion */}
        <div className="relative" data-popover>
          <button onClick={() => { setShowTableModal(!showTableModal); setShowColorPicker(false); setShowTextColorPicker(false); setShowFormatMenu(false); setShowBorderMenu(false); }} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded hover:bg-[#3a3a3a] transition-colors text-xs" title="Insert table">
            <Grid3x3 className="w-3.5 h-3.5" />Table
          </button>
          {showTableModal && (
            <div className="absolute top-full left-0 mt-1 bg-[#2a2a2a] border border-[#444] rounded-lg shadow-xl p-4 z-50 w-72" data-popover>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium">Insert Table</span>
                <button onClick={() => setShowTableModal(false)} className="p-1 hover:bg-[#3a3a3a] rounded"><X className="w-3.5 h-3.5" /></button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Title (optional)</label>
                  <input type="text" value={tableTitle} onChange={(e) => setTableTitle(e.target.value)} className="w-full bg-[#1a1a1a] text-gray-200 px-2.5 py-1.5 border border-[#444] rounded text-xs" placeholder="e.g. Sales Report" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Rows</label>
                    <input type="number" value={tableRows} onChange={(e) => setTableRows(Math.max(1, parseInt(e.target.value) || 1))} className="w-full bg-[#1a1a1a] text-gray-200 px-2.5 py-1.5 border border-[#444] rounded text-xs" min="1" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Columns</label>
                    <input type="number" value={tableCols} onChange={(e) => setTableCols(Math.max(1, parseInt(e.target.value) || 1))} className="w-full bg-[#1a1a1a] text-gray-200 px-2.5 py-1.5 border border-[#444] rounded text-xs" min="1" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block">Header Accent</label>
                  <div className="flex gap-1.5">
                    {['#22c55e', '#3b82f6', '#ef4444', '#f59e0b', '#a855f7', '#ec4899', '#06b6d4', '#ffffff'].map(c => (
                      <button key={`h-${c}`} onClick={() => setTableHeaderColor(c)} className={cn('w-5 h-5 rounded border border-[#555] hover:scale-110 transition-all', tableHeaderColor === c && 'ring-1 ring-white ring-offset-1 ring-offset-[#2a2a2a]')} style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block">Border Color</label>
                  <div className="flex gap-1.5">
                    {BORDER_COLORS.map(c => (
                      <button key={`tb-${c}`} onClick={() => setTableBorderColor(c)} className={cn('w-5 h-5 rounded border border-[#555] hover:scale-110 transition-all', tableBorderColor === c && 'ring-1 ring-white ring-offset-1 ring-offset-[#2a2a2a]')} style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>
                <button onClick={insertTable} className="w-full px-3 py-2 rounded bg-green-600 hover:bg-green-700 transition-colors text-xs font-medium">Insert Table</button>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1" />

        {/* +Col / +Row */}
        <button onClick={() => { if (onResize) onResize(data.rows, data.cols + 5); }} className="flex items-center gap-1 px-2.5 py-1.5 rounded hover:bg-[#3a3a3a] transition-colors text-xs" title="Add 5 columns">
          <Plus className="w-3 h-3" />Col
        </button>
        <button onClick={() => { if (onResize) onResize(data.rows + 10, data.cols); }} className="flex items-center gap-1 px-2.5 py-1.5 rounded hover:bg-[#3a3a3a] transition-colors text-xs" title="Add 10 rows">
          <Plus className="w-3 h-3" />Row
        </button>
      </div>

      {/* ─── Formula Bar ─── */}
      <div className="flex items-center gap-0 bg-[#252525] border-b border-[#333] flex-shrink-0 h-[32px] min-h-[32px]">
        <div className="w-16 h-full flex items-center justify-center border-r border-[#333] text-xs font-mono text-gray-400 bg-[#1e1e1e] flex-shrink-0">
          {cellReference || '—'}
        </div>
        <div className={cn('w-8 h-full flex items-center justify-center text-xs italic flex-shrink-0', isInFormulaMode ? 'text-blue-400' : 'text-gray-500')}>
          fx
        </div>
        <input
          ref={formulaBarRef}
          type="text"
          value={editingCell ? editValue : (selectedCellData?.formula || selectedCellData?.value || '')}
          onChange={handleFormulaBarChange}
          onKeyDown={handleFormulaBarKeyDown}
          onFocus={handleFormulaBarFocus}
          onBlur={handleFormulaBarBlur}
          className={cn('flex-1 h-full bg-[#1a1a1a] text-gray-200 px-2 text-xs outline-none border-0 font-mono', isInFormulaMode && 'ring-1 ring-inset ring-blue-500/40')}
          placeholder={selectedCell ? 'Enter value or formula (=SUM, =IF, =A1+B1 ...)' : 'Select a cell'}
          readOnly={!selectedCell}
        />
      </div>

      {/* ─── Grid ─── */}
      <div ref={containerRef} className="flex-1 overflow-auto relative">
        <table ref={tableRef} className="border-collapse bg-[#1a1a1a]" style={{ minWidth: '100%' }}>
          <thead className="sticky top-0 z-10">
            <tr>
              <th className="w-10 h-[28px] bg-[#1e1e1e] border-b border-r border-[#333] text-center text-[10px] text-gray-600 sticky left-0 z-20" />
              {Array.from({ length: data.cols }).map((_, col) => (
                <th key={col} className="h-[28px] bg-[#1e1e1e] border-b border-r border-[#333] text-center text-[10px] font-medium text-gray-500 hover:bg-[#2a2a2a] transition-colors cursor-default relative" style={{ width: columnWidths[col] || DEFAULT_CELL_WIDTH, minWidth: columnWidths[col] || DEFAULT_CELL_WIDTH }}>
                  <div className="flex items-center justify-center h-full">{getColumnLetter(col)}</div>
                  <div onMouseDown={(e) => handleColumnResizeStart(col, e)} className="absolute right-0 top-0 w-[3px] h-full hover:bg-green-500 cursor-col-resize opacity-0 hover:opacity-100 transition-opacity" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: data.rows }).map((_, row) => (
              <tr key={row}>
                <th className="w-10 bg-[#1e1e1e] border-b border-r border-[#333] text-center text-[10px] text-gray-500 sticky left-0 z-10 cursor-default relative" style={{ height: rowHeights[row] || DEFAULT_CELL_HEIGHT }}>
                  <div className="flex items-center justify-center h-full">{row + 1}</div>
                  <div onMouseDown={(e) => handleRowResizeStart(row, e)} className="absolute bottom-0 left-0 w-full h-[3px] hover:bg-green-500 cursor-row-resize opacity-0 hover:opacity-100 transition-opacity" />
                </th>
                {Array.from({ length: data.cols }).map((_, col) => {
                  const key = getCellKey(row, col);
                  const cell = data.cells[key] || EMPTY_CELL;
                  const isSelected = selectedCell?.row === row && selectedCell?.col === col;
                  const isEditing = editingCell?.row === row && editingCell?.col === col;
                  const isCopied = copiedCell?.row === row && copiedCell?.col === col;
                  const isInSelection = selectionRange ? (
                    row >= Math.min(selectionRange.anchor.row, selectionRange.end.row) &&
                    row <= Math.max(selectionRange.anchor.row, selectionRange.end.row) &&
                    col >= Math.min(selectionRange.anchor.col, selectionRange.end.col) &&
                    col <= Math.max(selectionRange.anchor.col, selectionRange.end.col)
                  ) : false;
                  const isFormulaHighlight = formulaHighlightCells.has(key);
                  const isTableDragHandle = tableTopLefts.has(key);

                  return (
                    <SpreadsheetCell
                      key={key}
                      row={row}
                      col={col}
                      cellValue={cell.value}
                      cellFormula={cell.formula}
                      cellFormat={cell.format}
                      width={columnWidths[col] || DEFAULT_CELL_WIDTH}
                      height={rowHeights[row] || DEFAULT_CELL_HEIGHT}
                      isSelected={isSelected}
                      isEditing={isEditing}
                      isCopied={isCopied}
                      isInSelection={isInSelection}
                      isFormulaHighlight={isFormulaHighlight}
                      isTableDragHandle={isTableDragHandle}
                      editValue={isEditing ? editValue : ''}
                      onMouseDown={handleCellMouseDown}
                      onDoubleClick={handleCellDoubleClick}
                      onEditChange={handleCellChange}
                      onEditBlur={handleEditBlur}
                      onEditKeyDown={handleKeyDown}
                      onDragHandleDown={handleDragHandleDown}
                      editInputRef={editInputRef}
                    />
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Table drag preview overlay */}
        {tableDragPreview && isDraggingTable && (() => {
          const src = computeOverlayRect(tableDragPreview.srcTopLeft, tableDragPreview.srcBottomRight);
          const dst = computeOverlayRect(tableDragPreview.dstTopLeft, tableDragPreview.dstBottomRight);
          const isSamePos = tableDragPreview.srcTopLeft.row === tableDragPreview.dstTopLeft.row &&
                            tableDragPreview.srcTopLeft.col === tableDragPreview.dstTopLeft.col;

          return (
            <>
              {/* Source area dim */}
              {!isSamePos && (
                <div
                  className="absolute pointer-events-none z-20 border-2 border-dashed border-red-500/40 bg-red-500/10 rounded-sm"
                  style={{ left: src.x, top: src.y, width: src.w, height: src.h }}
                />
              )}
              {/* Destination preview */}
              <div
                className="absolute pointer-events-none z-20 border-2 border-green-400 bg-green-400/15 rounded-sm shadow-lg shadow-green-500/20"
                style={{ left: dst.x, top: dst.y, width: dst.w, height: dst.h }}
              >
                <div className="absolute top-0.5 left-1 text-[9px] text-green-400 font-medium">
                  {getColumnLetter(tableDragPreview.dstTopLeft.col)}{tableDragPreview.dstTopLeft.row + 1}
                </div>
              </div>
            </>
          );
        })()}

        {/* Selection range border overlay */}
        {selectionRange && !isDraggingTable && (() => {
          const minR = Math.min(selectionRange.anchor.row, selectionRange.end.row);
          const maxR = Math.max(selectionRange.anchor.row, selectionRange.end.row);
          const minC = Math.min(selectionRange.anchor.col, selectionRange.end.col);
          const maxC = Math.max(selectionRange.anchor.col, selectionRange.end.col);
          const rect = computeOverlayRect({ row: minR, col: minC }, { row: maxR, col: maxC });
          return (
            <div
              className="absolute pointer-events-none z-[6] border-2 border-green-500 rounded-sm"
              style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
            />
          );
        })()}
      </div>

      {/* ─── Status Bar ─── */}
      <div className="px-3 py-1 bg-[#1e1e1e] border-t border-[#333] text-[10px] text-gray-500 flex-shrink-0 flex items-center justify-between">
        <div className="flex gap-4">
          <span>{data.rows} × {data.cols}</span>
          {selectedCell && !selectionRange && <span>{cellReference}{copiedCell && ' • Clipboard ready'}</span>}
          {selectionRange && (() => {
            const minR = Math.min(selectionRange.anchor.row, selectionRange.end.row);
            const maxR = Math.max(selectionRange.anchor.row, selectionRange.end.row);
            const minC = Math.min(selectionRange.anchor.col, selectionRange.end.col);
            const maxC = Math.max(selectionRange.anchor.col, selectionRange.end.col);
            const count = (maxR - minR + 1) * (maxC - minC + 1);
            return (
              <span className="text-green-400">
                {getColumnLetter(minC)}{minR + 1}:{getColumnLetter(maxC)}{maxR + 1} • {count} cells selected
              </span>
            );
          })()}
          {isInFormulaMode && <span className="text-blue-400">Formula mode — click cells to insert references</span>}
          {isDraggingTable && <span className="text-green-400">Dragging table…</span>}
        </div>
        <div className="flex gap-3">
          <span>↵ Save</span>
          <span>Tab Next</span>
          <span>Esc Cancel</span>
          <span>Ctrl+C/V</span>
          <span>=SUM =AVG =MIN =MAX =IF</span>
        </div>
      </div>
    </div>
  );
};

