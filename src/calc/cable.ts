import { roundUpToStandard, STANDARD_CABLE_SIZES } from './tables'

export interface CableSizingInput {
  current: number // design/load current, A
  longRunOrHighAmbient: boolean // bump one standard size for >50m runs or high ambient heat
}

export interface CableSizingResult {
  breakpointRuleUsed: '/4' | '/2.5'
  theoreticalMinMm2: number
  standardSizeMm2: number
  bumpedForDerating: boolean
  finalSizeMm2: number
  exceedsTable: boolean
}

/**
 * Field rule-of-thumb cable sizing (copper, PVC/SWA/PVC, general LV distribution).
 * <=130A uses I/4 (mm^2 up to 35mm^2), >130A uses I/2.5 (mm^2 from 50mm^2 up) because
 * thicker cables dissipate heat less efficiently per mm^2 of cross-section.
 * This is a fast field estimate, not a substitute for full IEC 60364 ampacity/derating tables.
 */
export function sizeCableByRuleOfThumb(input: CableSizingInput): CableSizingResult {
  const { current, longRunOrHighAmbient } = input
  const useHighRule = current > 130
  const theoreticalMinMm2 = useHighRule ? current / 2.5 : current / 4

  const base = roundUpToStandard(theoreticalMinMm2, STANDARD_CABLE_SIZES)
  let finalSizeMm2 = base.value
  let bumpedForDerating = false

  if (longRunOrHighAmbient) {
    const idx = STANDARD_CABLE_SIZES.indexOf(base.value)
    if (idx >= 0 && idx < STANDARD_CABLE_SIZES.length - 1) {
      finalSizeMm2 = STANDARD_CABLE_SIZES[idx + 1]
      bumpedForDerating = true
    }
  }

  return {
    breakpointRuleUsed: useHighRule ? '/2.5' : '/4',
    theoreticalMinMm2,
    standardSizeMm2: base.value,
    bumpedForDerating,
    finalSizeMm2,
    exceedsTable: base.exceedsTable,
  }
}

export interface EarthSizingResult {
  cpcMm2: number
  ruleApplied: string
}

/**
 * Protective earth / CPC conductor sizing from phase conductor size (same-material CPC),
 * following the widely-used simplified table (equivalent to BS7671 Table 54.7 / IEC 60364-5-54):
 *  - phase <= 16mm^2: CPC = phase size
 *  - 16 < phase <= 35mm^2: CPC = 16mm^2
 *  - phase > 35mm^2: CPC = phase / 2, rounded up to a standard size
 */
export function sizeEarthConductor(phaseMm2: number): EarthSizingResult {
  if (phaseMm2 <= 16) {
    return { cpcMm2: phaseMm2, ruleApplied: 'Phase <= 16mm^2: earth = phase size' }
  }
  if (phaseMm2 <= 35) {
    return { cpcMm2: 16, ruleApplied: '16mm^2 < Phase <= 35mm^2: earth = 16mm^2' }
  }
  const { value } = roundUpToStandard(phaseMm2 / 2, STANDARD_CABLE_SIZES)
  return { cpcMm2: value, ruleApplied: 'Phase > 35mm^2: earth = phase / 2 (rounded up)' }
}
