import { describe, expect, it } from "vitest";
import { balancedCols, gridFit, lastRowColSpan } from "@/domain/grid";

const CELL = { width: 160, height: 150, gap: 10 };

describe("gridFit", () => {
  it("counts how many cells fit across and down", () => {
    // cols: floor((1000+10)/170)=5; rows: floor((500+10)/160)=3.
    expect(gridFit(1000, 500, CELL)).toEqual({ cols: 5, rows: 3, capacity: 15 });
  });

  it("returns zeros for an unmeasured box so callers can detect 'not ready'", () => {
    expect(gridFit(0, 500, CELL)).toEqual({ cols: 0, rows: 0, capacity: 0 });
    expect(gridFit(1000, 0, CELL)).toEqual({ cols: 0, rows: 0, capacity: 0 });
  });

  it("always fits at least one cell in a positive box", () => {
    expect(gridFit(50, 50, CELL)).toEqual({ cols: 1, rows: 1, capacity: 1 });
  });
});

describe("balancedCols", () => {
  it("uses one wide row when everything fits across", () => {
    expect(balancedCols(4, 11)).toBe(4);
  });

  it("splits into even rows instead of one full row plus a sparse remainder", () => {
    // 15 across max 11 -> 2 rows -> 8 per row (8 + 7), not 11 + 4.
    expect(balancedCols(15, 11)).toBe(8);
  });

  it("uses the full width when the grid is packed", () => {
    expect(balancedCols(22, 11)).toBe(11);
  });

  it("never returns less than one", () => {
    expect(balancedCols(0, 11)).toBe(1);
  });
});

describe("lastRowColSpan", () => {
  it("keeps a span of 1 when the grid divides evenly", () => {
    expect([0, 1, 23].map((i) => lastRowColSpan(i, 24, 3))).toEqual([1, 1, 1]);
  });

  it("stretches a lone orphan across the whole last row", () => {
    // 25 items, 3 cols: items 0..23 normal, item 24 spans 3 -> perfect rectangle.
    expect(lastRowColSpan(23, 25, 3)).toBe(1);
    expect(lastRowColSpan(24, 25, 3)).toBe(3);
  });

  it("shares the last row between two trailing items", () => {
    // 26 items, 3 cols: last two (24,25) split the row 2 + 1.
    expect(lastRowColSpan(24, 26, 3)).toBe(2);
    expect(lastRowColSpan(25, 26, 3)).toBe(1);
  });

  it("is a no-op for a single column", () => {
    expect(lastRowColSpan(4, 5, 1)).toBe(1);
  });
});
