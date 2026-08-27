export interface PfcInput {
  kW: number
  existingPf: number // 0-1
  targetPf: number // 0-1
  voltage: number
  phase: 1 | 3
}

export interface PfcResult {
  requiredKvar: number
  existingKva: number
  targetKva: number
  capacitorCurrent: number
}

/** Power-factor-correction capacitor bank sizing: Qc = P x (tan(phi1) - tan(phi2)). */
export function calcPfc(input: PfcInput): PfcResult {
  const { kW, existingPf, targetPf, voltage, phase } = input
  const phi1 = Math.acos(Math.min(Math.max(existingPf, 0.01), 1))
  const phi2 = Math.acos(Math.min(Math.max(targetPf, 0.01), 1))
  const requiredKvar = Math.max(kW * (Math.tan(phi1) - Math.tan(phi2)), 0)

  const existingKva = kW / Math.max(existingPf, 0.01)
  const targetKva = kW / Math.max(targetPf, 0.01)

  const capacitorCurrent =
    voltage > 0
      ? phase === 3
        ? (requiredKvar * 1000) / (Math.sqrt(3) * voltage)
        : (requiredKvar * 1000) / voltage
      : 0

  return { requiredKvar, existingKva, targetKva, capacitorCurrent }
}
