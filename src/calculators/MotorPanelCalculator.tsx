import { useMemo, useState } from 'react'
import { calcMotorPanel, getStartingFactorDefault, type MotorGroupInput } from '../calc/motorPanel'
import { MOTOR_STARTING_FACTORS, type StartingMethodId } from '../calc/tables'
import {
  Card,
  CheckboxField,
  Label,
  NumberField,
  Note,
  ResultGrid,
  ResultStat,
  SectionTitle,
  SelectField,
  fmt,
} from '../components/ui'

let nextId = 1
function makeMotor(kW = 15, quantity = 1, startingMethod: StartingMethodId = 'star-delta'): MotorGroupInput {
  return {
    id: String(nextId++),
    kW,
    quantity,
    startingMethod,
    startingFactor: getStartingFactorDefault(startingMethod),
  }
}

export default function MotorPanelCalculator() {
  const [motors, setMotors] = useState<MotorGroupInput[]>([makeMotor(15, 4, 'star-delta')])
  const [voltage, setVoltage] = useState(415)
  const [useAccurateFlc, setUseAccurateFlc] = useState(false)
  const [powerFactor, setPowerFactor] = useState(0.85)
  const [efficiency, setEfficiency] = useState(0.9)
  const [marginPercent, setMarginPercent] = useState(20)
  const [longRun, setLongRun] = useState(false)

  const result = useMemo(
    () =>
      calcMotorPanel({
        motors,
        voltage,
        useAccurateFlc,
        powerFactor,
        efficiency,
        marginPercent,
        longRunOrHighAmbient: longRun,
      }),
    [motors, voltage, useAccurateFlc, powerFactor, efficiency, marginPercent, longRun],
  )

  function updateMotor(id: string, patch: Partial<MotorGroupInput>) {
    setMotors((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)))
  }

  function updateStartingMethod(id: string, method: StartingMethodId) {
    setMotors((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, startingMethod: method, startingFactor: getStartingFactorDefault(method) } : m,
      ),
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle>Motor Control Panel Sizing</SectionTitle>
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          Incoming MCCB, cable and earth sizing for a panel feeding multiple motors, assuming
          staggered (cascaded) starting.
        </p>

        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <NumberField id="voltage" label="System Voltage" value={voltage} onChange={setVoltage} suffix="V" />
          <div>
            <Label>FLC Method</Label>
            <div className="flex h-[38px] items-center gap-2 text-sm">
              <CheckboxField
                id="accurate"
                label={useAccurateFlc ? 'Accurate (formula)' : 'Quick (kW x 2 @ 415V)'}
                checked={useAccurateFlc}
                onChange={setUseAccurateFlc}
              />
            </div>
          </div>
          {useAccurateFlc && (
            <>
              <NumberField
                id="pf"
                label="Power Factor"
                value={powerFactor}
                onChange={setPowerFactor}
                step={0.01}
              />
              <NumberField
                id="eff"
                label="Motor Efficiency"
                value={efficiency}
                onChange={setEfficiency}
                step={0.01}
              />
            </>
          )}
          <NumberField
            id="margin"
            label="Safety Margin"
            value={marginPercent}
            onChange={setMarginPercent}
            suffix="%"
          />
        </div>

        <div className="mb-2 flex items-center justify-between">
          <Label>Motors</Label>
          <button
            onClick={() => setMotors((prev) => [...prev, makeMotor()])}
            className="rounded-md bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-700"
          >
            + Add motor group
          </button>
        </div>

        <div className="space-y-2">
          {motors.map((m) => {
            const unit = result.units.find((u) => u.groupId === m.id)
            return (
              <div
                key={m.id}
                className="grid grid-cols-2 items-end gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-5 dark:border-slate-700"
              >
                <NumberField
                  id={`kw-${m.id}`}
                  label="Rating"
                  value={m.kW}
                  onChange={(v) => updateMotor(m.id, { kW: v })}
                  suffix="kW"
                />
                <NumberField
                  id={`qty-${m.id}`}
                  label="Quantity"
                  value={m.quantity}
                  onChange={(v) => updateMotor(m.id, { quantity: Math.max(0, Math.round(v)) })}
                  min={0}
                  step={1}
                />
                <SelectField
                  id={`method-${m.id}`}
                  label="Starting Method"
                  value={m.startingMethod}
                  onChange={(v) => updateStartingMethod(m.id, v)}
                  options={MOTOR_STARTING_FACTORS.map((s) => ({ value: s.id, label: s.label }))}
                />
                <NumberField
                  id={`factor-${m.id}`}
                  label="Starting Factor"
                  value={m.startingFactor}
                  onChange={(v) => updateMotor(m.id, { startingFactor: v })}
                  step={0.1}
                />
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    FLC/unit
                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {unit ? fmt(unit.flcA) : '-'} A
                    </div>
                  </div>
                  <button
                    onClick={() => setMotors((prev) => prev.filter((x) => x.id !== m.id))}
                    className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/40"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-3">
          <CheckboxField
            id="longrun"
            label="Cable run > 50m or high ambient temperature (bump cable one size)"
            checked={longRun}
            onChange={setLongRun}
          />
        </div>
      </Card>

      <Card>
        <SectionTitle>Result</SectionTitle>
        <ResultGrid>
          <ResultStat label="Total running FLC" value={fmt(result.totalRunningA)} unit="A" />
          <ResultStat
            label="Worst-case starting surge"
            value={fmt(result.worstCaseStartingUnit?.startingSurgeContributionA ?? 0)}
            unit="A"
          />
          <ResultStat
            label="Required (before margin)"
            value={fmt(result.requiredBeforeMarginA)}
            unit="A"
          />
          <ResultStat
            label="Required (with margin)"
            value={fmt(result.requiredWithMarginA)}
            unit="A"
          />
          <ResultStat
            label="Incoming MCCB"
            value={fmt(result.incomingMccbA, 0)}
            unit="A"
            highlight
          />
          <ResultStat
            label="Incoming cable"
            value={fmt(result.incomingCable.finalSizeMm2, 1)}
            unit="mm2"
            highlight
          />
          <ResultStat
            label="Earth / CPC conductor"
            value={fmt(result.incomingEarth.cpcMm2, 1)}
            unit="mm2"
          />
        </ResultGrid>

        {result.incomingMccbExceedsTable && (
          <div className="mt-3">
            <Note>
              Required current exceeds this app's standard breaker table - check manufacturer
              catalogues for larger frame sizes (e.g. ACB).
            </Note>
          </div>
        )}

        <div className="mt-3">
          <Note>
            Cascade (staggered) starting is assumed and mandatory: starting all motors at once
            produces much higher combined inrush (each motor at FLC x starting factor
            simultaneously) and will nuisance-trip the incoming MCCB and cause excessive voltage
            dip. Cable/earth sizing use the field rule-of-thumb (I/4 up to 130A, I/2.5 above) and
            the phase-based CPC rule - verify against full IEC 60364 ampacity tables for the
            actual installation method, grouping and ambient temperature before finalizing.
          </Note>
        </div>
      </Card>
    </div>
  )
}
