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
  Paper,
  Pixelate,
  Plasma,
  SineWave,
  Smoke,
  SolidColor,
  SunBurst,
  Swirl,
  WaveDistortion,
} from "shaders/react";

/** Smoothed, normalized audio bands the scenes read (each ~0..1, may exceed 1 on peaks). */
export interface AudioLevels {
  level: number; // overall loudness
  bass: number; // low band (kick)
  mid: number; // mid band (leads)
  treble: number; // high band (shimmer)
  beat: number; // kick pulse: snaps up then eases out; harder kicks punch past 1
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

/**
 * Pre-baked SDF of the Dedalus wing mark (generated from dedalus-mark.svg by
 * `pnpm generate:sdf`, scripts/generate-logo-sdf.ts). The SDF *is* the wing shape, so
 * it alone defines what the glass carves, so there is no separate logo image to keep in
 * alignment (a flat white SVG behind the same SDF was redundant, and its `contain`
 * sizing drifted out of the height-based carve on non-landscape screens).
 */
const LOGO_SDF = "/brand/dedalus-logo-sdf.bin";

/**
 * The two colors the mark's liquid-glass swirl marbles between, chosen per scene so the
 * wings always contrast the view (over the purple/white Fluid Chrome they'd vanish in
 * brand colors, so that scene hands the mark a warm hue instead). `a` is the body/rim
 * tint, `b` the light/highlight end.
 */
interface LogoColors {
  a: string;
  b: string;
}
const DEFAULT_LOGO: LogoColors = { a: BRAND.amethyst, b: BRAND.cloud };

/**
 * The Dedalus mark, carved as 3D "liquid glass." The wing SDF shapes the glass, and
 * instead of a flat fill it refracts a flowing amethyst->cloud swirl warped by a flow
 * field (the shaders.com chrome recipe), so each feather marbles with purple and white
 * that streams and chromatically splits at the edges. The swirl/flow are full-screen, so
 * the carve fills at ANY aspect; `cutout` keeps everything outside the wings transparent
 * so the scene shows around them. Refraction, aberration, and the flow speeds ride the
 * music; a soft fresnel rim + specular glint keep the raised 3D read. Pulses on the beat.
 */
function logoEffect(a: AudioLevels, colors: LogoColors = DEFAULT_LOGO): ReactNode {
  return (
    <Glass
      shapeSdfUrl={LOGO_SDF}
      cutout={true}
      // scale beat term is kept modest (0.12) so the harder beat signal flares the wings
      // without growing them past the frame; the punch lives in the optics below instead.
      scale={0.9 + a.beat * 0.12 + a.bass * 0.05}
      aberration={0.55 + a.treble * 0.5 + a.beat * 1.3}
      edgeSoftness={0.18}
      refraction={1.1 + a.bass * 0.5 + a.beat * 1.1}
      thickness={0.72 + a.beat * 0.6}
      tintColor={colors.a}
      tintIntensity={0.12}
      fresnel={0.12 + a.beat * 0.8}
      fresnelSoftness={0.2}
      fresnelColor={colors.b}
      highlight={0.45 + a.beat * 0.55}
      highlightColor={colors.b}
      highlightSoftness={0.18}
      lightAngle={300}
    >
      <Swirl
        blend={56}
        colorA={colors.a}
        colorB={colors.b}
        colorSpace="oklab"
        detail={4.2}
        speed={0.1 + a.level * 0.8 + a.beat * 0.4}
      />
      <FlowField
        detail={1}
        evolutionSpeed={1.5 + a.mid * 1.6}
        speed={1.8 + a.bass * 2.2 + a.beat * 1.6}
        strength={0.5 + a.level * 0.6}
      />
    </Glass>
  );
}

export interface Scene {
  name: string;
  /** The full-screen shader stack, WITHOUT the Dedalus mark (see `renderScene`). */
  background: (a: AudioLevels) => ReactNode;
  /** Liquid-glass swirl colors for the mark over this scene, picked to contrast it. */
  logo?: LogoColors;
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
      {withLogo ? logoEffect(a, scene.logo) : null}
    </>
  );
}

