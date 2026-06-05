/**
 * The venue's shader scenes, built on the `shaders` (shaders.com) component library.
 * Each scene mirrors a shaders.com preset, recolored to the Dedalus palette (helio /
 * amethyst / cloud + gem accents on a near-black nyx ground, for high contrast on a
 * dark projection). Scalar (uniform) props are modulated by the live audio so the room
 * drives the visuals; structural props (pattern, waveType, shape, shapeSdfUrl) stay
 * static so a prop change never recompiles.
 *
 * The Dedalus mark is the actual logo SHAPE, not a square image: `logoGlass` refracts
 * the scene beneath it through the logo's wings via a pre-baked SDF (Glass.shapeSdfUrl),
 * so the effect lives inside each wing. The mark pulses with the beat. (The SDF is
 * hosted locally at /brand so the venue needs no network for it.)
 */

import type { ReactNode } from "react";
import {
  Ascii,
  Blob,
  ChromaFlow,
  ColorWheel,
  Dither,
  FilmGrain,
  FlowField,
  FlowingGradient,
  FlutedGlass,
  Glass,
  Godrays,
  Grid,
  GridDistortion,
  Halftone,
  ImageTexture,
  Paper,
  Pixelate,
  Plasma,
  SineWave,
  Smoke,
  SolidColor,
  Swirl,
  WaveDistortion,
} from "shaders/react";

/** Smoothed, normalized audio bands the scenes read (each ~0..1, may exceed 1 on peaks). */
export interface AudioLevels {
  level: number; // overall loudness
  bass: number; // low band (kick)
  mid: number; // mid band (leads)
  treble: number; // high band (shimmer)
  beat: number; // 1->0 decaying pulse on each kick (punchy)
}

export const ZERO_LEVELS: AudioLevels = { level: 0, bass: 0, mid: 0, treble: 0, beat: 0 };

/** Dedalus brand palette (mirrors the @theme tokens in globals.css). */
const BRAND = {
  nyx: "#0f0f0f", // near-black ground
  nyxViolet: "#160d28", // deep violet-black, the dark end of ramps
  helio: "#d2beff", // signature light purple
  amethyst: "#8b5cf6", // brand purple
  cloud: "#f5f5f5", // brand white
} as const;

/** Gem accents (the six color-wheel hues) for per-scene variety, still on-brand. */
const GEM = {
  garnet: "#e12d39", // red
  moonstone: "#ffd23f", // yellow
  peridot: "#43b049", // green
  aquamarine: "#2e86de", // blue
  topaz: "#fb8b24", // orange
} as const;

/** Pre-baked SDF of the Dedalus wing mark (hosted locally; powers Glass shape mode). */
const LOGO_SDF = "/brand/dedalus-logo-sdf.bin";
/** The actual Dedalus wing as a solid image (white on transparent) for the 3D glass to dome. */
const LOGO_IMAGE = "/brand/dedalus-mark.svg";

/**
 * The actual Dedalus mark, domed into 3D. The wing-shaped glass (SDF) refracts the real logo
 * IMAGE -- refraction is kept LOW so the wing stays clearly recognizable (high refraction turned
 * it into unreadable lens blobs), while high thickness + a tight specular highlight + fresnel rim
 * + chromatic aberration give it a raised, chrome 3D look. `cutout` keeps outside the wings
 * transparent so the background shows full-screen around it. Pulses on the beat.
 */
function logoEffect(a: AudioLevels): ReactNode {
  return (
    <Glass
      shapeSdfUrl={LOGO_SDF}
      cutout={true}
      scale={0.74 + a.beat * 0.05}
      refraction={0.06 + a.beat * 0.06}
      aberration={0.9 + a.treble * 0.6 + a.beat * 0.5}
      thickness={1.1}
      innerZoom={1}
      tintColor={BRAND.helio}
      tintIntensity={0.25}
      fresnel={0.45 + a.beat * 0.2}
      fresnelSoftness={0.3}
      fresnelColor={BRAND.helio}
      highlight={0.85}
      highlightColor={BRAND.cloud}
      highlightSoftness={0.22}
      lightAngle={300}
    >
      <ImageTexture url={LOGO_IMAGE} objectFit="contain" />
    </Glass>
  );
}

export interface Scene {
  name: string;
  /** The full-screen shader stack, WITHOUT the Dedalus mark (see `renderScene`). */
  background: (a: AudioLevels) => ReactNode;
}

/**
 * Compose a scene for a `<Shader>`: its background stack, optionally topped by the
 * Dedalus mark. The audio-reactive venue stage passes the mark; the calm projection
 * backdrops drop it (`withLogo={false}`) so text reads cleanly over the shader.
 */
export function renderScene(scene: Scene, a: AudioLevels, withLogo = true): ReactNode {
  return (
    <>
      {scene.background(a)}
      {withLogo ? logoEffect(a) : null}
    </>
  );
}

