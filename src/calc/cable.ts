import {
  BS7671_CABLE_SIZES_MM2,
  RATED_CONDUCTOR_TEMP_C,
  ambientCorrectionFactor,
  groupingCorrectionFactor,
  lookupAmpacity,
  lookupVdEntry,
  voltageDropTemperatureCorrection,
  type ConductorMaterial,
  type CoreConfig,
  type InstallMethod,
} from './bs7671Tables'
import { calcPfc } from './pfc'
import { roundUpToStandard, STANDARD_CABLE_SIZES, type Phase } from './tables'

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
  material: ConductorMaterial
  powerFactor?: number // if given (and size >= 25mm^2), uses r*cos(phi) + x*sin(phi); otherwise uses tabulated z
  installMethod: InstallMethod
  ambientTempC: number
  groupedCircuits: number
  // If given, use this mV/A/m value directly (e.g. from a manufacturer datasheet) instead of
  // the BS7671 Table 4D4B lookup - skips the material derivation and Ct temperature correction,
  // since neither the resistance/reactance split nor the operating condition are known for an
  // arbitrary supplied figure.
  customMvPerAPerM?: number
}

export interface VoltageDropTableResult {
  mvPerAPerM: number // the value actually used (z, or r*cosphi+x*sinphi), after the Ct correction
  voltDrop: number
  found: boolean
  tabulatedCapacityAtSize: number | null
  correctedCapacityAtSize: number | null // Iz = tabulated x Ca x Cg, at this install method/ambient/grouping
  loadRatio: number | null // Ib / Iz, capped at 1
  estimatedConductorTempC: number
  ct: number
}

/**
 * Voltage drop from BS7671 Table 4D4B mV/A/m data (Table 4D4A companion table). Copper values
 * are the table's own published figures; aluminium values are derived from them by scaling
 * resistance by the IEC 60228 resistivity ratio (reactance is left unchanged - it depends on
 * conductor geometry/spacing, not material) - see calc/bs7671Tables.ts.
 *
 * The table's mV/A/m figures assume the conductor is at its full rated temperature (70C). A
 * cable loaded below its actual (installation-method/ambient/grouping-corrected) capacity Iz
 * runs cooler, so its real resistance and voltage drop are lower - the BS7671 Appendix 4 "Ct"
 * factor corrects for this. This is why installation method matters here even though the base
 * mV/A/m table itself does not vary by method.
 */
