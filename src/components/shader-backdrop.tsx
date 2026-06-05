"use client";

import dynamic from "next/dynamic";
import { memo } from "react";

// Pixi/WebGL touch the DOM, so the shader canvas is client-only (no SSR).
const Inner = dynamic(
  () => import("@/components/shader-backdrop-inner").then((m) => m.ShaderBackdropInner),
  { ssr: false },
);

/**
 * Ambient shaders.com backdrop for projection surfaces. Memoized so the board's
 * frequent state polls never re-mount the canvas; it only changes when the scene
 * (and thus the chosen ambient look) changes. `className` carries the opacity.
 */
export const ShaderBackdrop = memo(function ShaderBackdrop({
  sceneName,
  className,
}: {
  sceneName: string;
  className?: string;
}) {
  return <Inner sceneName={sceneName} className={className} />;
});
