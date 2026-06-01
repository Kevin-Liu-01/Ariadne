"use client";

import { Trash2, X } from "lucide-react";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Shared operator edit dialog. Hosts an editor form plus a consistent footer with
 * save, cancel, and an optional delete. Closes on backdrop click or Escape.
 */
export function OperatorEditModal({
  title,
  subtitle,
  onClose,
  onSave,
  onDelete,
  saving = false,
  saveLabel = "save",
  deleteLabel = "delete",
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  onSave?: () => void;
  onDelete?: () => void;
  saving?: boolean;
  saveLabel?: string;
  deleteLabel?: string;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-nyx/80 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className="flex max-h-[88vh] w-full max-w-lg flex-col border border-nyx-line bg-nyx-soft shadow-2xl animate-rise"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4 border-b border-nyx-line p-5">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold tracking-tight text-cloud">{title}</h2>
            {subtitle ? <p className="mt-0.5 truncate text-xs text-ash">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="close"
            className="shrink-0 text-ash transition-colors hover:text-cloud"
          >
            <X className="h-5 w-5" strokeWidth={1.5} aria-hidden />
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-auto p-5">{children}</div>

        <footer className="flex items-center justify-between gap-3 border-t border-nyx-line p-4">
          {onDelete ? (
            <button
              type="button"
              onClick={onDelete}
              disabled={saving}
              className="flex items-center gap-1.5 border border-gem-garnet/50 px-3 py-2 text-xs uppercase tracking-widest text-gem-garnet transition-colors hover:bg-gem-garnet/10 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
              {deleteLabel}
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-xs uppercase tracking-widest text-ash transition-colors hover:text-cloud"
            >
              cancel
            </button>
            {onSave ? (
              <button
                type="button"
                onClick={onSave}
                disabled={saving}
                className={cn(
                  "bg-helio px-4 py-2 text-xs font-medium uppercase tracking-widest text-nyx transition-opacity",
                  saving && "opacity-60",
                )}
              >
                {saving ? "saving" : saveLabel}
              </button>
            ) : null}
          </div>
        </footer>
      </div>
    </div>
  );
}
