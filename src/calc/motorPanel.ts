import type { CoreConfig, InstallMethod } from './bs7671Tables'
import { sizeCableBS7671, sizeEarthConductor, type CableSizingResult, type EarthSizingResult } from './cable'
import { calcFlc } from './flc'
import {
  MOTOR_STARTING_FACTORS,
  roundUpToStandard,
  STANDARD_BREAKER_SIZES,
  type Phase,
  type StartingMethodId,
} from './tables'

export interface MotorGroupInput {
  id: string
  kW: number
  quantity: number
  phase: Phase
  startingMethod: StartingMethodId
  startingFactor: number // amps multiplier during starting, from the motor's own datasheet/nameplate
}

export interface MotorPanelInput {
  motors: MotorGroupInput[]
  voltage: number // panel supply, line-to-line (3-phase). Single-phase motors run at voltage/sqrt(3), line-to-neutral.
  powerFactor: number
  efficiency: number
  marginPercent: number // safety margin applied on top of running + starting surge
  installMethod: InstallMethod
  ambientTempC: number
  groupedCircuits: number
}

export interface MotorUnitDetail {
  groupId: string
  kW: number
  phase: Phase
  flcA: number // this unit's own branch current
  kva: number // apparent power, phase-independent - used to aggregate onto the 3-phase incomer
  kwElectrical: number // real electrical input power (shaft kW / efficiency)
  startingFactor: number
  startingSurgeKva: number // kva x (factor - 1): this unit's marginal contribution if it were the one starting
}

export interface MotorPanelResult {
  units: MotorUnitDetail[]
  totalRunningKva: number
  totalRunningKw: number
  worstCaseStartingUnit: MotorUnitDetail | null
  requiredKvaBeforeMargin: number
  requiredKvaWithMargin: number
  incomingRunningA: number
  incomingMccbA: number
  incomingMccbExceedsTable: boolean
  incomingCable: CableSizingResult
  incomingEarth: EarthSizingResult
}

export function getStartingFactorDefault(method: StartingMethodId): number {
  return MOTOR_STARTING_FACTORS.find((m) => m.id === method)?.default ?? 1
}

const SQRT3 = Math.sqrt(3)

/**
 * Motor control panel incoming MCCB / cable / earth sizing.
 *
 * Single-phase and three-phase motors cannot simply have their branch currents added together
 * onto a three-phase incomer - a 1-phase load only loads two of the three incoming conductors
 * (or one line + neutral), while a 3-phase load loads all three equally. Loading is therefore
 * aggregated in kVA (phase-independent apparent power, assuming single-phase loads are
 * reasonably balanced across the three phases) and only converted back to an incomer line
 * current at the end, using the standard 3-phase current formula:
 *   Incomer A = (total running kVA + worst single motor's starting-surge kVA) x margin,
 *   converted via I = kVA x 1000 / (sqrt(3) x V)
 * This assumes staggered (cascaded) starting: only one motor starts at a time while the others
 * are already running. Starting all motors simultaneously produces much higher combined inrush.
 *
 * Cable and earth sizing use BS7671 Table 4D4A/4D4B (copper SWA/PVC) with ambient temperature
 * and grouping correction factors - see calc/cable.ts and calc/bs7671Tables.ts.
 */
export function calcMotorPanel(input: MotorPanelInput): MotorPanelResult {
  const {
    motors,
    voltage,
    powerFactor,
    efficiency,
    marginPercent,
    installMethod,
    ambientTempC,
    groupedCircuits,
  } = input

  const units: MotorUnitDetail[] = []
  for (const group of motors) {
    const branchVoltage = group.phase === 3 ? voltage : voltage / SQRT3
    const flc = calcFlc({
      inputType: 'kW',
      value: group.kW,
      voltage: branchVoltage,
      phase: group.phase,
      powerFactor,
      efficiency,
      isMotor: true,
    })

    for (let i = 0; i < Math.max(group.quantity, 0); i++) {
      units.push({
        groupId: group.id,
        kW: group.kW,
        phase: group.phase,
        flcA: flc.current,
        kva: flc.kVA,
        kwElectrical: flc.kW,
        startingFactor: group.startingFactor,
        startingSurgeKva: flc.kVA * (group.startingFactor - 1),
      })
    }
  }

  const totalRunningKva = units.reduce((sum, u) => sum + u.kva, 0)
  const totalRunningKw = units.reduce((sum, u) => sum + u.kwElectrical, 0)

  let worstCaseStartingUnit: MotorUnitDetail | null = null
  for (const u of units) {
    if (!worstCaseStartingUnit || u.startingSurgeKva > worstCaseStartingUnit.startingSurgeKva) {
      worstCaseStartingUnit = u
    }
  }

  const requiredKvaBeforeMargin = totalRunningKva + (worstCaseStartingUnit?.startingSurgeKva ?? 0)
  const requiredKvaWithMargin = requiredKvaBeforeMargin * (1 + marginPercent / 100)

  const incomingRequiredA = (requiredKvaWithMargin * 1000) / (SQRT3 * voltage)
  const { value: incomingMccbA, exceedsTable: incomingMccbExceedsTable } = roundUpToStandard(
    incomingRequiredA,
    STANDARD_BREAKER_SIZES,
  )

  const runningKvaWithMargin = totalRunningKva * (1 + marginPercent / 100)
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
    units,
    totalRunningKva,
    totalRunningKw,
    worstCaseStartingUnit,
    requiredKvaBeforeMargin,
    requiredKvaWithMargin,
    incomingRunningA,
    incomingMccbA,
    incomingMccbExceedsTable,
    incomingCable,
    incomingEarth,
  }
}
