// Reproduced from BS7671:2018 Wiring Regulations, Table 4D4A / 4D4B:
// Multicore armoured (SWA) 70C thermoplastic (PVC) insulated cables, copper conductors.
// Ambient air temperature 30C, ground ambient 20C, conductor operating temperature 70C.
// Source cross-checked against a cable-manufacturer reproduction of the published BS7671
// table (Eland Cables). Verify against the current edition of BS7671 for critical designs.

export type InstallMethod = 'C' | 'E' | 'D1' | 'D2'
export type CoreConfig = 'twoCore' | 'threeOrFourCore' // 2-core single-phase/DC vs 3/4-core three-phase

export const INSTALL_METHODS: { id: InstallMethod; label: string }[] = [
  { id: 'C', label: 'Method C - clipped direct' },
  { id: 'E', label: 'Method E - free air / perforated tray' },
  { id: 'D1', label: 'Method D1 - ducting in ground' },
  { id: 'D2', label: 'Method D2 - direct buried' },
]

export const BS7671_CABLE_SIZES_MM2 = [
  1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240, 300, 400,
]

// Current-carrying capacity (A) - Table 4D4A
const AMPACITY: Record<InstallMethod, Record<CoreConfig, (number | null)[]>> = {
  C: {
    twoCore: [21, 28, 38, 49, 67, 89, 118, 145, 175, 222, 269, 310, 356, 405, 476, 547, 621],
    threeOrFourCore: [18, 25, 33, 42, 58, 77, 102, 125, 151, 192, 231, 267, 306, 348, 409, 469, 540],
  },
  E: {
    twoCore: [22, 31, 41, 53, 72, 97, 128, 157, 190, 241, 291, 336, 386, 439, 516, 592, 683],
    threeOrFourCore: [19, 26, 35, 45, 62, 83, 110, 135, 163, 207, 251, 290, 332, 378, 445, 510, 590],
  },
  D1: {
    twoCore: [22, 29, 37, 46, 60, 78, 99, 119, 140, 173, 204, 231, 261, 292, 336, 379, null],
    threeOrFourCore: [18, 24, 30, 38, 50, 64, 82, 98, 116, 143, 169, 192, 217, 243, 280, 316, null],
  },
  D2: {
    twoCore: [22, 28, 38, 48, 64, 83, 110, 132, 156, 192, 230, 261, 293, 331, 382, 472, null],
    threeOrFourCore: [19, 24, 33, 41, 54, 70, 92, 110, 130, 162, 193, 220, 246, 278, 320, 359, null],
  },
}

// Voltage drop (mV/A/m) - Table 4D4B. For >=25mm^2, resistance/reactance/impedance are given
// separately; below 25mm^2 reactance is considered negligible so only one (=z) value is given.
export interface VdEntry {
  z: number
  r: number
  x: number
}

const VD_SINGLE_PHASE: VdEntry[] = [
  { z: 29, r: 29, x: 0 },
  { z: 18, r: 18, x: 0 },
  { z: 11, r: 11, x: 0 },
  { z: 7.3, r: 7.3, x: 0 },
  { z: 4.4, r: 4.4, x: 0 },
  { z: 2.8, r: 2.8, x: 0 },
  { z: 1.75, r: 1.75, x: 0.17 },
  { z: 1.25, r: 1.25, x: 0.165 },
  { z: 0.94, r: 0.93, x: 0.165 },
  { z: 0.65, r: 0.63, x: 0.16 },
  { z: 0.5, r: 0.47, x: 0.155 },
  { z: 0.41, r: 0.38, x: 0.155 },
  { z: 0.34, r: 0.3, x: 0.155 },
  { z: 0.29, r: 0.25, x: 0.15 },
  { z: 0.24, r: 0.19, x: 0.15 },
  { z: 0.21, r: 0.155, x: 0.145 },
  { z: 0.185, r: 0.115, x: 0.145 },
]

const VD_THREE_PHASE: VdEntry[] = [
  { z: 25, r: 25, x: 0 },
  { z: 15, r: 15, x: 0 },
  { z: 9.5, r: 9.5, x: 0 },
  { z: 6.4, r: 6.4, x: 0 },
  { z: 3.8, r: 3.8, x: 0 },
  { z: 2.4, r: 2.4, x: 0 },
  { z: 1.5, r: 1.5, x: 0.145 },
  { z: 1.1, r: 1.1, x: 0.145 },
  { z: 0.81, r: 0.8, x: 0.14 },
  { z: 0.57, r: 0.55, x: 0.14 },
  { z: 0.43, r: 0.41, x: 0.135 },
  { z: 0.35, r: 0.33, x: 0.135 },
  { z: 0.29, r: 0.26, x: 0.13 },
  { z: 0.25, r: 0.21, x: 0.13 },
  { z: 0.21, r: 0.165, x: 0.13 },
  { z: 0.185, r: 0.135, x: 0.13 },
  { z: 0.16, r: 0.1, x: 0.125 },
]