/** Pixel Beams: a plasma sliced into square beams, dithered to a helio/violet grid. */
function pixelBeams(a: AudioLevels): ReactNode {
  return (
    // pixelSize chunks the dither grid up on the kick for a beat-locked "blocking" pop.
    <Dither colorA={BRAND.nyxViolet} colorB={BRAND.helio} pattern="bayer8" pixelSize={6 + a.beat * 8} threshold={0.46 - a.beat * 0.2 - a.bass * 0.1}>
      <Plasma
        colorA={BRAND.cloud}
        colorB={BRAND.amethyst}
        contrast={1.1 + a.beat * 0.6}
        density={2.4 + a.mid * 1.8}
        intensity={1.1 + a.bass * 2.6 + a.beat * 2.4}
        speed={1.2 + a.level * 2.4}
        warp={0.45 + a.treble * 0.35}
      />
      <WaveDistortion
        angle={188 + a.mid * 18}
        edges="mirror"
        frequency={2.2 + a.mid * 3.2}
        strength={0.5 + a.bass * 1.4 + a.beat * 1.1}
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
        speed={1.4 + a.level * 2.6 + a.beat * 1.6}
        distortion={1.05 + a.level * 1.1 + a.bass * 0.6 + a.beat * 0.9}
        seed={29}
      />
      {/* Dots tighten with the highs and split (misprint) on the kick for a CMYK shimmer. */}
      <Halftone blendMode="overlay" frequency={210 + a.treble * 120} misprint={a.beat * 0.02} opacity={0.18 + a.bass * 0.38 + a.beat * 0.45} style="cmyk" />    </>
  );
}

/**
 * Spectral Bloom: a violet->cyan color wheel on black whose zoom is *mapped* from an invisible
 * SunBurst's alpha (the shaders.com recipe) instead of a single number. The burst's rays carry
 * high alpha -> tight spectral bands (scale ~10), the gaps low alpha -> wide flat color (scale
 * ~0.1), so the frame reads as a radial bloom rather than one magnified gradient. High-contrast
 * colors keep the cycles legible, and the burst radius swells on the kick so it breathes.
 */
const SPECTRAL_BURST = "spectral-bloom-burst";
function spectralBloom(a: AudioLevels): ReactNode {
  return (
    <>
      {/* Invisible driver: its alpha shapes the ColorWheel zoom below, and it breathes with
          the room: the kick swells the rays (radius) and sharpens them (feather) so the
          spectral fans punch outward on every hit. */}
      <SunBurst
        id={SPECTRAL_BURST}
        background="#00000000"
        center={{ x: 0.7, y: 0.3 }}
        color="#ffffff"
        feather={Math.max(0.5, 2.18 - a.beat * 1.1 - a.treble * 0.3)}
        radius={2 + a.bass * 1.4 + a.beat * 1.6}
        rayCount={8}
        softness={0.9}
        speed={0}
        visible={false}
      />
      <ColorWheel
        angle={{ mode: "loop", type: "auto-animate", speed: 0.2, outputMax: 180, outputMin: -180 }}
        colorA="#6400ff"
        colorB="#05ffff"
        colorC="#000000"
        colorSpace="oklab"
        mode="custom"
        // outputMax is the band count at the ray cores; the kick + bass pack in more spectral
        // cycles there (capped to dodge moiré) so the bloom visibly tightens on the beat.
        scale={{
          type: "map",
          source: SPECTRAL_BURST,
          channel: "alpha",
          inputMin: 0,
          inputMax: 1,
          outputMin: 0.1,
          outputMax: Math.min(18, 10 + a.bass * 4 + a.beat * 7),
        }}
      />
      <Halftone frequency={125} misprint={0.0055 + a.beat * 0.01} opacity={0.05 + a.treble * 0.22} style="cmyk" />    </>
  );
}

