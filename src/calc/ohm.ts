export interface OhmInput {
  voltage?: number
  current?: number
  resistance?: number
}

export interface OhmResult {
  voltage: number
  current: number
  resistance: number
  power: number
  solvedFor: 'voltage' | 'current' | 'resistance' | null
}

/** Solves Ohm's law from exactly two of {V, I, R}; returns null solvedFor if inputs are insufficient/ambiguous. */
export function solveOhm(input: OhmInput): OhmResult {
  const { voltage: v, current: i, resistance: r } = input
  const known = [v, i, r].filter((x) => x !== undefined && !Number.isNaN(x)).length

  if (known < 2) return { voltage: 0, current: 0, resistance: 0, power: 0, solvedFor: null }

  if (v === undefined || Number.isNaN(v)) {
    const voltage = (i as number) * (r as number)
    return { voltage, current: i as number, resistance: r as number, power: voltage * (i as number), solvedFor: 'voltage' }
  }
  if (i === undefined || Number.isNaN(i)) {
    const current = (r as number) !== 0 ? v / (r as number) : 0
    return { voltage: v, current, resistance: r as number, power: v * current, solvedFor: 'current' }
  }
  const resistance = i !== 0 ? v / i : 0
  return { voltage: v, current: i, resistance, power: v * i, solvedFor: 'resistance' }
}

export interface PowerTriangleInput {
  voltage: number
  current: number
  powerFactor: number // 0-1
  phase: 1 | 3
}

export interface PowerTriangleResult {
  activePowerKw: number
  apparentPowerKva: number
  reactivePowerKvar: number
}

export function calcPowerTriangle(input: PowerTriangleInput): PowerTriangleResult {
  const { voltage, current, powerFactor, phase } = input
  const apparentPowerKva =
    phase === 3 ? (Math.sqrt(3) * voltage * current) / 1000 : (voltage * current) / 1000
  const activePowerKw = apparentPowerKva * powerFactor
  const phi = Math.acos(Math.min(Math.max(powerFactor, 0), 1))
  const reactivePowerKvar = apparentPowerKva * Math.sin(phi)
  return { activePowerKw, apparentPowerKva, reactivePowerKvar }
}
