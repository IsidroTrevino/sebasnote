'use client';

import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  DollarSign,
  Grid3x3,
  Hash,
  Italic,
  PaintBucket,
  Percent,
  Plus,
  Table2,
  Type,
} from 'lucide-react';
import { cn } from '@/lib/utils';

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

type Point = { row: number; col: number };
type Range = { anchor: Point; focus: Point };
type Rect = { minRow: number; maxRow: number; minCol: number; maxCol: number };
type BatchUpdate = { row: number; col: number; value?: string; formula?: string; format?: CellFormat; replaceFormat?: boolean };

const DEFAULT_CELL_HEIGHT = 32;
const DEFAULT_CELL_WIDTH = 120;
const ROW_HEADER_WIDTH = 44;
const EMPTY_CELL: Cell = { value: '' };
const COLUMN_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const PRESET_COLORS = [
  '#1a1a1a', '#2a2a2a', '#3a3a3a', '#4a4a4a', '#6b7280', '#9ca3af', '#e5e7eb',
  '#fee2e2', '#fca5a5', '#ef4444', '#ffedd5', '#fdba74', '#f97316',
  '#fef3c7', '#facc15', '#eab308', '#dcfce7', '#86efac', '#22c55e',
  '#ccfbf1', '#2dd4bf', '#14b8a6', '#dbeafe', '#93c5fd', '#3b82f6',
  '#ede9fe', '#c4b5fd', '#8b5cf6', '#fce7f3', '#f9a8d4', '#ec4899',
];

const BORDER_COLORS = ['#3a3a3a', '#6b7280', '#e5e7eb', '#22c55e', '#3b82f6', '#ef4444', '#f59e0b', '#a855f7'];

const getCellKey = (row: number, col: number) => `${row}_${col}`;

const getColumnLetter = (index: number): string => {
  let n = index + 1;
  let label = '';
  while (n > 0) {
    const mod = (n - 1) % 26;
    label = COLUMN_LETTERS[mod] + label;
    n = Math.floor((n - mod) / 26);
  }
  return label;
};

const parseCellReference = (ref: string): Point | null => {
  const match = ref.trim().match(/^([A-Z]+)(\d+)$/i);
  if (!match) return null;
  const letters = match[1].toUpperCase();
  let col = 0;
  for (let i = 0; i < letters.length; i++) {
    col = col * 26 + (letters.charCodeAt(i) - 64);
  }
  return { row: Number(match[2]) - 1, col: col - 1 };
};

const pointToRef = (point: Point) => `${getColumnLetter(point.col)}${point.row + 1}`;

const normalizeRange = (range: Range): Rect => ({
  minRow: Math.min(range.anchor.row, range.focus.row),
  maxRow: Math.max(range.anchor.row, range.focus.row),
  minCol: Math.min(range.anchor.col, range.focus.col),
  maxCol: Math.max(range.anchor.col, range.focus.col),
});

const isPointInRect = (point: Point, rect: Rect) =>
  point.row >= rect.minRow && point.row <= rect.maxRow && point.col >= rect.minCol && point.col <= rect.maxCol;

const clampPoint = (point: Point, rows: number, cols: number): Point => ({
  row: Math.max(0, Math.min(rows - 1, point.row)),
  col: Math.max(0, Math.min(cols - 1, point.col)),
});