/** Pistons: helio godrays pumping with the kick, ascii'd, on nyx paper grain. */
function pistons(a: AudioLevels): ReactNode {
  return (
    <>
      <SolidColor color={BRAND.nyx} />
      <Ascii cellSize={26} characters="▄║█" fontFamily="Nacelle" gamma={1.5 + a.bass * 1.0 + a.beat * 0.9}>
        <Godrays
          backgroundColor={BRAND.nyxViolet}
          density={0.34 + a.bass * 0.6 + a.beat * 0.45}
          intensity={0.8 + a.level * 1.9 + a.beat * 2.2}
          rayColor={BRAND.helio}
          // Highs break the shafts into flickering specks; the kick pumps the whole bank.
          spotty={a.treble * 0.5}
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
        aberration={0.8 + a.treble * 1.0 + a.beat * 0.7}
        edgeSoftness={0.2}
        refraction={1.1 + a.bass * 1.0 + a.beat * 0.6}
        // The lens is sized well past the mark (see logoEffect) so its refraction stays
        // full-bleed and the diagonal wings always sit inside it with margin as both pulse.
        scale={1.35 + a.beat * 0.42 + a.bass * 0.075}
        thickness={0.27 + a.beat * 0.18}
      >
        <Swirl blend={56} colorA={BRAND.amethyst} colorB={BRAND.cloud} colorSpace="oklab" detail={6} speed={0.15 + a.level * 1.1 + a.beat * 0.5} />
        <FlowField detail={2} evolutionSpeed={1.5 + a.mid * 2.4} speed={1.8 + a.bass * 2.8 + a.beat * 1.8} strength={0.5 + a.level * 0.9} />
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
        intensity={1 + a.bass * 0.6 + a.beat * 0.5}
        radius={1.9 + a.bass * 2.2 + a.beat * 1.2}
        momentum={15 + a.level * 11 + a.beat * 9}
      />
      <FlutedGlass
        aberration={0.6 + a.treble * 0.8 + a.beat * 0.5}
        angle={250}
        // Leads tighten the flutes, the bass bends them harder, the kick flashes the glint.
        frequency={15 + a.mid * 10}
        highlight={0.12 + a.beat * 0.18}
        highlightSoftness={0}
        lightAngle={-90}
        refraction={4 + a.bass * 1.5 + a.beat * 1.7}
        shape="rounded"
        softness={1}
        speed={0.15 + a.level * 0.7}
      />
      <FilmGrain strength={0.05 + a.treble * 0.07} />    </>
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
        // Highs burn the plume off faster (more flicker); leads lean the column side to side.
        colorDecay={1.4 + a.treble * 0.8}
        detail={7}
        direction={36 + a.mid * 22}
        emitFrom={{ x: 0.5, y: 1 }}
        emitRadius={0.07 + a.bass * 0.16 + a.beat * 0.18}
        intensity={0.45 + a.bass * 0.8 + a.beat * 0.6}
        mouseInfluence={0.5 + a.bass * 0.9 + a.beat * 0.6}
        mouseRadius={0.2}
        speed={6 + a.bass * 6 + a.beat * 5}
      />    </>
  );
}

/** Mosaic: an amethyst/aquamarine swirl whose pixels chunk up hard on the bass. */
function mosaic(a: AudioLevels): ReactNode {
  return (
    <>
      <Swirl colorA={BRAND.nyxViolet} colorB={GEM.aquamarine} colorSpace="oklab" detail={3.6} speed={0.7 + a.level * 1.3 + a.beat * 0.6} visible={true} />
      {/* scale = pixels along the longest edge, so HIGHER = smaller blocks. The bass still
          chunks it, but the 50 floor keeps it a fine mosaic instead of a few zoomed-in tiles. */}
      <Pixelate scale={Math.max(50, 96 - a.bass * 30 - a.beat * 24)} />    </>
  );
}

