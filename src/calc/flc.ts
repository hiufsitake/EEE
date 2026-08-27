import type { Phase } from './tables'

export type LoadInputType = 'kW' | 'kVA' | 'HP'

export interface FlcInput {
  inputType: LoadInputType
  value: number // kW, kVA or HP depending on inputType
  voltage: number // line-to-line for 3-phase, line-to-neutral/line for 1-phase
  phase: Phase
  powerFactor: number // 0-1, ignored for kVA input
  efficiency: number // 0-1
  // If true, `value` (kW) is shaft/output power and is divided by efficiency to get real
  // electrical input power - i.e. this is a motor rating, not an already-electrical load.
  // Always true for HP input (HP is inherently a motor shaft rating); ignored for kVA input.
  isMotor?: boolean
}

export interface FlcResult {
  current: number // A
  kW: number
  kVA: number
}

const HP_TO_KW = 0.746

/** Full load current from an electrical load's rating. */
export function calcFlc(input: FlcInput): FlcResult {
  const { inputType, value, voltage, phase, powerFactor, efficiency, isMotor } = input
  if (voltage <= 0) return { current: 0, kW: 0, kVA: 0 }

  if (inputType === 'kVA') {
    const kVA = value
    const kW = value * powerFactor
    const current =
      phase === 3 ? (value * 1000) / (Math.sqrt(3) * voltage) : (value * 1000) / voltage
    return { current, kW, kVA }
  }

  const shaftKw = inputType === 'HP' ? value * HP_TO_KW : value
  const treatAsMotor = inputType === 'HP' || isMotor === true
  const realInputKw = treatAsMotor ? shaftKw / Math.max(efficiency, 0.01) : shaftKw
  const kVA = realInputKw / Math.max(powerFactor, 0.01)
  const current =
    phase === 3
      ? (realInputKw * 1000) / (Math.sqrt(3) * voltage * powerFactor)
      : (realInputKw * 1000) / (voltage * powerFactor)

  return { current, kW: realInputKw, kVA }
}
