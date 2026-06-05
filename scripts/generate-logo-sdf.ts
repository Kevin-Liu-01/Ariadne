/**
 * Bake a signed distance field (SDF) of the Dedalus wing mark for the Glass shader.
 *
 * The venue visuals dome the logo into 3D glass via `Glass shapeSdfUrl=...` (see
 * src/app/visuals/scenes.tsx). That prop wants a 512x512 grid of float32 signed
 * distances (inside the shape is negative, outside positive, in UV units) — the
 * `shaders` loader reads it raw. The previously committed .bin encoded three
 * ellipse blobs, so the glass carved lozenges and chopped the wings. This script
 * regenerates the field straight from public/brand/dedalus-mark.svg so each wing
 * carves as its own shape and the .bin is reproducible.
 *
 * Usage: pnpm exec tsx scripts/generate-logo-sdf.ts
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const ROOT = join(import.meta.dirname, "..");
const SVG_PATH = join(ROOT, "public/brand/dedalus-mark.svg");
const OUT_PATH = join(ROOT, "public/brand/dedalus-logo-sdf.bin");

/** Texture resolution the `shaders` Glass SDF sampler expects (512x512 float32). */
const SDF_SIZE = 512;
/** Supersample factor: rasterize the mark larger, then box-downsample for clean edges. */
const SS = 3;
const RASTER = SDF_SIZE * SS;
/** Sentinel "no feature here yet" distance for the EDT seed grids. */
const INF = 1e20;
/**
 * The `shaders` Glass samples this DataTexture so that file row 0 lands at the TOP of
 * the screen (matching the upright logo ImageTexture it carves). The rasterizer also
 * emits row 0 at the top, so no vertical flip is needed. Verified against the live
 * /visuals dome — flipping rows here renders the wing upside down.
 */
const FLIP_Y = false;

/** Rasterize the mark to a crisp binary mask (true = inside the wings). */
async function rasterizeMask(): Promise<boolean[]> {
  const { data } = await sharp(SVG_PATH, { density: 300 })
    .resize(RASTER, RASTER, { fit: "fill" })
    .flatten({ background: "#000000" })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const mask = new Array<boolean>(SDF_SIZE * SDF_SIZE);
  const half = (SS * SS) / 2;
  for (let y = 0; y < SDF_SIZE; y++) {
    for (let x = 0; x < SDF_SIZE; x++) {
      let lit = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const rx = x * SS + sx;
          const ry = y * SS + sy;
          if (data[ry * RASTER + rx] > 127) lit++;
        }
      }
      mask[y * SDF_SIZE + x] = lit > half;
    }
  }
  return mask;
}

/** Felzenszwalb & Huttenlocher 1-D squared-distance transform of a single row/column. */
function edt1d(f: Float64Array, n: number): Float64Array {
  const d = new Float64Array(n);
  const v = new Int32Array(n);
  const z = new Float64Array(n + 1);
  let k = 0;
  v[0] = 0;
  z[0] = -INF;
  z[1] = INF;
  for (let q = 1; q < n; q++) {
    let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) {
      k--;
      s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    }
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = INF;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    const dx = q - v[k];
    d[q] = dx * dx + f[v[k]];
  }
  return d;
}

/** Exact 2-D squared Euclidean distance transform (separable: rows then columns). */
function edt2d(grid: Float64Array, w: number, h: number): Float64Array {
  const out = grid.slice();
  const row = new Float64Array(w);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) row[x] = out[y * w + x];
    const d = edt1d(row, w);
    for (let x = 0; x < w; x++) out[y * w + x] = d[x];
  }
  const col = new Float64Array(h);
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) col[y] = out[y * w + x];
    const d = edt1d(col, h);
    for (let y = 0; y < h; y++) out[y * w + x] = d[y];
  }
  return out;
}

/** Seed an EDT grid: 0 on the target set, INF elsewhere. */
function seed(mask: boolean[], target: boolean): Float64Array {
  const g = new Float64Array(mask.length);
  for (let i = 0; i < mask.length; i++) g[i] = mask[i] === target ? 0 : INF;
  return g;
}

/** Signed distance per pixel in UV units (negative inside, positive outside). */
function signedField(mask: boolean[]): Float32Array {
  const distToInside = edt2d(seed(mask, true), SDF_SIZE, SDF_SIZE);
  const distToOutside = edt2d(seed(mask, false), SDF_SIZE, SDF_SIZE);
  const field = new Float32Array(SDF_SIZE * SDF_SIZE);
  for (let i = 0; i < field.length; i++) {
    const px = mask[i] ? -Math.sqrt(distToOutside[i]) : Math.sqrt(distToInside[i]);
    field[i] = px / SDF_SIZE;
  }
  return field;
}

/** Pack the field into the row order three.js + screenUV expect, then to bytes. */
function packBin(field: Float32Array): Buffer {
  const out = new Float32Array(field.length);
  for (let y = 0; y < SDF_SIZE; y++) {
    const srcRow = FLIP_Y ? SDF_SIZE - 1 - y : y;
    for (let x = 0; x < SDF_SIZE; x++) {
      out[y * SDF_SIZE + x] = field[srcRow * SDF_SIZE + x];
    }
  }
  return Buffer.from(out.buffer);
}

async function main(): Promise<void> {
  const mask = await rasterizeMask();
  const inside = mask.reduce((n, m) => n + (m ? 1 : 0), 0);
  const field = signedField(mask);
  writeFileSync(OUT_PATH, packBin(field));

  let min = Infinity;
  let max = -Infinity;
  for (const v of field) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  console.log(
    `Wrote ${OUT_PATH}\n  ${SDF_SIZE}x${SDF_SIZE} float32 · inside ${(
      (100 * inside) /
      mask.length
    ).toFixed(1)}% · range [${min.toFixed(4)}, ${max.toFixed(4)}]`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