// Table 4B1 - rating factor Ca for ambient air temperatures other than 30C, 70C thermoplastic.
export const AMBIENT_CORRECTION_70C: { tempC: number; factor: number }[] = [
  { tempC: 25, factor: 1.03 },
  { tempC: 30, factor: 1.0 },
  { tempC: 35, factor: 0.94 },
  { tempC: 40, factor: 0.87 },
  { tempC: 45, factor: 0.79 },
  { tempC: 50, factor: 0.71 },
  { tempC: 55, factor: 0.61 },
  { tempC: 60, factor: 0.5 },
  { tempC: 65, factor: 0.35 },
]

// Table 4C1 - grouping factor Cg for a single layer of multicore cables touching.
export const GROUPING_CORRECTION: { circuits: number; factor: number }[] = [
  { circuits: 1, factor: 1.0 },
  { circuits: 2, factor: 0.8 },
  { circuits: 3, factor: 0.7 },
  { circuits: 4, factor: 0.65 },
  { circuits: 5, factor: 0.6 },
  { circuits: 6, factor: 0.57 },
  { circuits: 7, factor: 0.54 },
  { circuits: 8, factor: 0.52 },
  { circuits: 9, factor: 0.5 },
  { circuits: 10, factor: 0.48 },
  { circuits: 12, factor: 0.45 },
  { circuits: 14, factor: 0.43 },
  { circuits: 16, factor: 0.41 },
  { circuits: 18, factor: 0.39 },
  { circuits: 20, factor: 0.38 },
]

export function lookupAmpacity(
  method: InstallMethod,
  core: CoreConfig,
  sizeMm2: number,
): number | null {
  const idx = BS7671_CABLE_SIZES_MM2.indexOf(sizeMm2)
  if (idx < 0) return null
  return AMPACITY[method][core][idx]
}

export type ConductorMaterial = 'copper' | 'aluminium'

// IEC 60228 standard conductor resistivity ratio: aluminium's resistivity is ~1.64x copper's
// (copper ~17.241 nOhm.m, aluminium ~28.264 nOhm.m at 20C - the ratio is independent of
// temperature). Reactance per unit length depends on conductor geometry/spacing, not material,
// so for a given nominal cross-section it is taken as unchanged; only resistance is scaled.
export const ALUMINIUM_RESISTIVITY_RATIO = 1.64

export function lookupVdEntry(
  core: CoreConfig,
  sizeMm2: number,
  material: ConductorMaterial = 'copper',
): VdEntry | null {
  const idx = BS7671_CABLE_SIZES_MM2.indexOf(sizeMm2)
  if (idx < 0) return null
  const copperEntry = (core === 'twoCore' ? VD_SINGLE_PHASE : VD_THREE_PHASE)[idx]
  if (material === 'copper') return copperEntry

  const r = copperEntry.r * ALUMINIUM_RESISTIVITY_RATIO
  const x = copperEntry.x
  const z = x > 0 ? Math.sqrt(r * r + x * x) : copperEntry.z * ALUMINIUM_RESISTIVITY_RATIO
  return { r, x, z }
}

/** Ambient temperature correction factor Ca, linearly interpolated between table points. */
export function ambientCorrectionFactor(tempC: number): number {
  const table = AMBIENT_CORRECTION_70C
  if (tempC <= table[0].tempC) return table[0].factor
  if (tempC >= table[table.length - 1].tempC) return table[table.length - 1].factor
  for (let i = 0; i < table.length - 1; i++) {
    const a = table[i]
    const b = table[i + 1]
    if (tempC >= a.tempC && tempC <= b.tempC) {
      const t = (tempC - a.tempC) / (b.tempC - a.tempC)
      return a.factor + t * (b.factor - a.factor)
    }
  }
  return 1
}

/** Grouping correction factor Cg for a given number of touching circuits (nearest table entry). */
export function groupingCorrectionFactor(circuits: number): number {
  const table = GROUPING_CORRECTION
  if (circuits <= table[0].circuits) return table[0].factor
  if (circuits >= table[table.length - 1].circuits) return table[table.length - 1].factor
  for (let i = 0; i < table.length - 1; i++) {
    const a = table[i]
    const b = table[i + 1]
    if (circuits >= a.circuits && circuits <= b.circuits) {
      const t = (circuits - a.circuits) / (b.circuits - a.circuits)
      return a.factor + t * (b.factor - a.factor)
    }
  }
  return 1
}
