import { useMemo, useState } from 'react'
import { calcPowerTriangle, solveOhm } from '../calc/ohm'
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

export default function OhmCalculator() {
  const [voltage, setVoltage] = useState<number | undefined>(230)
  const [current, setCurrent] = useState<number | undefined>(10)
  const [resistance, setResistance] = useState<number | undefined>(undefined)

  const ohm = useMemo(() => solveOhm({ voltage, current, resistance }), [voltage, current, resistance])

  const [ptVoltage, setPtVoltage] = useState(415)
  const [ptCurrent, setPtCurrent] = useState(50)
  const [ptPf, setPtPf] = useState(0.85)
  const [ptPhase, setPtPhase] = useState<Phase>(3)
  const triangle = useMemo(
    () => calcPowerTriangle({ voltage: ptVoltage, current: ptCurrent, powerFactor: ptPf, phase: ptPhase }),
    [ptVoltage, ptCurrent, ptPf, ptPhase],
  )

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle>Ohm's Law</SectionTitle>
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          Fill any two of Voltage / Current / Resistance to solve the third. Clear a field to
          recompute it.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <NumberField
            id="v"
            label="Voltage"
            value={voltage ?? NaN}
            onChange={(v) => setVoltage(Number.isNaN(v) ? undefined : v)}
            suffix="V"
          />
          <NumberField
            id="i"
            label="Current"
            value={current ?? NaN}
            onChange={(v) => setCurrent(Number.isNaN(v) ? undefined : v)}
            suffix="A"
          />
          <NumberField
            id="r"
            label="Resistance"
            value={resistance ?? NaN}
            onChange={(v) => setResistance(Number.isNaN(v) ? undefined : v)}
            suffix="ohm"
          />
        </div>
        <div className="mt-3">
          <ResultGrid>
            <ResultStat label="Voltage" value={fmt(ohm.voltage)} unit="V" highlight={ohm.solvedFor === 'voltage'} />
            <ResultStat label="Current" value={fmt(ohm.current)} unit="A" highlight={ohm.solvedFor === 'current'} />
            <ResultStat
              label="Resistance"
              value={fmt(ohm.resistance)}
              unit="ohm"
              highlight={ohm.solvedFor === 'resistance'}
            />
            <ResultStat label="Power" value={fmt(ohm.power)} unit="W" />
          </ResultGrid>
        </div>
      </Card>

      <Card>
        <SectionTitle>Power Triangle</SectionTitle>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <NumberField id="ptv" label="Voltage" value={ptVoltage} onChange={setPtVoltage} suffix="V" />
          <NumberField id="pti" label="Current" value={ptCurrent} onChange={setPtCurrent} suffix="A" />
          <NumberField id="ptpf" label="Power Factor" value={ptPf} onChange={setPtPf} step={0.01} />
          <SelectField
            id="ptphase"
            label="Phase"
            value={String(ptPhase) as '1' | '3'}
            onChange={(v) => setPtPhase(Number(v) as Phase)}
            options={[
              { value: '3', label: '3-phase' },
              { value: '1', label: '1-phase' },
            ]}
          />
        </div>
        <div className="mt-3">
          <ResultGrid>
            <ResultStat label="Active Power (P)" value={fmt(triangle.activePowerKw)} unit="kW" highlight />
            <ResultStat label="Apparent Power (S)" value={fmt(triangle.apparentPowerKva)} unit="kVA" />
            <ResultStat label="Reactive Power (Q)" value={fmt(triangle.reactivePowerKvar)} unit="kVAR" />
          </ResultGrid>
        </div>
      </Card>
    </div>
  )
}
