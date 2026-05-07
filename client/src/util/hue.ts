// Deterministic hue (0-360) per book based on filename.
// Curated to deep, warm, library-coded hues — no cyans, teals, mints, or pastels.
// Picks one of:
//   25  rust / amber
//   12  deep red / cinnabar
//   350 burgundy
//   320 plum
//   280 indigo
//   260 violet-ink
//   80  moss / olive
//   110 deep forest
const BOOK_HUES: ReadonlyArray<number> = [25, 12, 350, 320, 280, 260, 80, 110];

export function bookHue(seed: string): number {
  if (!seed) return BOOK_HUES[0];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return BOOK_HUES[Math.abs(hash) % BOOK_HUES.length];
}

export function bookGradient(hue: number): string {
  return [
    `radial-gradient(circle at 80% 20%, oklch(0.65 0.14 ${hue} / .35), transparent 55%)`,
    `radial-gradient(circle at 20% 80%, oklch(0.45 0.10 ${hue} / .55), transparent 60%)`,
    `linear-gradient(135deg, oklch(0.32 0.07 ${hue}), oklch(0.18 0.05 ${hue}))`,
  ].join(', ');
}

export function miniGradient(hue: number): string {
  return `linear-gradient(135deg, oklch(0.42 0.08 ${hue}), oklch(0.22 0.06 ${hue}))`;
}

export function chipHueColor(hue: number): string {
  return `oklch(0.86 0.08 ${hue})`;
}

/** Deep, saturated hue for the global --accent. */
export function accentForHue(hue: number): string {
  return `oklch(0.46 0.16 ${hue})`;
}

/** Soft tint of the same hue (still rich, not pastel), for chips and hover. */
export function accentSoftForHue(hue: number): string {
  return `oklch(0.86 0.10 ${hue})`;
}

/** Darker variant for dark mode soft surfaces. */
export function accentSoftDarkForHue(hue: number): string {
  return `oklch(0.28 0.08 ${hue})`;
}

/** Hero strip wash gradient — deep colored band behind the library greeting. */
export function heroStripGradient(hue: number): string {
  return [
    `radial-gradient(circle at 0% 50%, oklch(0.72 0.16 ${hue} / 0.55), transparent 55%)`,
    `radial-gradient(circle at 100% 50%, oklch(0.66 0.18 ${hue} / 0.45), transparent 60%)`,
    `linear-gradient(135deg, oklch(0.88 0.07 ${hue}), oklch(0.83 0.08 ${hue}))`,
  ].join(', ');
}
