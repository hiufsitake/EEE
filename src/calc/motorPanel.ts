import { sizeCableByRuleOfThumb, sizeEarthConductor } from './cable'
import { quickMotorFlc415, calcFlc } from './flc'
import {
  MOTOR_STARTING_FACTORS,
  roundUpToStandard,
  STANDARD_BREAKER_SIZES,
  type StartingMethodId,
} from './tables'

export interface MotorGroupInput {
  id: string
  kW: number
  quantity: number
  startingMethod: StartingMethodId
  startingFactor: number // amps multiplier during starting, e.g. 3 for star-delta
}

export interface MotorPanelInput {
  motors: MotorGroupInput[]
  voltage: number // line-to-line, default 415
  useAccurateFlc: boolean // false = quick field rule kW*2 (415V only), true = calcFlc formula
  powerFactor: number // used only when useAccurateFlc
  efficiency: number // used only when useAccurateFlc
  marginPercent: number // safety margin applied on top of running + starting surge, default 20
  longRunOrHighAmbient: boolean
}

export interface MotorUnitDetail {
  groupId: string
  kW: number
  flcA: number
  startingFactor: number
  startingSurgeContributionA: number // FLC * (factor - 1), this unit's marginal contribution if it were the one starting
}

export interface MotorPanelResult {
  units: MotorUnitDetail[]
  totalRunningA: number
  worstCaseStartingUnit: MotorUnitDetail | null
  requiredBeforeMarginA: number
  requiredWithMarginA: number
  incomingMccbA: number
  incomingMccbExceedsTable: boolean
  incomingCable: ReturnType<typeof sizeCableByRuleOfThumb>
  incomingEarth: ReturnType<typeof sizeEarthConductor>
}

export function getStartingFactorDefault(method: StartingMethodId): number {
  return MOTOR_STARTING_FACTORS.find((m) => m.id === method)?.default ?? 1
}

/**
 * Motor control panel incoming MCCB / cable / earth sizing, following common field practice:
 *  Incoming (A) = SUM(all motors' FLC) + [worst single motor's FLC x (startingFactor - 1)] , +margin
 * This assumes staggered (cascaded) starting: only one motor starts at a time while the
 * others are already running at full load current. Starting all motors simultaneously
 * produces much higher inrush and must be avoided (or the panel must be sized for it).
 */
export function calcMotorPanel(input: MotorPanelInput): MotorPanelResult {
  const {
    motors,
    voltage,
    useAccurateFlc,
    powerFactor,
    efficiency,
    marginPercent,
    longRunOrHighAmbient,
  } = input

  const units: MotorUnitDetail[] = []
  for (const group of motors) {
    const flcA = useAccurateFlc
      ? calcFlc({
          inputType: 'kW',
          value: group.kW,
          voltage,
          phase: 3,
          powerFactor,
          efficiency,
        }).current
      : quickMotorFlc415(group.kW)

    for (let i = 0; i < Math.max(group.quantity, 0); i++) {
      units.push({
        groupId: group.id,
        kW: group.kW,
        flcA,
        startingFactor: group.startingFactor,
        startingSurgeContributionA: flcA * (group.startingFactor - 1),
      })
    }
  }

  const totalRunningA = units.reduce((sum, u) => sum + u.flcA, 0)

  let worstCaseStartingUnit: MotorUnitDetail | null = null
  for (const u of units) {
    if (
      !worstCaseStartingUnit ||
      u.startingSurgeContributionA > worstCaseStartingUnit.startingSurgeContributionA
    ) {
      worstCaseStartingUnit = u
    }
  }

  const requiredBeforeMarginA =
    totalRunningA + (worstCaseStartingUnit?.startingSurgeContributionA ?? 0)
  const requiredWithMarginA = requiredBeforeMarginA * (1 + marginPercent / 100)

  const { value: incomingMccbA, exceedsTable: incomingMccbExceedsTable } = roundUpToStandard(
    requiredWithMarginA,
    STANDARD_BREAKER_SIZES,
  )

  const runningWithMarginA = totalRunningA * (1 + marginPercent / 100)
  const incomingCable = sizeCableByRuleOfThumb({
    current: runningWithMarginA,
    longRunOrHighAmbient,
  })
  const incomingEarth = sizeEarthConductor(incomingCable.finalSizeMm2)

  return {
    units,
    totalRunningA,
    worstCaseStartingUnit,
    requiredBeforeMarginA,
    requiredWithMarginA,
    incomingMccbA,
    incomingMccbExceedsTable,
    incomingCable,
    incomingEarth,
  }
}
