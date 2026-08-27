import {
  BS7671_CABLE_SIZES_MM2,
  ambientCorrectionFactor,
  groupingCorrectionFactor,
  lookupAmpacity,
  lookupVdEntry,
  type CoreConfig,
  type InstallMethod,
} from './bs7671Tables'
import { roundUpToStandard, STANDARD_CABLE_SIZES } from './tables'

export interface CableSizingInput {
  designCurrent: number // Ib, A
  installMethod: InstallMethod
  coreConfig: CoreConfig // twoCore = single-phase/DC, threeOrFourCore = three-phase
  ambientTempC: number // C
  groupedCircuits: number // number of touching circuits (including this one)
}

export interface CableSizingResult {
  ambientFactor: number
  groupingFactor: number
  requiredTabulatedCurrent: number // It = Ib / (Ca x Cg)
  selectedSizeMm2: number | null
  tabulatedCapacityAtSize: number | null
  correctedCapacityAtSize: number | null // Iz = tabulated x Ca x Cg
  exceedsTable: boolean
}

/**
 * Cable sizing to BS7671 Table 4D4A (copper, SWA/PVC, 70C thermoplastic), applying ambient
 * temperature (Table 4B1) and grouping (Table 4C1) correction factors:
 *   It = Ib / (Ca x Cg),  select smallest tabulated size with rating >= It
 * so that the corrected in-service capacity Iz = tabulated x Ca x Cg >= Ib.
 */
export function sizeCableBS7671(input: CableSizingInput): CableSizingResult {
  const { designCurrent, installMethod, coreConfig, ambientTempC, groupedCircuits } = input

  const ambientFactor = ambientCorrectionFactor(ambientTempC)
  const groupingFactor = groupingCorrectionFactor(groupedCircuits)
  const combined = Math.max(ambientFactor * groupingFactor, 0.01)
  const requiredTabulatedCurrent = designCurrent / combined

  let selectedSizeMm2: number | null = null
  let tabulatedCapacityAtSize: number | null = null
  for (const size of BS7671_CABLE_SIZES_MM2) {
    const capacity = lookupAmpacity(installMethod, coreConfig, size)
    if (capacity !== null && capacity >= requiredTabulatedCurrent) {
      selectedSizeMm2 = size
      tabulatedCapacityAtSize = capacity
      break
    }
  }

  const correctedCapacityAtSize =
    tabulatedCapacityAtSize !== null ? tabulatedCapacityAtSize * combined : null

  return {
    ambientFactor,
    groupingFactor,
    requiredTabulatedCurrent,
    selectedSizeMm2,
    tabulatedCapacityAtSize,
    correctedCapacityAtSize,
    exceedsTable: selectedSizeMm2 === null,
  }
}

export interface VoltageDropTableInput {
  designCurrent: number
  lengthM: number
  sizeMm2: number
  coreConfig: CoreConfig
  powerFactor?: number // if given (and size >= 25mm^2), uses r*cos(phi) + x*sin(phi); otherwise uses tabulated z
}

export interface VoltageDropTableResult {
  mvPerAPerM: number // the value actually used (z, or r*cosphi+x*sinphi)
  voltDrop: number
  found: boolean
}

/** Voltage drop from BS7671 Table 4D4B mV/A/m data for the same cable (Table 4D4A companion table). */
export function calcVoltageDropBS7671(input: VoltageDropTableInput): VoltageDropTableResult {
  const { designCurrent, lengthM, sizeMm2, coreConfig, powerFactor } = input
  const entry = lookupVdEntry(coreConfig, sizeMm2)
  if (!entry) return { mvPerAPerM: 0, voltDrop: 0, found: false }

  const phi = powerFactor !== undefined ? Math.acos(Math.min(Math.max(powerFactor, 0), 1)) : null
  const mvPerAPerM =
    phi !== null && entry.x > 0 ? entry.r * Math.cos(phi) + entry.x * Math.sin(phi) : entry.z

  const voltDrop = (mvPerAPerM * designCurrent * lengthM) / 1000
  return { mvPerAPerM, voltDrop, found: true }
}

export interface EarthSizingResult {
  cpcMm2: number
  ruleApplied: string
}

/**
 * Protective earth / CPC conductor sizing from phase conductor size (same material CPC),
 * per BS7671 Table 54.7 / IEC 60364-5-54 (the standard's own simplified alternative to the
 * full adiabatic equation S = sqrt(I^2 t) / k, for use when fault current and disconnection
 * time have not been separately calculated):
 *  - phase <= 16mm^2: CPC = phase size
 *  - 16 < phase <= 35mm^2: CPC = 16mm^2
 *  - phase > 35mm^2: CPC = phase / 2, rounded up to a standard size
 */
export function sizeEarthConductor(phaseMm2: number): EarthSizingResult {
  if (phaseMm2 <= 16) {
    return { cpcMm2: phaseMm2, ruleApplied: 'Table 54.7: Phase <= 16mm^2 -> CPC = phase size' }
  }
  if (phaseMm2 <= 35) {
    return { cpcMm2: 16, ruleApplied: 'Table 54.7: 16mm^2 < Phase <= 35mm^2 -> CPC = 16mm^2' }
  }
  const { value } = roundUpToStandard(phaseMm2 / 2, STANDARD_CABLE_SIZES)
  return { cpcMm2: value, ruleApplied: 'Table 54.7: Phase > 35mm^2 -> CPC = phase / 2 (rounded up)' }
}

/**
 * Adiabatic equation (IEC 60364-5-54 / BS7671 543.1.3): minimum CPC size from fault current
 * and disconnection time - the fully precise method when Isc and trip time are known.
 *   S = sqrt(I^2 x t) / k
 */
export function sizeEarthConductorAdiabatic(
  faultCurrentA: number,
  disconnectionTimeS: number,
  k: number,
): EarthSizingResult {
  const required = Math.sqrt(faultCurrentA ** 2 * disconnectionTimeS) / k
  const { value } = roundUpToStandard(required, STANDARD_CABLE_SIZES)
  return { cpcMm2: value, ruleApplied: `Adiabatic equation: S = sqrt(I^2 t) / k (required ${required.toFixed(2)}mm^2)` }
}