export function calcVoltageDropBS7671(input: VoltageDropTableInput): VoltageDropTableResult {
  const {
    designCurrent,
    lengthM,
    sizeMm2,
    coreConfig,
    material,
    powerFactor,
    installMethod,
    ambientTempC,
    groupedCircuits,
    customMvPerAPerM,
  } = input

  if (customMvPerAPerM !== undefined) {
    return {
      mvPerAPerM: customMvPerAPerM,
      voltDrop: (customMvPerAPerM * designCurrent * lengthM) / 1000,
      found: true,
      tabulatedCapacityAtSize: null,
      correctedCapacityAtSize: null,
      loadRatio: null,
      estimatedConductorTempC: RATED_CONDUCTOR_TEMP_C,
      ct: 1,
    }
  }

  const entry = lookupVdEntry(coreConfig, sizeMm2, material)
  if (!entry) {
    return {
      mvPerAPerM: 0,
      voltDrop: 0,
      found: false,
      tabulatedCapacityAtSize: null,
      correctedCapacityAtSize: null,
      loadRatio: null,
      estimatedConductorTempC: 0,
      ct: 1,
    }
  }

  const tabulatedCapacityAtSize = lookupAmpacity(installMethod, coreConfig, sizeMm2)
  const ambientFactor = ambientCorrectionFactor(ambientTempC)
  const groupingFactor = groupingCorrectionFactor(groupedCircuits)
  const correctedCapacityAtSize =
    tabulatedCapacityAtSize !== null ? tabulatedCapacityAtSize * ambientFactor * groupingFactor : null
  const loadRatio = correctedCapacityAtSize ? Math.min(designCurrent / correctedCapacityAtSize, 1) : null

  const { estimatedConductorTempC, ct } = voltageDropTemperatureCorrection(
    material,
    designCurrent,
    correctedCapacityAtSize,
    ambientTempC,
  )

  const rCorrected = entry.r * ct
  const phi = powerFactor !== undefined ? Math.acos(Math.min(Math.max(powerFactor, 0), 1)) : null
  const mvPerAPerM =
    phi !== null && entry.x > 0
      ? rCorrected * Math.cos(phi) + entry.x * Math.sin(phi)
      : Math.sqrt(rCorrected * rCorrected + entry.x * entry.x)

  const voltDrop = (mvPerAPerM * designCurrent * lengthM) / 1000
  return {
    mvPerAPerM,
    voltDrop,
    found: true,
    tabulatedCapacityAtSize,
    correctedCapacityAtSize,
    loadRatio,
    estimatedConductorTempC,
    ct,
  }
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

export interface VoltageDropPfcInput {
  designCurrent: number
  existingPf: number
  targetPf: number
  systemVoltage: number
  phase: Phase
  lengthM: number
  sizeMm2: number
  coreConfig: CoreConfig
  material: ConductorMaterial
  installMethod: InstallMethod
  ambientTempC: number
  groupedCircuits: number
  customMvPerAPerM?: number
}

export interface VoltageDropPfcResult {
  realPowerKw: number
  requiredKvar: number
  capacitorCurrent: number
  newCurrent: number
  before: VoltageDropTableResult
  after: VoltageDropTableResult
}

/**
 * Impact of power-factor correction (a capacitor bank) on voltage drop. For the same real
 * power P, current is inversely proportional to PF (I = P / (sqrt(3) x V x PF) for 3-phase, or
 * P / (V x PF) for 1-phase) - correcting PF towards 1 reduces the current the cable actually
 * carries, so voltage drop (which is directly proportional to current) falls. Reuses the PFC
 * capacitor sizing (calc/pfc.ts) and the voltage-drop table lookup (both before and after, so
 * the resistance/reactance combination and Ct temperature correction are each re-evaluated at
 * their own current and PF) rather than approximating.
 */
export function calcVoltageDropPfcImpact(input: VoltageDropPfcInput): VoltageDropPfcResult {
  const {
    designCurrent,
    existingPf,
    targetPf,
    systemVoltage,
    phase,
    lengthM,
    sizeMm2,
    coreConfig,
    material,
    installMethod,
    ambientTempC,
    groupedCircuits,
    customMvPerAPerM,
  } = input

  const realPowerKw =
    (phase === 3
      ? Math.sqrt(3) * systemVoltage * designCurrent * existingPf
      : systemVoltage * designCurrent * existingPf) / 1000

  const pfc = calcPfc({ kW: realPowerKw, existingPf, targetPf, voltage: systemVoltage, phase })
  const newCurrent = designCurrent * (existingPf / Math.max(targetPf, 0.01))

  const before = calcVoltageDropBS7671({
    designCurrent,
    lengthM,
    sizeMm2,
    coreConfig,
    material,
    powerFactor: customMvPerAPerM !== undefined ? undefined : existingPf,
    installMethod,
    ambientTempC,
    groupedCircuits,
    customMvPerAPerM,
  })
  const after = calcVoltageDropBS7671({
    designCurrent: newCurrent,
    lengthM,
    sizeMm2,
    coreConfig,
    material,
    powerFactor: customMvPerAPerM !== undefined ? undefined : targetPf,
    installMethod,
    ambientTempC,
    groupedCircuits,
    customMvPerAPerM,
  })

  return {
    realPowerKw,
    requiredKvar: pfc.requiredKvar,
    capacitorCurrent: pfc.capacitorCurrent,
    newCurrent,
    before,
    after,
  }
}
