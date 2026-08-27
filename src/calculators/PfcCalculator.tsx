import { useMemo, useState } from 'react'
import { calcPfc } from '../calc/pfc'
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

export default function PfcCalculator() {
  const [kW, setKW] = useState(100)
  const [existingPf, setExistingPf] = useState(0.75)
  const [targetPf, setTargetPf] = useState(0.95)
  const [voltage, setVoltage] = useState(415)
  const [phase, setPhase] = useState<Phase>(3)

  const result = useMemo(
    () => calcPfc({ kW, existingPf, targetPf, voltage, phase }),
    [kW, existingPf, targetPf, voltage, phase],
  )

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle>Power Factor Correction Capacitor Sizing</SectionTitle>
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          Required capacitor bank kVAR to raise a load's power factor to a target value.
        </p>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <NumberField id="kw" label="Active Load" value={kW} onChange={setKW} suffix="kW" />
          <NumberField
            id="epf"
            label="Existing PF"
            value={existingPf}
            onChange={setExistingPf}
            step={0.01}
          />
          <NumberField
            id="tpf"
            label="Target PF"
            value={targetPf}
            onChange={setTargetPf}
            step={0.01}
          />
          <NumberField id="voltage" label="Voltage" value={voltage} onChange={setVoltage} suffix="V" />
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
      </Card>

      <Card>
        <SectionTitle>Result</SectionTitle>
        <ResultGrid>
          <ResultStat
            label="Required Capacitor Bank"
            value={fmt(result.requiredKvar)}
            unit="kVAR"
            highlight
          />
          <ResultStat label="Capacitor Current" value={fmt(result.capacitorCurrent)} unit="A" />
          <ResultStat label="Existing Apparent Power" value={fmt(result.existingKva)} unit="kVA" />
          <ResultStat label="Apparent Power After Correction" value={fmt(result.targetKva)} unit="kVA" />
        </ResultGrid>
      </Card>
    </div>
  )
}
