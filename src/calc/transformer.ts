import { roundUpToStandard, STANDARD_TRANSFORMER_SIZES_KVA, type Phase } from './tables'

export interface TransformerFlaInput {
  kva: number
  voltage: number
  phase: Phase
}

/** Transformer full-load current on a given (primary or secondary) winding. */
export function calcTransformerFla(input: TransformerFlaInput): number {
  const { kva, voltage, phase } = input
  if (voltage <= 0) return 0
  return phase === 3 ? (kva * 1000) / (Math.sqrt(3) * voltage) : (kva * 1000) / voltage
}

export interface TransformerSizingInput {
  connectedLoadKva: number
  demandFactor: number // 0-1, diversity/utilization of connected load
  marginPercent: number // growth/safety margin, e.g. 20
}

export interface TransformerSizingResult {
  demandKva: number
  requiredKva: number
  recommendedKva: number
  exceedsTable: boolean
}

export function sizeTransformer(input: TransformerSizingInput): TransformerSizingResult {
  const { connectedLoadKva, demandFactor, marginPercent } = input
  const demandKva = connectedLoadKva * demandFactor
  const requiredKva = demandKva * (1 + marginPercent / 100)
  const { value: recommendedKva, exceedsTable } = roundUpToStandard(
    requiredKva,
    STANDARD_TRANSFORMER_SIZES_KVA,
  )
  return { demandKva, requiredKva, recommendedKva, exceedsTable }
}