/** Circuit: a moonstone/black swirl behind a helio neon grid, warped and rippled. */
function circuit(a: AudioLevels): ReactNode {
  return (
    <>
      <Swirl colorA={GEM.moonstone} colorB={BRAND.nyx} colorSpace="oklch" detail={2.4} speed={1.6 + a.level * 1.6 + a.beat * 0.8} />
      <WaveDistortion
        angle={70}
        blendMode="linearDodge"
        edges="mirror"
        frequency={0.7 + a.mid * 0.9}
        strength={0.7 + a.beat * 0.9}
        waveType="triangle"
      >
        {/* Neon traces fatten on the kick so the grid throbs with the beat. */}
        <Grid blendMode="hardLight" cells={48} color={BRAND.helio} thickness={3.5 + a.beat * 3.6} transform={{ scale: 0.75 }} />
      </WaveDistortion>
      <GridDistortion decay={1.8} edges="wrap" gridSize={8} intensity={1.0 + a.bass * 3.2 + a.beat * 1.8} radius={1 + a.bass * 1.4 + a.beat * 0.6} />    </>
  );
}

/** Dedalus Bloom: a layered swirl/blob field refracted through the Dedalus wings. */
function dedalusBloom(a: AudioLevels): ReactNode {
  return (
    <>
      <Swirl colorA="#1a0b2e" colorB={GEM.aquamarine} colorSpace="lch" detail={3.8} speed={0.9 + a.level * 1.0 + a.beat * 0.5} />
      <Blob
        center={{ x: 0.49, y: 0.28 }}
        colorA={GEM.moonstone}
        colorB={BRAND.amethyst}
        colorSpace="oklch"
        deformation={0.6 + a.bass * 0.55 + a.beat * 0.5}
        highlightColor={BRAND.cloud}
        highlightIntensity={0.8 + a.beat * 1.5}
        highlightX={0.5}
        highlightY={-0.5}
        highlightZ={0.8}
        opacity={0.9}
        seed={42}
        size={0.42 + a.bass * 0.45 + a.beat * 0.42}
        softness={3}
        speed={1.2 + a.level * 1.1}
        visible={true}
      />
      <WaveDistortion angle={161} edges="mirror" frequency={3.4 + a.mid * 2} speed={2.5} strength={0.2 + a.beat * 0.4} visible={true} />
      {/* The floor wave swells up the screen with the bass and kicks taller on each hit. */}
      <SineWave
        amplitude={0.1 + a.bass * 0.12 + a.beat * 0.06}
        angle={180}
        color={BRAND.nyxViolet}
        frequency={0.2}
        position={{ x: 0.5, y: 1 }}
        softness={0.6}
        speed={-0.6 - a.level * 0.8}
        thickness={0.7}
        visible={true}
      />
      <FilmGrain strength={0.1 + a.treble * 0.08} />    </>
  );
}

export const SCENES: Scene[] = [
  // Each scene hands the mark a swirl palette that pops against its own colors: warm
  // hues over the cool/purple scenes, a bright pair over the dark ones, cool over gold.
  { name: "Pixel Beams", background: pixelBeams, logo: { a: GEM.moonstone, b: BRAND.cloud } },
  { name: "Soft Register", background: softRegister, logo: { a: GEM.topaz, b: BRAND.cloud } },
  { name: "Spectral Bloom", background: spectralBloom, logo: { a: GEM.peridot, b: BRAND.cloud } },
  { name: "Pistons", background: pistons, logo: { a: BRAND.helio, b: BRAND.cloud } },
  { name: "Fluid Chrome", background: fluidChrome, logo: { a: GEM.moonstone, b: GEM.topaz } },
  { name: "Chroma Flow", background: chromaFlow, logo: { a: BRAND.cloud, b: BRAND.helio } },
  { name: "Drift", background: drift, logo: { a: GEM.topaz, b: GEM.moonstone } },
  { name: "Mosaic", background: mosaic, logo: { a: GEM.moonstone, b: BRAND.cloud } },
  { name: "Circuit", background: circuit, logo: { a: GEM.aquamarine, b: BRAND.cloud } },
  { name: "Dedalus Bloom", background: dedalusBloom, logo: { a: GEM.garnet, b: BRAND.cloud } },
];

/** Scene lookup by name, for projection backdrops that pick a specific ambient look. */
export const SCENE_BY_NAME: Record<string, Scene> = Object.fromEntries(
  SCENES.map((s) => [s.name, s]),
);
