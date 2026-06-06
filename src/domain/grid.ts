/** Pure grid-layout math for the projection board (no DOM, so it stays unit-testable). */

export interface GridCell {
  /** Target minimum width of one cell, in px. */
  width: number;
  /** Target minimum height of one cell, in px. */
  height: number;
  /** Gap between cells, in px. */
  gap: number;
}

export interface GridFit {
  cols: number;
  rows: number;
  capacity: number;
}

/**
 * How many `cell`-sized items fit inside a `width` x `height` box laid out as a
 * gap-separated grid. Returns zeros for an unmeasured (non-positive) box so callers can
 * treat "0 capacity" as "not measured yet".
 */
export function gridFit(width: number, height: number, cell: GridCell): GridFit {
  if (width <= 0 || height <= 0) return { cols: 0, rows: 0, capacity: 0 };
  const cols = Math.max(1, Math.floor((width + cell.gap) / (cell.width + cell.gap)));
  const rows = Math.max(1, Math.floor((height + cell.gap) / (cell.height + cell.gap)));
  return { cols, rows, capacity: cols * rows };
}

/**
 * Balance `cells` items across the fewest rows that fit within `maxCols`, then spread them
 * as evenly as possible so each row is full. Returns the column count to render with; a
 * handful of tiles then stretch to fill one wide row instead of huddling on the left.
 */
export function balancedCols(cells: number, maxCols: number): number {
  if (cells <= 0 || maxCols <= 0) return 1;
  const rows = Math.max(1, Math.ceil(cells / maxCols));
  return Math.max(1, Math.ceil(cells / rows));
}

/**
 * Column span for item `index` so the final, partial row of a `count`-item, `cols`-wide
 * grid stretches to fill the row: a perfect rectangle with no orphan poking out. Full rows
 * return 1; trailing items share the row's columns as evenly as possible.
 */
export function lastRowColSpan(index: number, count: number, cols: number): number {
  if (cols <= 1) return 1;
  const remainder = count % cols;
  if (remainder === 0) return 1;
  const lastRowStart = count - remainder;
  if (index < lastRowStart) return 1;
  const base = Math.floor(cols / remainder);
  const extra = cols % remainder;
  const pos = index - lastRowStart;
  return base + (pos < extra ? 1 : 0);
}
