"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * The Apple Messages (iMessage) mark, recreated as crisp vector: a green-gradient
 * squircle with a white speech bubble. Used as a quick reminder glyph next to the
 * actions a guest can text. The gradient id comes from `useId` so multiple icons on
 * one page never collide (colons stripped so the `url(#id)` reference stays valid).
 */
export function IMessageIcon({ size = 24, className }: { size?: number; className?: string }) {
  const gradId = `imsg-${useId().replace(/:/g, "")}`;
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-label="iMessage"
      className={cn("shrink-0", className)}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5BF677" />
          <stop offset="1" stopColor="#19D13C" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="100" height="100" rx="22.5" ry="22.5" fill={`url(#${gradId})`} />
      <path
        fill="#ffffff"
        d="M50 17C68.5 17 83 29.5 83 45C83 60.5 68.5 73 50 73C46.3 73 42.8 72.6 39.5 71.9C34.8 77 28.3 80.4 21.5 81.2C20 81.4 19 79.8 19.9 78.5C22 75.5 23.8 72.2 24.2 68.8C17.8 63.6 14 54.9 14 45C14 29.5 31.5 17 50 17Z"
      />
    </svg>
  );
}