/** Pixel Beams: a plasma sliced into square beams, dithered to a helio/violet grid. */
function pixelBeams(a: AudioLevels): ReactNode {
  return (
    <Dither colorA={BRAND.nyxViolet} colorB={BRAND.helio} pattern="bayer8" pixelSize={7} threshold={0.41 - a.beat * 0.18}>
      <Plasma
        colorA={BRAND.cloud}
        contrast={0.9}
        density={0.65 + a.treble * 0.5}
        intensity={1.3 + a.bass * 2.2 + a.beat * 2}
        speed={1 + a.level * 1.4}
      />
      <WaveDistortion
        angle={188}
        edges="mirror"
        frequency={1.8 + a.mid * 2.6}
        strength={0.7 + a.bass * 1.2 + a.beat * 0.8}
        visible={true}
        waveType="square"
      />
    </Dither>
  );
}

/** Soft Register: a flowing helio/amethyst/aquamarine gradient under a faint CMYK halftone. */
function softRegister(a: AudioLevels): ReactNode {
  return (
    <>
      <FlowingGradient
        colorA={BRAND.helio}
        colorB={BRAND.amethyst}
        colorC={GEM.aquamarine}
        colorD={BRAND.nyxViolet}
        colorSpace="oklab"
        distortion={0.8 + a.level * 0.8 + a.beat * 0.7}
        seed={29}
      />
      <Halftone blendMode="overlay" frequency={180} opacity={0.2 + a.bass * 0.3 + a.beat * 0.25} style="cmyk" />    </>
  );
}

/** Spectral Bloom: an amethyst->helio color wheel on nyx that blooms hard with the bass + beat. */
function spectralBloom(a: AudioLevels): ReactNode {
  return (
    <>
      <ColorWheel
        angle={{ mode: "loop", type: "auto-animate", speed: 0.2, outputMax: 180, outputMin: -180 }}
        colorA={BRAND.amethyst}
        colorB={BRAND.helio}
        colorC={BRAND.nyx}
        colorSpace="oklab"
        mode="custom"
        scale={1.6 + a.bass * 3 + a.beat * 2}
      />
      <Halftone frequency={125} misprint={0.0055} opacity={0.05 + a.treble * 0.12} style="cmyk" />    </>
  );
}

/** Pistons: helio godrays pumping with the kick, ascii'd, on nyx paper grain. */
function pistons(a: AudioLevels): ReactNode {
  return (
    <>
      <SolidColor color={BRAND.nyx} />
      <Ascii cellSize={32} characters="▄║█" fontFamily="Nacelle" gamma={1.65 + a.bass * 0.8 + a.beat * 0.8}>
        <Godrays
          backgroundColor={BRAND.nyxViolet}
          density={0.2 + a.bass * 0.45}
          intensity={0.9 + a.level * 1.4 + a.beat * 1.6}
          rayColor={BRAND.helio}
          spotty={0}
        />
      </Ascii>
      <Paper displacement={0} grainScale={3} roughness={0.85} />    </>
  );
}

/** Fluid Chrome: a full-screen amethyst/cloud flow field refracted through glass, mark on top. */
function fluidChrome(a: AudioLevels): ReactNode {
  return (
    <>
      <SolidColor color={BRAND.nyx} />
      <Glass
        cutout={false}
        aberration={0.89 + a.treble * 0.8 + a.beat * 0.6}
        edgeSoftness={0.2}
        refraction={1.09 + a.bass * 0.8 + a.beat * 0.5}
        scale={1.05 + a.beat * 0.12}
        thickness={0.27}
      >
        <Swirl blend={56} colorA={BRAND.amethyst} colorB={BRAND.cloud} colorSpace="oklab" detail={6} speed={0.1 + a.level * 0.7} />
        <FlowField detail={2} evolutionSpeed={1.5 + a.mid * 1.8} speed={1.8 + a.bass * 2.2 + a.beat * 1.5} strength={0.5 + a.level * 0.7} />
      </Glass>    </>
  );
}

/** Chroma Flow: gem-hued directional chroma streaming through fluted glass. */
function chromaFlow(a: AudioLevels): ReactNode {
  return (
    <>
      <Swirl colorA={BRAND.nyx} colorB={BRAND.nyxViolet} detail={3.2} />
      <ChromaFlow
        baseColor={BRAND.nyxViolet}
        upColor={GEM.garnet}
        downColor={GEM.peridot}
        leftColor={BRAND.amethyst}
        rightColor={GEM.aquamarine}
        intensity={1 + a.bass * 0.4 + a.beat * 0.4}
        radius={2.5 + a.bass * 2 + a.beat}
        momentum={13 + a.level * 8 + a.beat * 6}
      />
      <FlutedGlass
        aberration={0.61 + a.treble * 0.6 + a.beat * 0.4}
        angle={250}
        frequency={13}
        highlight={0.12}
        highlightSoftness={0}
        lightAngle={-90}
        refraction={4}
        shape="rounded"
        softness={1}
        speed={0.15 + a.level * 0.5}
      />
      <FilmGrain strength={0.05} />    </>
  );
}

