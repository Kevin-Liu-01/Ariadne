/**
 * Regenerate app icons from labyrinth-mark-paths so favicon and PNG exports stay in sync.
 *
 * Usage: pnpm exec tsx scripts/generate-mark-icons.ts
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { LABYRINTH_WALLS, labyrinthThreadPath } from "../src/components/labyrinth-mark-paths";

const ROOT = join(import.meta.dirname, "..");
const APP = join(ROOT, "src/app");

const HELIO = "#d2beff";
const ASH = "#8a8a8a";
const NYX = "#0f0f0f";

function markSvg(size = 100): string {
  const walls = LABYRINTH_WALLS.map((d) => `<path d="${d}"/>`).join("\n    ");
  const thread = labyrinthThreadPath();

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}">
  <rect width="100" height="100" fill="${NYX}"/>
  <g fill="none" stroke="${ASH}" stroke-opacity="0.45" stroke-width="1.4" stroke-linecap="round">
    ${walls}
  </g>
  <path
    d="${thread}"
    fill="none"
    stroke="${HELIO}"
    stroke-width="2.4"
    stroke-linecap="round"
    stroke-linejoin="round"
  />
  <circle cx="50" cy="50" r="3.4" fill="${HELIO}"/>
</svg>`;
}

async function writePng(name: string, px: number): Promise<void> {
  const svg = markSvg(px);
  await sharp(Buffer.from(svg)).resize(px, px).png().toFile(join(APP, name));
}

async function main(): Promise<void> {
  const svg = markSvg();
  writeFileSync(join(APP, "icon.svg"), `${svg}\n`, "utf8");
  writeFileSync(join(ROOT, "public/brand/ariadne-icon.svg"), `${svg}\n`, "utf8");

  await writePng("icon.png", 512);
  await writePng("apple-icon.png", 180);

  console.log("Wrote icon.svg, icon.png, apple-icon.png, public/brand/ariadne-icon.svg");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
