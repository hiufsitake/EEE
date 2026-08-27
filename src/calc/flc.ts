import type { Phase } from './tables'

export type LoadInputType = 'kW' | 'kVA' | 'HP'

export interface FlcInput {
  inputType: LoadInputType
  value: number // kW, kVA or HP depending on inputType
  voltage: number // line-to-line for 3-phase, line-to-neutral/line for 1-phase
  phase: Phase
  powerFactor: number // 0-1, ignored for kVA input
  efficiency: number // 0-1, only applied for HP (motor) input
}

export interface FlcResult {
  current: number // A
  kW: number
  kVA: number
}

const HP_TO_KW = 0.746

/** Full load current from an electrical load's rating. */
export function calcFlc(input: FlcInput): FlcResult {
  const { inputType, value, voltage, phase, powerFactor, efficiency } = input
  if (voltage <= 0) return { current: 0, kW: 0, kVA: 0 }

  let current: number
  let kW: number
  let kVA: number

  if (inputType === 'kVA') {
    kVA = value
    kW = value * powerFactor
    current =
      phase === 3
        ? (value * 1000) / (Math.sqrt(3) * voltage)
        : (value * 1000) / voltage
  } else {
    const inputKw = inputType === 'HP' ? value * HP_TO_KW : value
    // Motor (HP) loads: input shaft power, real input power is higher due to efficiency losses.
    const realInputKw = inputType === 'HP' ? inputKw / Math.max(efficiency, 0.01) : inputKw
    kW = realInputKw
    kVA = realInputKw / Math.max(powerFactor, 0.01)
    current =
      phase === 3
        ? (realInputKw * 1000) / (Math.sqrt(3) * voltage * powerFactor)
        : (realInputKw * 1000) / (voltage * powerFactor)
  }

  return { current, kW, kVA }
}

/** Quick rule-of-thumb estimate widely used in the field for 415V 3-phase motors: kW x 2 ~= FLC (A). */
export function quickMotorFlc415(kW: number): number {
  return kW * 2
}
