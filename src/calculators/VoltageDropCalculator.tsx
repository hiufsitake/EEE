import { useMemo, useState } from 'react'
import { calcVoltageDrop, type ConductorMaterial } from '../calc/voltageDrop'
import type { Phase } from '../calc/tables'
import {
  Card,
  NumberField,
  Note,
  ResultGrid,
  ResultStat,
  SectionTitle,
  SelectField,
  fmt,
} from '../components/ui'

export default function VoltageDropCalculator() {
  const [current, setCurrent] = useState(100)
  const [lengthM, setLengthM] = useState(50)
  const [csaMm2, setCsaMm2] = useState(35)
  const [material, setMaterial] = useState<ConductorMaterial>('copper')
  const [phase, setPhase] = useState<Phase>(3)
  const [systemVoltage, setSystemVoltage] = useState(415)

  const result = useMemo(
    () => calcVoltageDrop({ current, lengthM, csaMm2, material, phase, systemVoltage }),
    [current, lengthM, csaMm2, material, phase, systemVoltage],
  )

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle>Voltage Drop</SectionTitle>
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          Resistive-only estimate (reactance neglected - reasonable for cables up to ~95mm2).
        </p>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <NumberField id="current" label="Load Current" value={current} onChange={setCurrent} suffix="A" />
          <NumberField id="length" label="Route Length" value={lengthM} onChange={setLengthM} suffix="m" />
          <NumberField id="csa" label="Conductor CSA" value={csaMm2} onChange={setCsaMm2} suffix="mm2" />
          <SelectField
            id="material"
            label="Material"
            value={material}
            onChange={setMaterial}
            options={[
              { value: 'copper', label: 'Copper' },
              { value: 'aluminium', label: 'Aluminium' },
            ]}
          />
          <SelectField
            id="phase"
            label="Phase"
            value={String(phase) as '1' | '3'}
            onChange={(v) => setPhase(Number(v) as Phase)}
            options={[
              { value: '3', label: '3-phase' },
              { value: '1', label: '1-phase (P+N loop)' },
            ]}
          />
          <NumberField
            id="voltage"
            label="System Voltage"
            value={systemVoltage}
            onChange={setSystemVoltage}
            suffix="V"
          />
        </div>
      </Card>

      <Card>
        <SectionTitle>Result</SectionTitle>
        <ResultGrid>
          <ResultStat label="Voltage Drop" value={fmt(result.voltDrop)} unit="V" highlight />
          <ResultStat label="Percent Drop" value={fmt(result.percentDrop)} unit="%" highlight />
          <ResultStat
            label="Within 5% guideline"
            value={result.withinLimit5pct ? 'Yes' : 'No - oversize cable'}
          />
        </ResultGrid>
        <div className="mt-3">
          <Note>
            5% is a common guideline (e.g. BS7671 for LV installations under normal conditions,
            sometimes split 3%/5% across distribution/final circuits) - check the applicable
            local code for the actual limit.
          </Note>
        </div>
      </Card>
    </div>
  )
}
