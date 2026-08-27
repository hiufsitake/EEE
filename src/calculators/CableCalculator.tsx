import { useMemo, useState } from 'react'
import { sizeCableByRuleOfThumb, sizeEarthConductor } from '../calc/cable'
import {
  Card,
  CheckboxField,
  NumberField,
  Note,
  ResultGrid,
  ResultStat,
  SectionTitle,
  fmt,
} from '../components/ui'

export default function CableCalculator() {
  const [current, setCurrent] = useState(100)
  const [longRun, setLongRun] = useState(false)

  const cable = useMemo(
    () => sizeCableByRuleOfThumb({ current, longRunOrHighAmbient: longRun }),
    [current, longRun],
  )
  const earth = useMemo(() => sizeEarthConductor(cable.finalSizeMm2), [cable.finalSizeMm2])

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle>Cable &amp; Earth (CPC) Sizing</SectionTitle>
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          Fast field rule-of-thumb for copper conductors (PVC/SWA/PVC): up to 130A use I/4, above
          130A use I/2.5, because thicker cables dissipate heat less efficiently per mm2.
        </p>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <NumberField id="current" label="Design Current" value={current} onChange={setCurrent} suffix="A" />
          <div className="flex items-center">
            <CheckboxField
              id="longrun"
              label="Run > 50m or high ambient heat (bump one size)"
              checked={longRun}
              onChange={setLongRun}
            />
          </div>
        </div>
      </Card>

      <Card>
        <SectionTitle>Result</SectionTitle>
        <ResultGrid>
          <ResultStat
            label="Rule used"
            value={cable.breakpointRuleUsed === '/4' ? 'I / 4' : 'I / 2.5'}
          />
          <ResultStat label="Theoretical minimum" value={fmt(cable.theoreticalMinMm2, 2)} unit="mm2" />
          <ResultStat label="Standard size" value={fmt(cable.standardSizeMm2, 1)} unit="mm2" />
          <ResultStat
            label="Final cable size"
            value={fmt(cable.finalSizeMm2, 1)}
            unit="mm2"
            highlight
          />
          <ResultStat label="Earth / CPC conductor" value={fmt(earth.cpcMm2, 1)} unit="mm2" highlight />
        </ResultGrid>

        {cable.bumpedForDerating && (
          <div className="mt-3">
            <Note>Bumped one standard size up for long run / high ambient temperature.</Note>
          </div>
        )}
        {cable.exceedsTable && (
          <div className="mt-3">
            <Note>
              Required size exceeds the standard single-core table - consider parallel runs or
              busbar trunking.
            </Note>
          </div>
        )}
        <div className="mt-3">
          <Note>{earth.ruleApplied}</Note>
        </div>
        <div className="mt-3">
          <Note>
            This is a quick field estimate, not a substitute for full IEC 60364 ampacity tables
            (installation method, grouping, ambient temperature derating) - always verify against
            the manufacturer's cable data sheet and local code for the final design.
          </Note>
        </div>
      </Card>
    </div>
  )
}
