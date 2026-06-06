"use client";

import { useEffect, useState, type RefObject } from "react";
import { type GridCell, type GridFit, gridFit } from "@/domain/grid";

/**
 * Measures `ref`'s box and reports how many `cell`-sized items fit as a grid, recomputing
 * on resize. Returns zero capacity until the first measurement, so callers can fall back to
 * a CSS auto-fit layout for the first paint. The box must size itself independently of its
 * content (e.g. a flex child with `overflow-hidden`) or the measurement will feed back.
 */
export function useGridFit(ref: RefObject<HTMLElement | null>, cell: GridCell): GridFit {
  const [fit, setFit] = useState<GridFit>({ cols: 0, rows: 0, capacity: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      setFit((prev) => {
        const next = gridFit(rect.width, rect.height, cell);
        if (next.cols === prev.cols && next.rows === prev.rows) return prev;
        return next;
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, cell.width, cell.height, cell.gap]);

  return fit;
}
