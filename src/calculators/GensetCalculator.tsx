import { useMemo, useState } from 'react'
import { calcGensetSizing, type DemandUnit } from '../calc/genset'
import {
  MOTOR_STARTING_FACTORS,
  getStartingFactorDefault,
  recommendedStartingMethod,
  type StartingMethodId,
} from '../calc/tables'
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

export default function GensetCalculator() {
  const [totalConnectedLoadKw, setTotalConnectedLoadKw] = useState(150)
  const [diversityFactor, setDiversityFactor] = useState(0.8)
  const [maxDemandValue, setMaxDemandValue] = useState(90)
  const [maxDemandUnit, setMaxDemandUnit] = useState<DemandUnit>('kW')
  const [loadPowerFactor, setLoadPowerFactor] = useState(0.85)

  const calculatedMdKw = totalConnectedLoadKw * diversityFactor

  const [largestMotorKw, setLargestMotorKw] = useState(15)
  const [largestMotorPf, setLargestMotorPf] = useState(0.85)
  const [startingMethod, setStartingMethod] = useState<StartingMethodId>('star-delta')
  const [startingFactor, setStartingFactor] = useState(getStartingFactorDefault('star-delta'))

  const [gensetPowerFactor, setGensetPowerFactor] = useState(0.8)
  const [marginPercent, setMarginPercent] = useState(25)
  const [deratingPercent, setDeratingPercent] = useState(0)

  const result = useMemo(
    () =>
      calcGensetSizing({
        totalConnectedLoadKw,
        maxDemandValue,
        maxDemandUnit,
        loadPowerFactor,
        largestMotorKw,
        largestMotorPf,
        startingFactor,
        gensetPowerFactor,
        marginPercent,
        deratingFactor: 1 - deratingPercent / 100,
      }),
    [
      totalConnectedLoadKw,
      maxDemandValue,
      maxDemandUnit,
      loadPowerFactor,
      largestMotorKw,
      largestMotorPf,
      startingFactor,
      gensetPowerFactor,
      marginPercent,
      deratingPercent,
    ],
  )

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle>Genset (Standby Generator) Sizing</SectionTitle>
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          Sizes a diesel generator from the site's Total Connected Load and Maximum Demand,
          accounting for the largest motor's starting-surge demand (staggered start assumed).
        </p>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <NumberField
            id="tcl"
            label="Total Connected Load (TCL)"
            value={totalConnectedLoadKw}
            onChange={setTotalConnectedLoadKw}
            suffix="kW"
          />
          <NumberField
            id="diversity"
            label="Diversity Factor"
            value={diversityFactor}
            onChange={setDiversityFactor}
            step={0.05}
          />
          <NumberField
            id="md"
            label="Maximum Demand (MD)"
            value={maxDemandValue}
            onChange={setMaxDemandValue}
            suffix={maxDemandUnit}
          />
          <SelectField
            id="mdunit"
            label="MD Unit"
            value={maxDemandUnit}
            onChange={setMaxDemandUnit}
            options={[
              { value: 'kW', label: 'kW' },
              { value: 'kVA', label: 'kVA' },
            ]}
          />
          {maxDemandUnit === 'kW' && (
            <NumberField
              id="loadpf"
              label="Load Power Factor"
              value={loadPowerFactor}
              onChange={setLoadPowerFactor}
              step={0.01}
            />
          )}
          <div className="flex items-end">
            <button
              onClick={() => {
                setMaxDemandValue(Number(calculatedMdKw.toFixed(2)))
                setMaxDemandUnit('kW')
              }}
              className="w-full rounded-md border border-sky-300 bg-sky-50 px-3 py-2.5 text-sm text-sky-700 hover:bg-sky-100 dark:border-sky-700 dark:bg-sky-950/40 dark:text-sky-300"
            >
              Use TCL x DF ({fmt(calculatedMdKw)} kW)
            </button>
          </div>
        </div>

        <div className="mt-4 mb-2 text-sm font-medium text-slate-600 dark:text-slate-300">
          Largest Motor Within the Demand (for starting surge)
        </div>
        <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
          Starting Method auto-suggests from the motor rating - override it if the actual
          starter differs.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <NumberField
            id="motorkw"
            label="Motor Rating"
            value={largestMotorKw}
            onChange={(v) => {
              setLargestMotorKw(v)
              const recommended = recommendedStartingMethod(v)
              setStartingMethod(recommended)
              setStartingFactor(getStartingFactorDefault(recommended))
            }}
            suffix="kW"
          />
          <NumberField
            id="motorpf"
            label="Motor PF"
            value={largestMotorPf}
            onChange={setLargestMotorPf}
            step={0.01}
          />
          <SelectField
            id="method"
            label="Starting Method"
            value={startingMethod}
            onChange={(v) => {
              setStartingMethod(v)
              setStartingFactor(getStartingFactorDefault(v))
            }}
            options={MOTOR_STARTING_FACTORS.map((s) => ({ value: s.id, label: s.label }))}
          />
          <NumberField
            id="sf"
            label="Starting Factor"
            value={startingFactor}
            onChange={setStartingFactor}
            step={0.1}
          />
        </div>

        <div className="mt-4 mb-2 text-sm font-medium text-slate-600 dark:text-slate-300">
          Generator
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
      </Card>

      <Card>
        <SectionTitle>Result</SectionTitle>
        <ResultGrid>
          <ResultStat label="Running load (from MD)" value={fmt(result.runningKva)} unit="kVA" />
          <ResultStat label="Largest motor" value={fmt(result.largestMotorKva)} unit="kVA" />
          <ResultStat
            label="Starting surge (extra)"
            value={fmt(result.startingSurgeKva)}
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
            Maximum Demand (which reflects diversity/coincidence factor) is what actually sizes
            the generator's running capacity - use "Use TCL x DF" to derive it from Total
            Connected Load, or enter a Maximum Demand already known from elsewhere. This assumes
            the largest motor starts while the rest of the demand is
            already running (staggered starting) - for multiple large motors that may start
            together, or step-load/frequency-dip requirements, verify against the generator
            manufacturer's transient performance data.
          </Note>
        </div>
      </Card>
    </div>
  )
}
