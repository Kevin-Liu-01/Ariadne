"use client";

import { Shader } from "shaders/react";
import { SCENE_BY_NAME, ZERO_LEVELS, renderScene } from "@/app/visuals/scenes";
import { cn } from "@/lib/utils";

/**
 * One ambient shaders.com scene painted full-bleed behind projection content. It runs
 * at zero audio (calm base motion, no mic) and drops the Dedalus mark so foreground
 * text stays legible. Mounted client-only by `ShaderBackdrop`.
 */
export function ShaderBackdropInner({ sceneName, className }: { sceneName: string; className?: string }) {
  const scene = SCENE_BY_NAME[sceneName] ?? Object.values(SCENE_BY_NAME)[0];
  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden>
      <Shader disableTelemetry className="block h-full w-full" style={{ width: "100%", height: "100%" }}>
        {renderScene(scene, ZERO_LEVELS, false)}
      </Shader>
    </div>
  );
}