const splitFormulaArgs = (value: string) => {
  const args: string[] = [];
  let current = '';
  let depth = 0;
  let inQuotes = false;

  for (const char of value) {
    if (char === '"') inQuotes = !inQuotes;
    if (!inQuotes && char === '(') depth++;
    if (!inQuotes && char === ')') depth--;
    if (!inQuotes && depth === 0 && char === ',') {
      args.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  if (current.trim()) args.push(current.trim());
  return args;
};

const isFormulaExpectingRef = (formula: string) => {
  if (!formula.startsWith('=')) return false;
  const trimmed = formula.trim();
  if (trimmed === '=') return true;
  return /[(,+\-*/:]$/.test(trimmed);
};

const isFormula = (value: string) => value.trim().startsWith('=');

const cloneCell = (cell?: Cell): Cell => ({
  value: cell?.value ?? '',
  formula: cell?.formula,
  format: cell?.format ? { ...cell.format } : undefined,
});

const formatCellValue = (value: string, format?: CellFormat): string => {
  if (!format?.numberFormat || format.numberFormat === 'text' || value === '') return value;
  const number = Number(value);
  if (Number.isNaN(number)) return value;

  if (format.numberFormat === 'currency') {
    return number.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  }
  if (format.numberFormat === 'percent') {
    return `${(number * 100).toFixed(1)}%`;
  }
  return number.toLocaleString('en-US');
};

const compactFormat = (format: CellFormat): CellFormat => {
  const compact: CellFormat = {};
  for (const [key, value] of Object.entries(format) as Array<[keyof CellFormat, CellFormat[keyof CellFormat]]>) {
    if (value !== undefined) {
      (compact as Record<string, unknown>)[key] = value;
    }
  }
  return compact;
};

const adjustFormulaReferences = (formula: string, rowOffset: number, colOffset: number) => {
  if (!formula.startsWith('=')) return formula;
  return formula.replace(/\b([A-Z]+)(\d+)\b/gi, (match) => {
    const parsed = parseCellReference(match);
    if (!parsed) return match;
    const nextRow = Math.max(0, parsed.row + rowOffset);
    const nextCol = Math.max(0, parsed.col + colOffset);
    return pointToRef({ row: nextRow, col: nextCol });
  });
};

function evaluateFormula(
  formula: string,
  cells: Record<string, Cell>,
  visiting = new Set<string>(),
): string {
  if (!formula.startsWith('=')) return formula;

  const getRaw = (point: Point) => cells[getCellKey(point.row, point.col)] || EMPTY_CELL;
  const getValue = (ref: string): string => {
    const point = parseCellReference(ref);
    if (!point) return '0';
    const key = getCellKey(point.row, point.col);
    if (visiting.has(key)) return '#CYCLE!';
    const cell = getRaw(point);
    if (cell.formula?.startsWith('=')) {
      visiting.add(key);
      const value = evaluateFormula(cell.formula, cells, visiting);
      visiting.delete(key);
      return value;
    }
    return cell.value || '0';
  };

  const getNumber = (refOrNumber: string) => {
    const cleaned = refOrNumber.trim();
    const ref = parseCellReference(cleaned);
    const raw = ref ? getValue(cleaned) : cleaned;
    const number = Number(raw);
    return Number.isFinite(number) ? number : 0;
  };

  const getRangeNumbers = (range: string): number[] => {
    const [start, end] = range.split(':').map((part) => parseCellReference(part));
    if (!start || !end) return [];
    const rect = normalizeRange({ anchor: start, focus: end });
    const values: number[] = [];
    for (let row = rect.minRow; row <= rect.maxRow; row++) {
      for (let col = rect.minCol; col <= rect.maxCol; col++) {
        const number = Number(getValue(pointToRef({ row, col })));
        if (Number.isFinite(number)) values.push(number);
      }
    }
    return values;
  };

  const collectNumbers = (argString: string) =>
    splitFormulaArgs(argString).flatMap((arg) => {
      if (/^[A-Z]+\d+:[A-Z]+\d+$/i.test(arg)) return getRangeNumbers(arg);
      return [getNumber(arg)];
    });

  const expression = formula.slice(1).trim();
  const upper = expression.toUpperCase();

  try {
    const functionMatch = upper.match(/^([A-Z]+)\((.*)\)$/);
    if (functionMatch) {
      const name = functionMatch[1];
      const args = functionMatch[2];

      if (name === 'SUM') {
        return collectNumbers(args).reduce((sum, value) => sum + value, 0).toString();
      }
      if (name === 'AVERAGE' || name === 'AVG') {
        const values = collectNumbers(args);
        return values.length ? (values.reduce((sum, value) => sum + value, 0) / values.length).toString() : '0';
      }
      if (name === 'COUNT') {
        return collectNumbers(args).length.toString();
      }
      if (name === 'MIN') {
        const values = collectNumbers(args);
        return values.length ? Math.min(...values).toString() : '0';
      }
      if (name === 'MAX') {
        const values = collectNumbers(args);
        return values.length ? Math.max(...values).toString() : '0';
      }
      if (name === 'ABS') {
        return Math.abs(getNumber(splitFormulaArgs(args)[0] || '0')).toString();
      }
      if (name === 'ROUND') {
        const [valueArg, placesArg] = splitFormulaArgs(args);
        const places = Math.max(0, Number(placesArg || 0));
        return getNumber(valueArg || '0').toFixed(places);
      }
      if (name === 'CONCAT') {
        return splitFormulaArgs(args).map((arg) => {
          const trimmed = arg.trim();
          if (trimmed.startsWith('"') && trimmed.endsWith('"')) return trimmed.slice(1, -1);
          const ref = parseCellReference(trimmed);
          return ref ? getValue(trimmed) : trimmed;
        }).join('');
      }
      if (name === 'IF') {
        const [condition, trueValue, falseValue] = splitFormulaArgs(args);
        const conditionMatch = condition?.match(/^(.+?)(>=|<=|!=|=|>|<)(.+)$/);
        if (!conditionMatch) return '#ERROR';
        const left = getNumber(conditionMatch[1]);
        const right = getNumber(conditionMatch[3]);
        const op = conditionMatch[2];
        const passed =
          op === '>' ? left > right :
          op === '<' ? left < right :
          op === '>=' ? left >= right :
          op === '<=' ? left <= right :
          op === '!=' ? left !== right :
          left === right;
        const selected = passed ? trueValue : falseValue;
        const trimmed = (selected || '').trim();
        if (trimmed.startsWith('"') && trimmed.endsWith('"')) return trimmed.slice(1, -1);
        if (parseCellReference(trimmed)) return getValue(trimmed);
        return trimmed;
      }
    }

    if (/^[A-Z]+\d+$/i.test(expression)) {
      return getValue(expression);
    }

    const arithmetic = expression.replace(/\b([A-Z]+\d+)\b/gi, (ref) => {
      const numeric = Number(getValue(ref));
      return Number.isFinite(numeric) ? numeric.toString() : '0';
    });

    if (!/^[0-9+\-*/().\s]+$/.test(arithmetic)) return '#ERROR';
    const result = Function(`"use strict"; return (${arithmetic});`)();
    if (typeof result !== 'number' || !Number.isFinite(result)) return '#ERROR';
    return result.toString();
  } catch {
    return '#ERROR';
  }
}

const buildEvaluatedCells = (cells: Record<string, Cell>) => {
  const evaluated: Record<string, Cell> = {};
  for (const key of Object.keys(cells)) {
    const cell = cloneCell(cells[key]);
    if (cell.formula?.startsWith('=')) {
      cell.value = evaluateFormula(cell.formula, cells, new Set([key]));
    }
    evaluated[key] = cell;
  }
  return evaluated;
};

interface SpreadsheetCellProps {
  row: number;
  col: number;
  cell: Cell;
  width: number;
  height: number;
  selected: boolean;
  inRange: boolean;
  copied: boolean;
  formulaHighlighted: boolean;
  editing: boolean;
  editValue: string;
  onMouseDown: (row: number, col: number, event: React.MouseEvent) => void;
  onMouseEnter: (row: number, col: number) => void;
  onDoubleClick: (row: number, col: number) => void;
  onEditChange: (value: string) => void;
  onEditKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  onEditBlur: () => void;
  showFillHandle: boolean;
  onFillStart: (event: React.MouseEvent) => void;
  editInputRef: React.RefObject<HTMLInputElement | null>;
  autoFocusEditor: boolean;
}

const SpreadsheetCell = memo<SpreadsheetCellProps>(({
  row,
  col,
  cell,
  width,
  height,
  selected,
  inRange,
  copied,
  formulaHighlighted,
  editing,
  editValue,
  onMouseDown,
  onMouseEnter,
  onDoubleClick,
  onEditChange,
  onEditKeyDown,
  onEditBlur,
  showFillHandle,
  onFillStart,
  editInputRef,
  autoFocusEditor,
}) => {
  const formattedValue = formatCellValue(cell.value, cell.format);

  return (
    <td
      data-cell={`${row}:${col}`}
      className={cn(
        'relative border-b border-r border-[#2a2a2a] bg-[#1a1a1a] p-0',
        inRange && !selected && 'bg-green-500/10',
        selected && 'z-[4] ring-2 ring-green-500 ring-inset',
        copied && 'ring-2 ring-green-400/60 ring-inset',
        formulaHighlighted && !selected && 'ring-2 ring-blue-400/70 ring-inset',
      )}
      style={{
        width,
        minWidth: width,
        height,
        backgroundColor: cell.format?.backgroundColor || undefined,
        borderTop: cell.format?.borderTop,
        borderRight: cell.format?.borderRight || undefined,
        borderBottom: cell.format?.borderBottom || undefined,
        borderLeft: cell.format?.borderLeft || undefined,
      }}
      onMouseDown={(event) => onMouseDown(row, col, event)}
      onMouseEnter={() => onMouseEnter(row, col)}
      onDoubleClick={() => onDoubleClick(row, col)}
    >
      {editing ? (
        <input
          id={`cell-editor-${row}-${col}`}
          name={`cellEditor-${row}-${col}`}
          ref={editInputRef}
          value={editValue}
          onChange={(event) => onEditChange(event.target.value)}
          onKeyDown={onEditKeyDown}
          onBlur={onEditBlur}
          onMouseDown={(event) => event.stopPropagation()}
          className="h-full w-full bg-[#242424] px-2 text-xs text-gray-100 outline-none"
          aria-label={`Edit ${pointToRef({ row, col })}`}
          autoFocus={autoFocusEditor}
        />
      ) : (
        <div
          className={cn(
            'flex h-full w-full cursor-cell items-center overflow-hidden text-ellipsis whitespace-nowrap px-2 text-xs text-gray-200',
            cell.format?.bold && 'font-bold',
            cell.format?.italic && 'italic',
            cell.format?.align === 'center' && 'justify-center text-center',
            cell.format?.align === 'right' && 'justify-end text-right',
          )}
          style={{
            color: cell.format?.textColor,
            fontSize: cell.format?.fontSize ? `${cell.format.fontSize}px` : undefined,
          }}
        >
          {formattedValue}
        </div>
      )}
      {showFillHandle && !editing && (
        <button
          type="button"
          onMouseDown={onFillStart}
          className="absolute -bottom-1 -right-1 z-20 h-3 w-3 cursor-crosshair rounded-sm border border-white bg-green-500"
          title="Drag to fill"
          aria-label="Drag to fill selected cells"
        />
      )}
    </td>
  );
});

SpreadsheetCell.displayName = 'SpreadsheetCell';

export const Spreadsheet: React.FC<SpreadsheetProps> = ({
  data,
  onCellUpdate,
  onCellFormatUpdate,
  onResize,
  onBatchUpdate,
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const formulaBarRef = useRef<HTMLInputElement>(null);
  const selectionRef = useRef<Range>({ anchor: { row: 0, col: 0 }, focus: { row: 0, col: 0 } });
  const internalClipboardRef = useRef<{ range: Range; cells: Cell[][] } | null>(null);
  const resizingRef = useRef<{ type: 'col' | 'row'; index: number; start: number; size: number } | null>(null);

  const [selectedCell, setSelectedCell] = useState<Point>({ row: 0, col: 0 });
  const [selectionRange, setSelectionRange] = useState<Range>({ anchor: { row: 0, col: 0 }, focus: { row: 0, col: 0 } });
  const [editingCell, setEditingCell] = useState<Point | null>(null);
  const [cellEditorAutoFocus, setCellEditorAutoFocus] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [isSelecting, setIsSelecting] = useState(false);
  const [fillAnchor, setFillAnchor] = useState<Range | null>(null);
  const [fillRange, setFillRange] = useState<Range | null>(null);
  const [copiedRange, setCopiedRange] = useState<Range | null>(null);
  const [formulaHighlightCells, setFormulaHighlightCells] = useState<Set<string>>(new Set());
  const [columnWidths, setColumnWidths] = useState<Record<number, number>>({});
  const [rowHeights, setRowHeights] = useState<Record<number, number>>({});
  const [showBackgroundPicker, setShowBackgroundPicker] = useState(false);
  const [showTextPicker, setShowTextPicker] = useState(false);
  const [showBorderPicker, setShowBorderPicker] = useState(false);
  const [tableRows, setTableRows] = useState(5);
  const [tableCols, setTableCols] = useState(4);

  const dataRef = useRef(data);
  const selectedCellRef = useRef(selectedCell);
  const editingCellRef = useRef(editingCell);
  const editValueRef = useRef(editValue);
  const onCellUpdateRef = useRef(onCellUpdate);
  const onCellFormatUpdateRef = useRef(onCellFormatUpdate);
  const onBatchUpdateRef = useRef(onBatchUpdate);

  dataRef.current = data;
  selectedCellRef.current = selectedCell;
  editingCellRef.current = editingCell;
  editValueRef.current = editValue;
  selectionRef.current = selectionRange;
  onCellUpdateRef.current = onCellUpdate;
  onCellFormatUpdateRef.current = onCellFormatUpdate;
  onBatchUpdateRef.current = onBatchUpdate;

  const evaluatedCells = useMemo(() => buildEvaluatedCells(data.cells), [data.cells]);

  const activeRect = normalizeRange(selectionRange);
  const fillRect = fillRange ? normalizeRange(fillRange) : null;
  const selectedRawCell = data.cells[getCellKey(selectedCell.row, selectedCell.col)] || EMPTY_CELL;
  const activeLabel = activeRect.minRow === activeRect.maxRow && activeRect.minCol === activeRect.maxCol
    ? pointToRef(selectedCell)
    : `${pointToRef({ row: activeRect.minRow, col: activeRect.minCol })}:${pointToRef({ row: activeRect.maxRow, col: activeRect.maxCol })}`;

  const commitBatch = useCallback((updates: BatchUpdate[]) => {
    if (updates.length === 0) return;
    const batch = onBatchUpdateRef.current;
    if (batch) {
      batch(updates);
      return;
    }
    updates.forEach((update) => {
      if (update.format) {
        onCellFormatUpdateRef.current(update.row, update.col, update.format);
      }
      if (update.value !== undefined) {
        onCellUpdateRef.current(update.row, update.col, update.value, update.formula);
      }
    });
  }, []);

  const getRawCell = useCallback((row: number, col: number) => dataRef.current.cells[getCellKey(row, col)] || EMPTY_CELL, []);

  const setSelection = useCallback((range: Range, focus = range.focus) => {
    const clampedFocus = clampPoint(focus, dataRef.current.rows, dataRef.current.cols);
    const clampedRange = {
      anchor: clampPoint(range.anchor, dataRef.current.rows, dataRef.current.cols),
      focus: clampPoint(range.focus, dataRef.current.rows, dataRef.current.cols),
    };
    selectionRef.current = clampedRange;
    setSelectionRange(clampedRange);
    setSelectedCell(clampedFocus);
  }, []);

  const startEditing = useCallback((point: Point, initial?: string, focusCellEditor = true) => {
    const cell = getRawCell(point.row, point.col);
    const value = initial ?? cell.formula ?? cell.value ?? '';
    editingCellRef.current = point;
    setCellEditorAutoFocus(focusCellEditor);
    setEditingCell(point);
    setEditValue(value);
    editValueRef.current = value;
    setFormulaHighlightCells(new Set());
    if (focusCellEditor) {
      requestAnimationFrame(() => editInputRef.current?.focus());
    }
  }, [getRawCell]);

  const commitEditing = useCallback(() => {
    const point = editingCellRef.current;
    if (!point) return;

    const value = editValueRef.current;
    const formula = isFormula(value) ? value : undefined;
    const displayValue = formula ? evaluateFormula(formula, dataRef.current.cells, new Set([getCellKey(point.row, point.col)])) : value;

    onCellUpdateRef.current(point.row, point.col, displayValue, formula);
    editingCellRef.current = null;
    setEditingCell(null);
    setCellEditorAutoFocus(false);
    setFormulaHighlightCells(new Set());
  }, []);

  const cancelEditing = useCallback(() => {
    editingCellRef.current = null;
    setEditingCell(null);
    setCellEditorAutoFocus(false);
    setFormulaHighlightCells(new Set());
  }, []);

  const updateFormulaHighlights = useCallback((value: string) => {
    if (!value.startsWith('=')) {
      setFormulaHighlightCells(new Set());
      return;
    }

    const refs = value.match(/\b[A-Z]+\d+\b/gi) || [];
    const next = new Set<string>();
    refs.forEach((ref) => {
      const point = parseCellReference(ref);
      if (point) next.add(getCellKey(point.row, point.col));
    });
    setFormulaHighlightCells(next);
  }, []);

  const handleEditChange = useCallback((value: string) => {
    setEditValue(value);
    editValueRef.current = value;
    updateFormulaHighlights(value);
  }, [updateFormulaHighlights]);

  const moveSelection = useCallback((rowDelta: number, colDelta: number, extend: boolean) => {
    const current = selectedCellRef.current;
    const next = clampPoint({ row: current.row + rowDelta, col: current.col + colDelta }, dataRef.current.rows, dataRef.current.cols);
    if (extend) {
      setSelection({ anchor: selectionRef.current.anchor, focus: next }, next);
    } else {
      setSelection({ anchor: next, focus: next }, next);
    }
  }, [setSelection]);

  const handleCellMouseDown = useCallback((row: number, col: number, event: React.MouseEvent) => {
    if (event.button !== 0) return;
    rootRef.current?.focus();

    const editing = editingCellRef.current;
    const editValueNow = editValueRef.current;
    if (editing && editValueNow.startsWith('=') && isFormulaExpectingRef(editValueNow)) {
      event.preventDefault();
      const ref = pointToRef({ row, col });
      const nextValue = `${editValueNow}${ref}`;
      setEditValue(nextValue);
      editValueRef.current = nextValue;
      updateFormulaHighlights(nextValue);
      requestAnimationFrame(() => editInputRef.current?.focus());
      return;
    }

    if (editing) commitEditing();

    const point = { row, col };
    if (event.shiftKey) {
      setSelection({ anchor: selectionRef.current.anchor, focus: point }, point);
      return;
    }

    setIsSelecting(true);
    setSelection({ anchor: point, focus: point }, point);
  }, [commitEditing, setSelection, updateFormulaHighlights]);

  const handleCellMouseEnter = useCallback((row: number, col: number) => {
    const point = { row, col };
    if (fillAnchor) {
      setFillRange({ anchor: fillAnchor.anchor, focus: point });
      return;
    }
    if (!isSelecting) return;
    setSelection({ anchor: selectionRef.current.anchor, focus: point }, point);
  }, [fillAnchor, isSelecting, setSelection]);

  const clearRange = useCallback((range = selectionRef.current) => {
    const rect = normalizeRange(range);
    const updates: BatchUpdate[] = [];
    for (let row = rect.minRow; row <= rect.maxRow; row++) {
      for (let col = rect.minCol; col <= rect.maxCol; col++) {
        updates.push({ row, col, value: '', formula: '', format: {}, replaceFormat: true });
      }
    }
    commitBatch(updates);
  }, [commitBatch]);

  const applyFormat = useCallback((partial: CellFormat) => {
    const rect = normalizeRange(selectionRef.current);
    const updates: BatchUpdate[] = [];
    for (let row = rect.minRow; row <= rect.maxRow; row++) {
      for (let col = rect.minCol; col <= rect.maxCol; col++) {
        const cell = getRawCell(row, col);
        updates.push({ row, col, format: compactFormat({ ...cell.format, ...partial }), replaceFormat: true });
      }
    }
    commitBatch(updates);
  }, [commitBatch, getRawCell]);

  const toggleBold = () => applyFormat({ bold: !selectedRawCell.format?.bold });
  const toggleItalic = () => applyFormat({ italic: !selectedRawCell.format?.italic });
  const setAlign = (align: 'left' | 'center' | 'right') => applyFormat({ align });
  const setNumberFormat = (numberFormat: CellFormat['numberFormat']) => applyFormat({ numberFormat });

  const applyBorder = (style: 'all' | 'outer' | 'bottom' | 'right' | 'none', color = '#3a3a3a') => {
    const rect = normalizeRange(selectionRef.current);
    const updates: BatchUpdate[] = [];
    const border = `1px solid ${color}`;
    const thick = `2px solid ${color}`;

    for (let row = rect.minRow; row <= rect.maxRow; row++) {
      for (let col = rect.minCol; col <= rect.maxCol; col++) {
        const next = { ...(getRawCell(row, col).format || {}) };
        if (style === 'none') {
          next.borderTop = undefined;
          next.borderRight = undefined;
          next.borderBottom = undefined;
          next.borderLeft = undefined;
        } else if (style === 'all') {
          next.borderTop = border;
          next.borderRight = border;
          next.borderBottom = border;
          next.borderLeft = border;
        } else if (style === 'outer') {
          if (row === rect.minRow) next.borderTop = thick;
          if (row === rect.maxRow) next.borderBottom = thick;
          if (col === rect.minCol) next.borderLeft = thick;
          if (col === rect.maxCol) next.borderRight = thick;
        } else if (style === 'bottom') {
          next.borderBottom = thick;
        } else if (style === 'right') {
          next.borderRight = thick;
        }
        updates.push({ row, col, format: compactFormat(next), replaceFormat: true });
      }
    }
    commitBatch(updates);
    setShowBorderPicker(false);
  };

  const copyRangeToText = useCallback((range = selectionRef.current) => {
    const rect = normalizeRange(range);
    const rows: string[] = [];
    const copiedCells: Cell[][] = [];
    for (let row = rect.minRow; row <= rect.maxRow; row++) {
      const rowValues: string[] = [];
      const rowCells: Cell[] = [];
      for (let col = rect.minCol; col <= rect.maxCol; col++) {
        const cell = getRawCell(row, col);
        rowValues.push(cell.formula || cell.value || '');
        rowCells.push(cloneCell(cell));
      }
      rows.push(rowValues.join('\t'));
      copiedCells.push(rowCells);
    }
    internalClipboardRef.current = { range, cells: copiedCells };
    setCopiedRange(range);
    return rows.join('\n');
  }, [getRawCell]);

  const pasteText = useCallback((text: string) => {
    const matrix = text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .split('\n')
      .filter((line, index, all) => index < all.length - 1 || line.length > 0)
      .map((line) => line.split('\t'));

    if (matrix.length === 0) return;

    const start = selectedCellRef.current;
    const neededRows = start.row + matrix.length;
    const neededCols = start.col + Math.max(...matrix.map((row) => row.length));
    if (onResize && (neededRows > dataRef.current.rows || neededCols > dataRef.current.cols)) {
      onResize(Math.max(dataRef.current.rows, neededRows), Math.max(dataRef.current.cols, neededCols));
    }

    const internal = internalClipboardRef.current;
    const sourceRect = internal ? normalizeRange(internal.range) : null;
    const updates: BatchUpdate[] = [];

    matrix.forEach((rowValues, rowOffset) => {
      rowValues.forEach((rawValue, colOffset) => {
        const target = { row: start.row + rowOffset, col: start.col + colOffset };
        const sourceCell = internal?.cells[rowOffset % internal.cells.length]?.[colOffset % internal.cells[0].length];
        const formula = sourceCell?.formula
          ? adjustFormulaReferences(sourceCell.formula, target.row - (sourceRect?.minRow ?? target.row), target.col - (sourceRect?.minCol ?? target.col))
          : (isFormula(rawValue) ? rawValue : undefined);
        const value = formula ? evaluateFormula(formula, dataRef.current.cells, new Set([getCellKey(target.row, target.col)])) : rawValue;
        updates.push({
          row: target.row,
          col: target.col,
          value,
          formula: formula || '',
          format: sourceCell?.format ? { ...sourceCell.format } : undefined,
        });
      });
    });

    commitBatch(updates);
    const focus = { row: start.row + matrix.length - 1, col: start.col + matrix[0].length - 1 };
    setSelection({ anchor: start, focus }, focus);
  }, [commitBatch, onResize, setSelection]);

  const applyFill = useCallback(() => {
    if (!fillAnchor || !fillRange) return;
    const sourceRect = normalizeRange(fillAnchor);
    const targetRect = normalizeRange(fillRange);
    const updates: BatchUpdate[] = [];

    for (let row = targetRect.minRow; row <= targetRect.maxRow; row++) {
      for (let col = targetRect.minCol; col <= targetRect.maxCol; col++) {
        if (isPointInRect({ row, col }, sourceRect)) continue;
        const sourceRow = sourceRect.minRow + ((row - targetRect.minRow) % (sourceRect.maxRow - sourceRect.minRow + 1));
        const sourceCol = sourceRect.minCol + ((col - targetRect.minCol) % (sourceRect.maxCol - sourceRect.minCol + 1));
        const source = cloneCell(getRawCell(sourceRow, sourceCol));
        const rowOffset = row - sourceRow;
        const colOffset = col - sourceCol;
        const formula = source.formula ? adjustFormulaReferences(source.formula, rowOffset, colOffset) : undefined;
        updates.push({
          row,
          col,
          value: formula ? evaluateFormula(formula, dataRef.current.cells, new Set([getCellKey(row, col)])) : source.value,
          formula: formula || '',
          format: source.format,
        });
      }
    }

    commitBatch(updates);
    setSelection(fillRange, fillRange.focus);
    setFillAnchor(null);
    setFillRange(null);
  }, [commitBatch, fillAnchor, fillRange, getRawCell, setSelection]);

  const insertTable = () => {
    const start = selectedCellRef.current;
    const rows = Math.max(1, tableRows);
    const cols = Math.max(1, tableCols);
    const updates: BatchUpdate[] = [];

    if (onResize && (start.row + rows > data.rows || start.col + cols > data.cols)) {
      onResize(Math.max(data.rows, start.row + rows), Math.max(data.cols, start.col + cols));
    }

    for (let rowOffset = 0; rowOffset < rows; rowOffset++) {
      for (let colOffset = 0; colOffset < cols; colOffset++) {
        const row = start.row + rowOffset;
        const col = start.col + colOffset;
        const isHeader = rowOffset === 0;
        updates.push({
          row,
          col,
          value: isHeader ? `Header ${colOffset + 1}` : '',
          formula: '',
          format: {
            bold: isHeader,
            align: isHeader ? 'center' : 'left',
            backgroundColor: isHeader ? '#173923' : rowOffset % 2 === 0 ? '#202020' : '#181818',
            textColor: isHeader ? '#86efac' : '#e5e7eb',
            borderTop: rowOffset === 0 ? '2px solid #22c55e' : '1px solid #3a3a3a',
            borderBottom: rowOffset === rows - 1 ? '2px solid #3a3a3a' : '1px solid #3a3a3a',
            borderLeft: colOffset === 0 ? '2px solid #3a3a3a' : '1px solid #3a3a3a',
            borderRight: colOffset === cols - 1 ? '2px solid #3a3a3a' : '1px solid #3a3a3a',
          },
        });
      }
    }

    commitBatch(updates);
    setSelection({ anchor: start, focus: { row: start.row + rows - 1, col: start.col + cols - 1 } });
  };

  const handleEditKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      commitEditing();
      moveSelection(1, 0, false);
    } else if (event.key === 'Tab') {
      event.preventDefault();
      commitEditing();
      moveSelection(0, event.shiftKey ? -1 : 1, false);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      cancelEditing();
    }
  };

  const handleFormulaBarChange = (value: string) => {
    const point = editingCellRef.current || selectedCellRef.current;
    if (!editingCellRef.current) {
      editingCellRef.current = point;
      setCellEditorAutoFocus(false);
      setEditingCell(point);
    }
    setEditValue(value);
    editValueRef.current = value;
    updateFormulaHighlights(value);
  };

  useEffect(() => {
    if (!editingCell) {
      const cell = getRawCell(selectedCell.row, selectedCell.col);
      setEditValue(cell.formula || cell.value || '');
      editValueRef.current = cell.formula || cell.value || '';
      setFormulaHighlightCells(new Set());
    }
  }, [editingCell, getRawCell, selectedCell]);

  useEffect(() => {
    const handleMouseUp = () => {
      setIsSelecting(false);
      if (fillAnchor && fillRange) applyFill();
      else {
        setFillAnchor(null);
        setFillRange(null);
      }
    };

    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [applyFill, fillAnchor, fillRange]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const root = rootRef.current;
      if (!root) return;
      const active = document.activeElement;
      const isInsideSheet = active === root || (active instanceof Node && root.contains(active));
      if (!isInsideSheet || editingCellRef.current) return;
      if (active === formulaBarRef.current) return;
      if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) return;

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        moveSelection(-1, 0, event.shiftKey);
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        moveSelection(1, 0, event.shiftKey);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        moveSelection(0, -1, event.shiftKey);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        moveSelection(0, 1, event.shiftKey);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        startEditing(selectedCellRef.current);
      } else if (event.key === 'Tab') {
        event.preventDefault();
        moveSelection(0, event.shiftKey ? -1 : 1, false);
      } else if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        clearRange();
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a') {
        event.preventDefault();
        setSelection({ anchor: { row: 0, col: 0 }, focus: { row: dataRef.current.rows - 1, col: dataRef.current.cols - 1 } });
      } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        startEditing(selectedCellRef.current, event.key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [clearRange, moveSelection, setSelection, startEditing]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const handleCopy = (event: ClipboardEvent) => {
      if (document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement) return;
      const text = copyRangeToText();
      event.clipboardData?.setData('text/plain', text);
      event.preventDefault();
    };

    const handleCut = (event: ClipboardEvent) => {
      if (document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement) return;
      const text = copyRangeToText();
      event.clipboardData?.setData('text/plain', text);
      event.preventDefault();
      clearRange();
    };

    const handlePaste = (event: ClipboardEvent) => {
      if (document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement) return;
      const text = event.clipboardData?.getData('text/plain') || '';
      if (!text) return;
      event.preventDefault();
      pasteText(text);
    };

    root.addEventListener('copy', handleCopy);
    root.addEventListener('cut', handleCut);
    root.addEventListener('paste', handlePaste);
    return () => {
      root.removeEventListener('copy', handleCopy);
      root.removeEventListener('cut', handleCut);
      root.removeEventListener('paste', handlePaste);
    };
  }, [clearRange, copyRangeToText, pasteText]);

  useEffect(() => {
    const handleMove = (event: MouseEvent) => {
      const resize = resizingRef.current;
      if (!resize) return;

      if (resize.type === 'col') {
        const width = Math.max(64, resize.size + event.clientX - resize.start);
        setColumnWidths((prev) => ({ ...prev, [resize.index]: width }));
      } else {
        const height = Math.max(24, resize.size + event.clientY - resize.start);
        setRowHeights((prev) => ({ ...prev, [resize.index]: height }));
      }
    };

    const handleUp = () => {
      resizingRef.current = null;
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, []);

  const renderColorPicker = (type: 'background' | 'text') => (
    <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-md border border-[#3a3a3a] bg-[#222222] p-3 shadow-xl">
      <div className="mb-2 grid grid-cols-7 gap-1">
        {PRESET_COLORS.map((color) => (
          <button
            key={`${type}-${color}`}
            type="button"
            onClick={() => {
              applyFormat(type === 'background' ? { backgroundColor: color } : { textColor: color });
              setShowBackgroundPicker(false);
              setShowTextPicker(false);
            }}
            className="h-6 w-6 rounded border border-[#555555] transition hover:scale-110 hover:border-white"
            style={{ backgroundColor: color }}
            aria-label={`Set ${type} color ${color}`}
          />
        ))}
      </div>
      <button
        type="button"
        onClick={() => {
          applyFormat(type === 'background' ? { backgroundColor: undefined } : { textColor: undefined });
          setShowBackgroundPicker(false);
          setShowTextPicker(false);
        }}
        className="w-full rounded px-2 py-1 text-left text-xs text-gray-400 hover:bg-[#303030] hover:text-gray-200"
      >
        Clear
      </button>
    </div>
  );

  return (
    <div
      ref={rootRef}
      tabIndex={0}
      className="flex h-full min-h-0 flex-col overflow-hidden bg-[#1a1a1a] text-gray-200 outline-none"
    >
      <div className="flex shrink-0 flex-wrap items-center gap-1 border-b border-[#333333] bg-[#242424] p-2 text-xs">
        <button type="button" onClick={toggleBold} className={cn('rounded p-2 hover:bg-[#333333]', selectedRawCell.format?.bold && 'bg-[#3a3a3a]')} title="Bold" aria-label="Bold">
          <Bold className="h-4 w-4" />
        </button>
        <button type="button" onClick={toggleItalic} className={cn('rounded p-2 hover:bg-[#333333]', selectedRawCell.format?.italic && 'bg-[#3a3a3a]')} title="Italic" aria-label="Italic">
          <Italic className="h-4 w-4" />
        </button>
        <div className="mx-1 h-6 w-px bg-[#3a3a3a]" />
        <button type="button" onClick={() => setAlign('left')} className="rounded p-2 hover:bg-[#333333]" title="Align left" aria-label="Align left"><AlignLeft className="h-4 w-4" /></button>
        <button type="button" onClick={() => setAlign('center')} className="rounded p-2 hover:bg-[#333333]" title="Align center" aria-label="Align center"><AlignCenter className="h-4 w-4" /></button>
        <button type="button" onClick={() => setAlign('right')} className="rounded p-2 hover:bg-[#333333]" title="Align right" aria-label="Align right"><AlignRight className="h-4 w-4" /></button>
        <div className="mx-1 h-6 w-px bg-[#3a3a3a]" />

        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowBackgroundPicker((open) => !open);
              setShowTextPicker(false);
              setShowBorderPicker(false);
            }}
            className="rounded p-2 hover:bg-[#333333]"
            title="Cell color"
            aria-label="Cell color"
          >
            <PaintBucket className="h-4 w-4" />
          </button>
          {showBackgroundPicker && renderColorPicker('background')}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowTextPicker((open) => !open);
              setShowBackgroundPicker(false);
              setShowBorderPicker(false);
            }}
            className="rounded p-2 hover:bg-[#333333]"
            title="Text color"
            aria-label="Text color"
          >
            <Type className="h-4 w-4" />
          </button>
          {showTextPicker && renderColorPicker('text')}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowBorderPicker((open) => !open);
              setShowBackgroundPicker(false);
              setShowTextPicker(false);
            }}
            className="rounded p-2 hover:bg-[#333333]"
            title="Borders"
            aria-label="Borders"
          >
            <Grid3x3 className="h-4 w-4" />
          </button>
          {showBorderPicker && (
            <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-md border border-[#3a3a3a] bg-[#222222] p-2 shadow-xl">
              {(['all', 'outer', 'bottom', 'right', 'none'] as const).map((style) => (
                <button
                  key={style}
                  type="button"
                  onClick={() => applyBorder(style)}
                  className="block w-full rounded px-2 py-1.5 text-left text-xs capitalize hover:bg-[#303030]"
                >
                  {style === 'none' ? 'Clear borders' : `${style} borders`}
                </button>
              ))}
              <div className="mt-2 grid grid-cols-8 gap-1 border-t border-[#333333] pt-2">
                {BORDER_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => applyBorder('all', color)}
                    className="h-5 w-5 rounded border border-[#555555]"
                    style={{ backgroundColor: color }}
                    aria-label={`Set border color ${color}`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mx-1 h-6 w-px bg-[#3a3a3a]" />
        <button type="button" onClick={() => setNumberFormat('number')} className="rounded p-2 hover:bg-[#333333]" title="Number" aria-label="Number format"><Hash className="h-4 w-4" /></button>
        <button type="button" onClick={() => setNumberFormat('currency')} className="rounded p-2 hover:bg-[#333333]" title="Currency" aria-label="Currency format"><DollarSign className="h-4 w-4" /></button>
        <button type="button" onClick={() => setNumberFormat('percent')} className="rounded p-2 hover:bg-[#333333]" title="Percent" aria-label="Percent format"><Percent className="h-4 w-4" /></button>

        <div className="mx-1 h-6 w-px bg-[#3a3a3a]" />
        <div className="flex items-center gap-1 rounded border border-[#333333] bg-[#1a1a1a] px-2 py-1">
          <Table2 className="h-4 w-4 text-gray-400" />
          <input
            id="spreadsheet-table-rows"
            name="spreadsheetTableRows"
            value={tableRows}
            onChange={(e) => setTableRows(Math.max(1, Number(e.target.value) || 1))}
            className="w-10 bg-transparent text-center outline-none"
            type="number"
            min={1}
            aria-label="Table rows"
          />
          <span className="text-gray-400">x</span>
          <input
            id="spreadsheet-table-columns"
            name="spreadsheetTableColumns"
            value={tableCols}
            onChange={(e) => setTableCols(Math.max(1, Number(e.target.value) || 1))}
            className="w-10 bg-transparent text-center outline-none"
            type="number"
            min={1}
            aria-label="Table columns"
          />
          <button type="button" onClick={insertTable} className="rounded px-2 py-1 hover:bg-[#333333]">Insert</button>
        </div>

        <div className="ml-auto flex gap-1">
          <button type="button" onClick={() => onResize?.(data.rows, data.cols + 5)} className="inline-flex items-center gap-1 rounded px-2 py-2 hover:bg-[#333333]">
            <Plus className="h-3.5 w-3.5" /> Col
          </button>
          <button type="button" onClick={() => onResize?.(data.rows + 10, data.cols)} className="inline-flex items-center gap-1 rounded px-2 py-2 hover:bg-[#333333]">
            <Plus className="h-3.5 w-3.5" /> Row
          </button>
        </div>
      </div>

      <div className="flex h-8 shrink-0 items-center border-b border-[#333333] bg-[#202020] text-xs">
        <div className="flex h-full w-20 shrink-0 items-center justify-center border-r border-[#333333] font-mono text-gray-400">
          {activeLabel}
        </div>
        <div className="flex h-full w-9 shrink-0 items-center justify-center border-r border-[#333333] italic text-gray-400">
          fx
        </div>
        <input
          id="spreadsheet-formula-bar"
          name="spreadsheetFormula"
          ref={formulaBarRef}
          value={editingCell ? editValue : selectedRawCell.formula || selectedRawCell.value || ''}
          onFocus={() => {
            const point = selectedCellRef.current;
            const cell = getRawCell(point.row, point.col);
            const value = cell.formula || cell.value || '';
            setEditValue(value);
            editValueRef.current = value;
            updateFormulaHighlights(value);
          }}
          onChange={(event) => handleFormulaBarChange(event.target.value)}
          onKeyDown={handleEditKeyDown}
          onBlur={() => {
            if (editingCellRef.current && document.activeElement !== editInputRef.current) commitEditing();
          }}
          className="h-full min-w-0 flex-1 bg-[#151515] px-3 font-mono text-gray-200 outline-none"
          placeholder="Enter a value or formula, for example =SUM(A1:A4)"
          aria-label="Spreadsheet formula bar"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-auto overscroll-contain">
        <table className="border-collapse bg-[#1a1a1a]" style={{ minWidth: ROW_HEADER_WIDTH + data.cols * DEFAULT_CELL_WIDTH }}>
          <thead className="sticky top-0 z-20">
            <tr>
              <th className="sticky left-0 z-30 h-7 border-b border-r border-[#333333] bg-[#202020]" style={{ width: ROW_HEADER_WIDTH, minWidth: ROW_HEADER_WIDTH }} />
              {Array.from({ length: data.cols }).map((_, col) => {
                const width = columnWidths[col] || DEFAULT_CELL_WIDTH;
                return (
                  <th
                    key={col}
                    className="relative h-7 border-b border-r border-[#333333] bg-[#202020] text-center text-[11px] font-medium text-gray-400"
                    style={{ width, minWidth: width }}
                  >
                    {getColumnLetter(col)}
                    <span
                      className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-green-500"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        resizingRef.current = { type: 'col', index: col, start: event.clientX, size: width };
                      }}
                    />
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: data.rows }).map((_, row) => {
              const height = rowHeights[row] || DEFAULT_CELL_HEIGHT;
              return (
                <tr key={row}>
                  <th
                    className="sticky left-0 z-10 border-b border-r border-[#333333] bg-[#202020] text-center text-[11px] font-medium text-gray-400 relative"
                    style={{ width: ROW_HEADER_WIDTH, minWidth: ROW_HEADER_WIDTH, height }}
                  >
                    {row + 1}
                    <span
                      className="absolute bottom-0 left-0 h-1 w-full cursor-row-resize hover:bg-green-500"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        resizingRef.current = { type: 'row', index: row, start: event.clientY, size: height };
                      }}
                    />
                  </th>
                  {Array.from({ length: data.cols }).map((_, col) => {
                    const point = { row, col };
                    const key = getCellKey(row, col);
                    const cell = evaluatedCells[key] || getRawCell(row, col);
                    const selected = selectedCell.row === row && selectedCell.col === col;
                    const inRange = isPointInRect(point, activeRect);
                    const copied = copiedRange ? isPointInRect(point, normalizeRange(copiedRange)) : false;
                    const formulaHighlighted = formulaHighlightCells.has(key);
                    const editing = editingCell?.row === row && editingCell.col === col;
                    const inFill = fillRect ? isPointInRect(point, fillRect) : false;
                    const showFillHandle =
                      !editingCell &&
                      row === activeRect.maxRow &&
                      col === activeRect.maxCol;

                    return (
                      <SpreadsheetCell
                        key={key}
                        row={row}
                        col={col}
                        cell={cell}
                        width={columnWidths[col] || DEFAULT_CELL_WIDTH}
                        height={height}
                        selected={selected}
                        inRange={inRange || inFill}
                        copied={copied}
                        formulaHighlighted={formulaHighlighted}
                        editing={editing}
                        editValue={editing ? editValue : ''}
                        onMouseDown={handleCellMouseDown}
                        onMouseEnter={handleCellMouseEnter}
                        onDoubleClick={(r, c) => startEditing({ row: r, col: c })}
                        onEditChange={handleEditChange}
                        onEditKeyDown={handleEditKeyDown}
                        onEditBlur={commitEditing}
                        showFillHandle={showFillHandle}
                        autoFocusEditor={editing && cellEditorAutoFocus}
                        onFillStart={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          setFillAnchor(selectionRef.current);
                          setFillRange(selectionRef.current);
                        }}
                        editInputRef={editInputRef}
                      />
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>

      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-[#333333] bg-[#202020] px-3 py-1 text-[11px] text-gray-400">
        <div className="flex flex-wrap gap-3">
          <span>{data.rows} x {data.cols}</span>
          <span>{activeLabel}</span>
          {copiedRange && <span className="text-green-400">Clipboard ready</span>}
          {editingCell && editValue.startsWith('=') && <span className="text-blue-400">Formula mode: click a cell to insert its reference</span>}
        </div>
        <div className="hidden gap-3 md:flex">
          <span>Enter edit/save</span>
          <span>Shift+Arrows select</span>
          <span>Ctrl+C/V/X</span>
          <span>Delete clear</span>
        </div>
      </div>
    </div>
  );
};
