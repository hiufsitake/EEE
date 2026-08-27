import { roundUpToStandard, STANDARD_GENSET_SIZES_KVA } from './tables'

export interface GensetLoadInput {
  id: string
  label: string
  kW: number
  quantity: number
  powerFactor: number // load's own PF, used to convert kW -> kVA
  demandFactor: number // 0-1, diversity/utilization factor for this load
  isMotor: boolean
  startingFactor: number // only used if isMotor
}

export interface GensetSizingInput {
  loads: GensetLoadInput[]
  gensetPowerFactor: number // typical diesel genset rated PF, default 0.8
  marginPercent: number // safety/future-growth margin, default 20-25
  deratingFactor: number // altitude/temperature/fuel derating, 0-1 (1 = no derating)
}

export interface GensetLoadDetail {
  id: string
  label: string
  runningKw: number
  runningKva: number
  startingSurgeKvaContribution: number // one unit's (startingFactor-1) x runningKva, if isMotor
}

export interface GensetSizingResult {
  loadDetails: GensetLoadDetail[]
  totalRunningKw: number
  totalRunningKva: number
  worstCaseStartingLoad: GensetLoadDetail | null
  requiredStartingKva: number
  requiredKvaBeforeMargin: number
  requiredKvaWithMargin: number
  requiredKvaAfterDerating: number
  recommendedGensetKva: number
  recommendedGensetKw: number
  exceedsTable: boolean
}

/**
 * Genset (standby/prime diesel generator) sizing from a load schedule.
 * Mirrors the motor-panel staggered-start logic: the generator must cover the sum of all
 * running loads plus the extra starting-surge demand of whichever single motor load causes
 * the largest jump above its own running kVA (assumes staggered/soft starting of large motors,
 * not all-at-once DOL starting).
 */
export function calcGensetSizing(input: GensetSizingInput): GensetSizingResult {
  const { loads, marginPercent, deratingFactor } = input

  const loadDetails: GensetLoadDetail[] = loads.map((l) => {
    const runningKwPerUnit = l.kW * l.demandFactor
    const runningKvaPerUnit = runningKwPerUnit / Math.max(l.powerFactor, 0.01)
    const runningKw = runningKwPerUnit * l.quantity
    const runningKva = runningKvaPerUnit * l.quantity
    const startingSurgeKvaContribution = l.isMotor
      ? runningKvaPerUnit * (l.startingFactor - 1)
      : 0
    return { id: l.id, label: l.label, runningKw, runningKva, startingSurgeKvaContribution }
  })

  const totalRunningKw = loadDetails.reduce((s, l) => s + l.runningKw, 0)
  const totalRunningKva = loadDetails.reduce((s, l) => s + l.runningKva, 0)

  let worstCaseStartingLoad: GensetLoadDetail | null = null
  for (const l of loadDetails) {
    if (
      !worstCaseStartingLoad ||
      l.startingSurgeKvaContribution > worstCaseStartingLoad.startingSurgeKvaContribution
    ) {
      worstCaseStartingLoad = l
    }
  }

  const requiredStartingKva = totalRunningKva + (worstCaseStartingLoad?.startingSurgeKvaContribution ?? 0)
  const requiredKvaBeforeMargin = Math.max(totalRunningKva, requiredStartingKva)
  const requiredKvaWithMargin = requiredKvaBeforeMargin * (1 + marginPercent / 100)
  const requiredKvaAfterDerating = requiredKvaWithMargin / Math.max(deratingFactor, 0.01)

  const { value: recommendedGensetKva, exceedsTable } = roundUpToStandard(
    requiredKvaAfterDerating,
    STANDARD_GENSET_SIZES_KVA,
  )
  const recommendedGensetKw = recommendedGensetKva * input.gensetPowerFactor

  return {
    loadDetails,
    totalRunningKw,
    totalRunningKva,
    worstCaseStartingLoad,
    requiredStartingKva,
    requiredKvaBeforeMargin,
    requiredKvaWithMargin,
    requiredKvaAfterDerating,
    recommendedGensetKva,
    recommendedGensetKw,
    exceedsTable,
  }
}
