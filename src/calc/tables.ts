// Standard reference tables used across calculators.
// Sources: IEC 60947-2 (breaker frame steps), IEC 60228 (conductor sizes).

/** Standard IEC MCCB/MCB current ratings (amps), ascending. */
export const STANDARD_BREAKER_SIZES = [
  6, 10, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 175, 200, 225, 250,
  300, 320, 350, 400, 500, 600, 630, 700, 800, 1000, 1200, 1250, 1600, 2000,
  2500, 3200,
]

/** Standard copper/aluminium conductor cross-sections (mm^2), ascending. */
export const STANDARD_CABLE_SIZES = [
  1, 1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240, 300, 400,
  500, 630, 800, 1000,
]

/** Common standard diesel genset ratings (kVA), ascending. */
export const STANDARD_GENSET_SIZES_KVA = [
  10, 15, 20, 25, 30, 40, 50, 62.5, 75, 82.5, 100, 125, 135, 150, 180, 200,
  220, 250, 275, 300, 320, 350, 380, 400, 500, 550, 600, 625, 650, 700, 750,
  800, 1000, 1250, 1500, 1750, 2000, 2500, 3000,
]

/** Standard distribution transformer ratings (kVA), ascending. */
export const STANDARD_TRANSFORMER_SIZES_KVA = [
  25, 50, 75, 100, 160, 200, 250, 315, 400, 500, 630, 800, 1000, 1250, 1600,
  2000, 2500, 3150, 4000, 5000,
]

/** Smallest value in a sorted list that is >= target; falls back to the largest entry (with a flag). */
export function roundUpToStandard(
  target: number,
  sizes: number[],
): { value: number; exceedsTable: boolean } {
  for (const s of sizes) {
    if (s >= target - 1e-9) return { value: s, exceedsTable: false }
  }
  return { value: sizes[sizes.length - 1], exceedsTable: true }
}

export type Phase = 1 | 3

export const MOTOR_STARTING_FACTORS = [
  { id: 'dol', label: 'Direct-On-Line (DOL)', min: 6, max: 8, default: 7 },
  { id: 'star-delta', label: 'Star-Delta', min: 2, max: 3, default: 2.5 },
  { id: 'soft-starter', label: 'Soft Starter', min: 2, max: 4, default: 3 },
  { id: 'vfd', label: 'VFD / Inverter', min: 1, max: 1.5, default: 1.2 },
  { id: 'auto-transformer', label: 'Auto-Transformer', min: 1.5, max: 2.5, default: 2 },
] as const

export type StartingMethodId = (typeof MOTOR_STARTING_FACTORS)[number]['id']

export function getStartingFactorDefault(method: StartingMethodId): number {
  return MOTOR_STARTING_FACTORS.find((m) => m.id === method)?.default ?? 1
}

/**
 * Rough field guidance for a typical starting method by motor size (see the Field Reference
 * page): DOL up to ~5.5kW, star-delta up to ~37kW, soft starter up to ~90kW, VFD above that.
 * The actual choice always depends on the supply's fault level and the site/utility's permitted
 * voltage dip - this is only a sensible default to prefill, not a substitute for that check.
 */
export function recommendedStartingMethod(motorKw: number): StartingMethodId {
  if (motorKw <= 5.5) return 'dol'
  if (motorKw <= 37) return 'star-delta'
  if (motorKw <= 90) return 'soft-starter'
  return 'vfd'
}
