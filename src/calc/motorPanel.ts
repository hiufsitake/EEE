import type { CoreConfig, InstallMethod } from './bs7671Tables'
import { sizeCableBS7671, sizeEarthConductor, type CableSizingResult, type EarthSizingResult } from './cable'
import { roundUpToStandard, STANDARD_BREAKER_SIZES } from './tables'
import type { DemandUnit } from './genset'

export interface MotorPanelInput {
  voltage: number // panel supply, line-to-line (3-phase incomer)
  totalConnectedLoadKw: number // TCL - for reference/record only, not used in the sizing math
  maxDemandValue: number // MD - the actual expected running demand (already reflects diversity)
  maxDemandUnit: DemandUnit
  loadPowerFactor: number // used to convert MD to kVA when maxDemandUnit is 'kW'
  largestMotorKw: number // largest single motor within the demand, for starting surge
  largestMotorPf: number
  startingFactor: number // motor starting current multiplier, from datasheet/nameplate
  marginPercent: number // safety margin applied on top of running + starting surge
  installMethod: InstallMethod
  ambientTempC: number
  groupedCircuits: number
}

export interface MotorPanelResult {
  runningKva: number
  largestMotorKva: number
  startingSurgeKva: number
  requiredKvaBeforeMargin: number
  requiredKvaWithMargin: number
  incomingRunningA: number
  incomingMccbA: number
  incomingMccbExceedsTable: boolean
  incomingCable: CableSizingResult
  incomingEarth: EarthSizingResult
}

const SQRT3 = Math.sqrt(3)

/**
 * Motor control panel incoming MCCB / cable / earth sizing from Total Connected Load (TCL,
 * recorded for reference only) and Maximum Demand (MD, the actual expected running load -
 * already reflects diversity/coincidence factor), plus the largest motor within that demand
 * for the starting-surge contribution:
 *   Incoming (A) = (MD as kVA + largest motor's starting-surge kVA) x margin,
 *   converted via I = kVA x 1000 / (sqrt(3) x V)
 * This assumes staggered (cascaded) starting: the largest motor starts while the rest of the
 * demand is already running. Starting all motors simultaneously produces much higher combined
 * inrush.
 *
 * Cable and earth sizing use the IEC 60364-5-52 ampacity method (MS IEC 60364-5-52 / BS7671
 * Appendix 4, copper SWA/PVC) with ambient temperature and grouping correction factors - see
 * calc/cable.ts and calc/bs7671Tables.ts.
 */
export function calcMotorPanel(input: MotorPanelInput): MotorPanelResult {
  const {
    voltage,
    maxDemandValue,
    maxDemandUnit,
    loadPowerFactor,
    largestMotorKw,
    largestMotorPf,
    startingFactor,
    marginPercent,
    installMethod,
    ambientTempC,
    groupedCircuits,
  } = input

  const runningKva =
    maxDemandUnit === 'kVA' ? maxDemandValue : maxDemandValue / Math.max(loadPowerFactor, 0.01)

  const largestMotorKva = largestMotorKw / Math.max(largestMotorPf, 0.01)
  const startingSurgeKva = Math.max(largestMotorKva * (startingFactor - 1), 0)

  const requiredKvaBeforeMargin = runningKva + startingSurgeKva
  const requiredKvaWithMargin = requiredKvaBeforeMargin * (1 + marginPercent / 100)

  const incomingRequiredA = (requiredKvaWithMargin * 1000) / (SQRT3 * voltage)
  const { value: incomingMccbA, exceedsTable: incomingMccbExceedsTable } = roundUpToStandard(
    incomingRequiredA,
    STANDARD_BREAKER_SIZES,
  )

  const runningKvaWithMargin = runningKva * (1 + marginPercent / 100)
  const incomingRunningA = (runningKvaWithMargin * 1000) / (SQRT3 * voltage)

  const incomingCable = sizeCableBS7671({
    designCurrent: incomingRunningA,
    installMethod,
    coreConfig: 'threeOrFourCore' as CoreConfig,
    ambientTempC,
    groupedCircuits,
  })
  const incomingEarth = sizeEarthConductor(incomingCable.selectedSizeMm2 ?? 0)

  return {
    runningKva,
    largestMotorKva,
    startingSurgeKva,
    requiredKvaBeforeMargin,
    requiredKvaWithMargin,
    incomingRunningA,
    incomingMccbA,
    incomingMccbExceedsTable,
    incomingCable,
    incomingEarth,
  }
}
