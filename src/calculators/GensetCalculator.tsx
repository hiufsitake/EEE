import { useMemo, useState } from 'react'
import { calcGensetSizing, type GensetLoadInput } from '../calc/genset'
import {
  Card,
  CheckboxField,
  Label,
  NumberField,
  Note,
  ResultGrid,
  ResultStat,
  SectionTitle,
  fmt,
} from '../components/ui'

let nextId = 1
function makeLoad(label = 'Load', kW = 10, quantity = 1, isMotor = false): GensetLoadInput {
  return {
    id: String(nextId++),
    label,
    kW,
    quantity,
    powerFactor: 0.85,
    demandFactor: 1,
    isMotor,
    startingFactor: isMotor ? 6 : 1,
  }
}

export default function GensetCalculator() {
  const [loads, setLoads] = useState<GensetLoadInput[]>([
    makeLoad('Motor load', 15, 4, true),
    makeLoad('Lighting / small power', 8, 1, false),
  ])
  const [gensetPowerFactor, setGensetPowerFactor] = useState(0.8)
  const [marginPercent, setMarginPercent] = useState(25)
  const [deratingPercent, setDeratingPercent] = useState(0)

  const result = useMemo(
    () =>
      calcGensetSizing({
        loads,
        gensetPowerFactor,
        marginPercent,
        deratingFactor: 1 - deratingPercent / 100,
      }),
    [loads, gensetPowerFactor, marginPercent, deratingPercent],
  )

  function updateLoad(id: string, patch: Partial<GensetLoadInput>) {
    setLoads((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)))
  }

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle>Genset (Standby Generator) Sizing</SectionTitle>
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          Sizes a diesel generator from a load schedule, accounting for diversity and the
          starting-surge demand of the largest motor load (staggered start assumed).
        </p>

        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <NumberField
            id="gpf"
            label="Genset Rated PF"
            value={gensetPowerFactor}
            onChange={setGensetPowerFactor}
            step={0.01}
          />
          <NumberField
            id="gmargin"
            label="Safety / Growth Margin"
            value={marginPercent}
            onChange={setMarginPercent}
            suffix="%"
          />
          <NumberField
            id="gderate"
            label="Altitude / Temp Derating"
            value={deratingPercent}
            onChange={setDeratingPercent}
            suffix="%"
          />
        </div>

        <div className="mb-2 flex items-center justify-between">
          <Label>Load Schedule</Label>
          <button
            onClick={() => setLoads((prev) => [...prev, makeLoad()])}
            className="rounded-md bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-700"
          >
            + Add load
          </button>
        </div>

        <div className="space-y-2">
          {loads.map((l) => {
            const detail = result.loadDetails.find((d) => d.id === l.id)
            return (
              <div
                key={l.id}
                className="grid grid-cols-2 items-end gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-7 dark:border-slate-700"
              >
                <div className="col-span-2 sm:col-span-1">
                  <Label htmlFor={`label-${l.id}`}>Description</Label>
                  <input
                    id={`label-${l.id}`}
                    value={l.label}
                    onChange={(e) => updateLoad(l.id, { label: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 outline-none focus:border-sky-500 sm:text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
                <NumberField
                  id={`kw-${l.id}`}
                  label="kW / unit"
                  value={l.kW}
                  onChange={(v) => updateLoad(l.id, { kW: v })}
                />
                <NumberField
                  id={`qty-${l.id}`}
                  label="Qty"
                  value={l.quantity}
                  onChange={(v) => updateLoad(l.id, { quantity: Math.max(0, Math.round(v)) })}
                  step={1}
                />
                <NumberField
                  id={`pf-${l.id}`}
                  label="PF"
                  value={l.powerFactor}
                  onChange={(v) => updateLoad(l.id, { powerFactor: v })}
                  step={0.01}
                />
                <NumberField
                  id={`demand-${l.id}`}
                  label="Demand Factor"
                  value={l.demandFactor}
                  onChange={(v) => updateLoad(l.id, { demandFactor: v })}
                  step={0.05}
                />
                <div>
                  <CheckboxField
                    id={`motor-${l.id}`}
                    label="Motor load"
                    checked={l.isMotor}
                    onChange={(v) => updateLoad(l.id, { isMotor: v })}
                  />
                  {l.isMotor && (
                    <div className="mt-1">
                      <NumberField
                        id={`sf-${l.id}`}
                        label="Starting factor"
                        value={l.startingFactor}
                        onChange={(v) => updateLoad(l.id, { startingFactor: v })}
                        step={0.5}
                      />
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Running
                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {detail ? fmt(detail.runningKva) : '-'} kVA
                    </div>
                  </div>
                  <button
                    onClick={() => setLoads((prev) => prev.filter((x) => x.id !== l.id))}
                    className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/40"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      <Card>
        <SectionTitle>Result</SectionTitle>
        <ResultGrid>
          <ResultStat label="Total running load" value={fmt(result.totalRunningKw)} unit="kW" />
          <ResultStat label="Total running kVA" value={fmt(result.totalRunningKva)} unit="kVA" />
          <ResultStat
            label="Worst-case starting kVA"
            value={fmt(result.requiredStartingKva)}
            unit="kVA"
          />
          <ResultStat
            label="Required (with margin/derating)"
            value={fmt(result.requiredKvaAfterDerating)}
            unit="kVA"
          />
          <ResultStat
            label="Recommended Genset"
            value={fmt(result.recommendedGensetKva, 1)}
            unit="kVA"
            highlight
          />
          <ResultStat
            label="Recommended Genset"
            value={fmt(result.recommendedGensetKw, 1)}
            unit="kW"
            highlight
          />
        </ResultGrid>

        {result.exceedsTable && (
          <div className="mt-3">
            <Note>
              Required rating exceeds this app's standard genset table - larger sets are usually
              custom/paralleled units; consult manufacturer datasheets.
            </Note>
          </div>
        )}

        <div className="mt-3">
          <Note>
            This sizes for steady-state running load plus the largest single motor's starting
            surge (staggered starting assumed). For panels with multiple large motors that may
            start together, or for step-load/frequency-dip requirements, verify against the
            generator manufacturer's transient performance data.
          </Note>
        </div>
      </Card>
    </div>
  )
}
