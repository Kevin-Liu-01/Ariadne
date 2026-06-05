/**
 * Regenerate app icons + the saved-contact avatar from labyrinth-mark-paths so
 * the favicon, PNG exports, and vCard photo all stay in sync.
 *
 * Usage: pnpm generate:icons
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { labyrinthMarkSvg } from "../src/components/labyrinth-mark-paths";

const ROOT = join(import.meta.dirname, "..");
const APP = join(ROOT, "src/app");

/** Dark gray field behind the labyrinth mark on the saved-contact avatar. */
const CONTACT_BG = "#222226";

async function writeMarkPng(name: string, px: number): Promise<void> {
  const svg = labyrinthMarkSvg({ size: px });
  await sharp(Buffer.from(svg)).resize(px, px).png().toFile(join(APP, name));
}

/**
 * Contact photo: the mark on a dark gray field, padded so the iOS circular crop
 * keeps the outer ring. Kept to a thumbnail size and palette-quantized so the
 * base64 the vCard embeds stays small enough for the SMS/MMS fallback to carry
 * (a full 512px render bloats the card past ~50KB).
 */
async function writeContactAvatar(name: string, px: number): Promise<void> {
  const svg = labyrinthMarkSvg({ size: px, background: CONTACT_BG, wallOpacity: 0.6, scale: 0.78 });
  await sharp(Buffer.from(svg))
    .resize(px, px)
    .png({ palette: true, compressionLevel: 9 })
    .toFile(join(APP, name));
}

async function main(): Promise<void> {
  writeFileSync(join(ROOT, "public/brand/ariadne-icon.svg"), `${labyrinthMarkSvg()}\n`, "utf8");

  await writeMarkPng("icon.png", 512);
  await writeMarkPng("apple-icon.png", 180);
  // Contact thumbnail stays small so the embedded vCard photo survives MMS.
  await writeContactAvatar("contact-avatar.png", 256);

  console.log("Wrote icon.png, apple-icon.png, contact-avatar.png, public/brand/ariadne-icon.svg");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
