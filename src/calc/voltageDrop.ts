import type { Phase } from './tables'

export type ConductorMaterial = 'copper' | 'aluminium'

// Resistivity (ohm.mm^2/m) at typical conductor operating temperature (70-90C), i.e. already
// includes the ~1.2-1.3x increase over the 20C value - standard practice for VD design checks.
const RESISTIVITY_AT_OPERATING_TEMP: Record<ConductorMaterial, number> = {
  copper: 0.0225,
  aluminium: 0.036,
}

export interface VoltageDropInput {
  current: number // A
  lengthM: number // one-way route length, m
  csaMm2: number // conductor cross-section, mm^2
  material: ConductorMaterial
  phase: Phase
  systemVoltage: number // nominal V (line-to-line for 3ph, line-to-neutral or line-to-line for 1ph as applicable)
}

export interface VoltageDropResult {
  voltDrop: number // V
  percentDrop: number
  withinLimit5pct: boolean
}

/** Resistive-only voltage drop estimate (reactance neglected - reasonable for cables <=95mm^2). */
export function calcVoltageDrop(input: VoltageDropInput): VoltageDropResult {
  const { current, lengthM, csaMm2, material, phase, systemVoltage } = input
  const rho = RESISTIVITY_AT_OPERATING_TEMP[material]
  if (csaMm2 <= 0 || systemVoltage <= 0) {
    return { voltDrop: 0, percentDrop: 0, withinLimit5pct: true }
  }

  const voltDrop =
    phase === 3
      ? (Math.sqrt(3) * current * lengthM * rho) / csaMm2
      : (2 * current * lengthM * rho) / csaMm2

  const percentDrop = (voltDrop / systemVoltage) * 100
  return { voltDrop, percentDrop, withinLimit5pct: percentDrop <= 5 }
}
