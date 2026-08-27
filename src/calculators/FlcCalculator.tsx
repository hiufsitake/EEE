import { useMemo, useState } from 'react'
import { calcFlc, type LoadInputType } from '../calc/flc'
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

export default function FlcCalculator() {
  const [inputType, setInputType] = useState<LoadInputType>('kW')
  const [value, setValue] = useState(15)
  const [voltage, setVoltage] = useState(415)
  const [phase, setPhase] = useState<Phase>(3)
  const [powerFactor, setPowerFactor] = useState(0.85)
  const [efficiency, setEfficiency] = useState(0.9)

  const result = useMemo(
    () => calcFlc({ inputType, value, voltage, phase, powerFactor, efficiency }),
    [inputType, value, voltage, phase, powerFactor, efficiency],
  )

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle>Full Load Current (FLC)</SectionTitle>
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          Current drawn by a load from its rated power, voltage and power factor.
        </p>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <SelectField
            id="inputType"
            label="Rating given as"
            value={inputType}
            onChange={setInputType}
            options={[
              { value: 'kW', label: 'kW (real power)' },
              { value: 'kVA', label: 'kVA (apparent power)' },
              { value: 'HP', label: 'HP (motor shaft power)' },
            ]}
          />
          <NumberField
            id="value"
            label="Rating"
            value={value}
            onChange={setValue}
            suffix={inputType}
          />
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
          <NumberField id="voltage" label="Voltage" value={voltage} onChange={setVoltage} suffix="V" />
          {inputType !== 'kVA' && (
            <NumberField
              id="pf"
              label="Power Factor"
              value={powerFactor}
              onChange={setPowerFactor}
              step={0.01}
            />
          )}
          {inputType === 'HP' && (
            <NumberField
              id="eff"
              label="Efficiency"
              value={efficiency}
              onChange={setEfficiency}
              step={0.01}
            />
          )}
        </div>
      </Card>

      <Card>
        <SectionTitle>Result</SectionTitle>
        <ResultGrid>
          <ResultStat label="Full Load Current" value={fmt(result.current)} unit="A" highlight />
          <ResultStat label="Real Power" value={fmt(result.kW)} unit="kW" />
          <ResultStat label="Apparent Power" value={fmt(result.kVA)} unit="kVA" />
        </ResultGrid>
      </Card>
    </div>
  )
}
