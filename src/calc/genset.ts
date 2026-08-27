import { roundUpToStandard, STANDARD_GENSET_SIZES_KVA } from './tables'

export type DemandUnit = 'kW' | 'kVA'

export interface GensetSizingInput {
  totalConnectedLoadKw: number // TCL - for reference/record only, not used in the sizing math
  maxDemandValue: number // MD - the actual expected peak demand (already reflects diversity)
  maxDemandUnit: DemandUnit
  loadPowerFactor: number // used to convert MD to kVA when maxDemandUnit is 'kW'
  largestMotorKw: number // largest single motor within the demand, for starting surge
  largestMotorPf: number
  startingFactor: number // motor starting current multiplier, from datasheet/nameplate
  gensetPowerFactor: number // typical diesel genset rated PF, e.g. 0.8
  marginPercent: number // safety/future-growth margin
  deratingFactor: number // altitude/temperature/fuel derating, 0-1 (1 = no derating)
}

export interface GensetSizingResult {
  runningKva: number
  largestMotorKva: number
  startingSurgeKva: number
  requiredKvaBeforeMargin: number
  requiredKvaWithMargin: number
  requiredKvaAfterDerating: number
  recommendedGensetKva: number
  recommendedGensetKw: number
  exceedsTable: boolean
}

/**
 * Genset (standby/prime diesel generator) sizing from Total Connected Load (TCL, recorded for
 * reference only) and Maximum Demand (MD, the actual expected running load - already reflects
 * diversity/coincidence factor). The generator must cover MD plus the extra starting-surge
 * demand of the largest motor within that demand (assuming other loads are already running
 * when it starts).
 */
export function calcGensetSizing(input: GensetSizingInput): GensetSizingResult {
  const {
    maxDemandValue,
    maxDemandUnit,
    loadPowerFactor,
    largestMotorKw,
    largestMotorPf,
    startingFactor,
    gensetPowerFactor,
    marginPercent,
    deratingFactor,
  } = input

  const runningKva =
    maxDemandUnit === 'kVA' ? maxDemandValue : maxDemandValue / Math.max(loadPowerFactor, 0.01)

  const largestMotorKva = largestMotorKw / Math.max(largestMotorPf, 0.01)
  const startingSurgeKva = Math.max(largestMotorKva * (startingFactor - 1), 0)

  const requiredKvaBeforeMargin = runningKva + startingSurgeKva
  const requiredKvaWithMargin = requiredKvaBeforeMargin * (1 + marginPercent / 100)
  const requiredKvaAfterDerating = requiredKvaWithMargin / Math.max(deratingFactor, 0.01)

  const { value: recommendedGensetKva, exceedsTable } = roundUpToStandard(
    requiredKvaAfterDerating,
    STANDARD_GENSET_SIZES_KVA,
  )
  const recommendedGensetKw = recommendedGensetKva * gensetPowerFactor

  return {
    runningKva,
    largestMotorKva,
    startingSurgeKva,
    requiredKvaBeforeMargin,
    requiredKvaWithMargin,
    requiredKvaAfterDerating,
    recommendedGensetKva,
    recommendedGensetKw,
    exceedsTable,
  }
}
