import { useMemo, useState } from 'react'
import { calcTransformerFla, sizeTransformer } from '../calc/transformer'
import type { DemandUnit } from '../calc/genset'
import type { Phase } from '../calc/tables'
import {
  Card,
  NumberField,
  ResultGrid,
  ResultStat,
  SectionTitle,
  SelectField,
  fmt,
} from '../components/ui'

export default function TransformerCalculator() {
  const [kva, setKva] = useState(500)
  const [voltage, setVoltage] = useState(415)
  const [phase, setPhase] = useState<Phase>(3)
  const fla = useMemo(() => calcTransformerFla({ kva, voltage, phase }), [kva, voltage, phase])

  const [connectedLoadValue, setConnectedLoadValue] = useState(510)
  const [connectedLoadUnit, setConnectedLoadUnit] = useState<DemandUnit>('kW')
  const [connectedLoadPf, setConnectedLoadPf] = useState(0.85)
  const [demandFactor, setDemandFactor] = useState(0.8)
  const [marginPercent, setMarginPercent] = useState(20)
  const connectedLoadKva =
    connectedLoadUnit === 'kVA' ? connectedLoadValue : connectedLoadValue / Math.max(connectedLoadPf, 0.01)
  const sizing = useMemo(
    () => sizeTransformer({ connectedLoadKva, demandFactor, marginPercent }),
    [connectedLoadKva, demandFactor, marginPercent],
  )

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle>Transformer Full Load Current</SectionTitle>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <NumberField id="kva" label="Transformer Rating" value={kva} onChange={setKva} suffix="kVA" />
          <NumberField id="voltage" label="Winding Voltage" value={voltage} onChange={setVoltage} suffix="V" />
          <SelectField
            id="phase"
            label="Phase"
            value={String(phase) as '1' | '3'}
            onChange={(v) => setPhase(Number(v) as Phase)}
            options={[
              { value: '3', label: '3-phase' },
              { value: '1', label: '1-phase' },
            ]}
          />
        </div>
        <div className="mt-3">
          <ResultGrid>
            <ResultStat label="Full Load Current" value={fmt(fla)} unit="A" highlight />
          </ResultGrid>
        </div>
      </Card>

      <Card>
        <SectionTitle>Transformer Sizing from Connected Load</SectionTitle>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <NumberField
            id="connected"
            label="Total Connected Load"
            value={connectedLoadValue}
            onChange={setConnectedLoadValue}
            suffix={connectedLoadUnit}
          />
          <SelectField
            id="connectedunit"
            label="Load Unit"
            value={connectedLoadUnit}
            onChange={setConnectedLoadUnit}
            options={[
              { value: 'kW', label: 'kW' },
              { value: 'kVA', label: 'kVA' },
            ]}
          />
          {connectedLoadUnit === 'kW' && (
            <NumberField
              id="connectedpf"
              label="Load Power Factor"
              value={connectedLoadPf}
              onChange={setConnectedLoadPf}
              step={0.01}
            />
          )}
          <NumberField
            id="demand"
            label="Demand / Diversity Factor"
            value={demandFactor}
            onChange={setDemandFactor}
            step={0.05}
          />
          <NumberField
            id="margin"
            label="Growth Margin"
            value={marginPercent}
            onChange={setMarginPercent}
            suffix="%"
          />
        </div>
        <div className="mt-3">
          <ResultGrid>
            <ResultStat label="Demand Load" value={fmt(sizing.demandKva)} unit="kVA" />
            <ResultStat label="Required Rating" value={fmt(sizing.requiredKva)} unit="kVA" />
            <ResultStat
              label="Recommended Transformer"
              value={fmt(sizing.recommendedKva, 0)}
              unit="kVA"
              highlight
            />
          </ResultGrid>
        </div>
      </Card>
    </div>
  )
}