/** Drift: aquamarine smoke billowing up from the floor on the bass. */
function drift(a: AudioLevels): ReactNode {
  return (
    <>
      <SolidColor color={BRAND.nyx} />
      <Smoke
        colorA={BRAND.cloud}
        colorB={GEM.aquamarine}
        colorDecay={1.4}
        detail={7}
        direction={36}
        emitFrom={{ x: 0.5, y: 1 }}
        emitRadius={0.08 + a.bass * 0.12 + a.beat * 0.08}
        intensity={0.5 + a.bass * 0.5}
        mouseInfluence={0}
        mouseRadius={0.07}
        speed={6.2 + a.bass * 5 + a.beat * 4}
      />    </>
  );
}

/** Mosaic: an amethyst/aquamarine swirl whose pixels chunk up hard on the bass. */
function mosaic(a: AudioLevels): ReactNode {
  return (
    <>
      <Swirl colorA={BRAND.nyxViolet} colorB={GEM.aquamarine} colorSpace="oklab" detail={3.2} speed={0.6 + a.level * 0.9} visible={true} />
      {/* scale = pixels per edge, so a lower number = bigger blocks; the bass crushes it down. */}
      <Pixelate scale={Math.max(8, 70 - a.bass * 48 - a.beat * 22)} />    </>
  );
}

/** Circuit: a moonstone/black swirl behind a helio neon grid, warped and rippled. */
function circuit(a: AudioLevels): ReactNode {
  return (
    <>
      <Swirl colorA={GEM.moonstone} colorB={BRAND.nyx} colorSpace="oklch" detail={2.2} speed={1.5 + a.level * 1.2} />
      <WaveDistortion
        angle={70}
        blendMode="linearDodge"
        edges="mirror"
        frequency={0.7}
        strength={0.8 + a.beat * 0.6}
        waveType="triangle"
      >
        <Grid blendMode="hardLight" cells={44} color={BRAND.helio} thickness={3.5} transform={{ scale: 0.75 }} />
      </WaveDistortion>
      <GridDistortion decay={1.8} edges="wrap" gridSize={8} intensity={1.2 + a.bass * 2.6 + a.beat * 1.4} radius={1 + a.bass * 1.2 + a.beat * 0.5} />    </>
  );
}

/** Dedalus Bloom: a layered swirl/blob field refracted through the Dedalus wings. */
function dedalusBloom(a: AudioLevels): ReactNode {
  return (
    <>
      <Swirl colorA="#1a0b2e" colorB={GEM.aquamarine} colorSpace="lch" detail={3.5} speed={0.8 + a.level * 0.6} />
      <Blob
        center={{ x: 0.49, y: 0.28 }}
        colorA={GEM.moonstone}
        colorB={BRAND.amethyst}
        colorSpace="oklch"
        deformation={0.55 + a.bass * 0.4}
        highlightColor={BRAND.cloud}
        highlightIntensity={0.8 + a.beat * 0.6}
        highlightX={0.5}
        highlightY={-0.5}
        highlightZ={0.8}
        opacity={0.9}
        seed={42}
        size={0.55 + a.bass * 0.5 + a.beat * 0.3}
        softness={3}
        speed={1.2 + a.level * 0.8}
        visible={true}
      />
      <WaveDistortion angle={161} edges="mirror" frequency={3.4} speed={2.5} strength={0.2 + a.beat * 0.4} visible={true} />
      <SineWave
        amplitude={0.1}
        angle={180}
        color={BRAND.nyxViolet}
        frequency={0.2}
        position={{ x: 0.5, y: 1 }}
        softness={0.6}
        speed={-0.6}
        thickness={0.7}
        visible={true}
      />
      <FilmGrain strength={0.1} />    </>
  );
}

export const SCENES: Scene[] = [
  { name: "Pixel Beams", background: pixelBeams },
  { name: "Soft Register", background: softRegister },
  { name: "Spectral Bloom", background: spectralBloom },
  { name: "Pistons", background: pistons },
  { name: "Fluid Chrome", background: fluidChrome },
  { name: "Chroma Flow", background: chromaFlow },
  { name: "Drift", background: drift },
  { name: "Mosaic", background: mosaic },
  { name: "Circuit", background: circuit },
  { name: "Dedalus Bloom", background: dedalusBloom },
];

/** Scene lookup by name, for projection backdrops that pick a specific ambient look. */
export const SCENE_BY_NAME: Record<string, Scene> = Object.fromEntries(
  SCENES.map((s) => [s.name, s]),
);
