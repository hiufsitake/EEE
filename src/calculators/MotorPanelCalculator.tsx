import { useMemo, useState } from 'react'
import { INSTALL_METHODS, type InstallMethod } from '../calc/bs7671Tables'
import type { DemandUnit } from '../calc/genset'
import { calcMotorPanel } from '../calc/motorPanel'
import { MOTOR_STARTING_FACTORS, getStartingFactorDefault, type StartingMethodId } from '../calc/tables'
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

export default function MotorPanelCalculator() {
  const [voltage, setVoltage] = useState(415)
  const [totalConnectedLoadKw, setTotalConnectedLoadKw] = useState(90)
  const [maxDemandValue, setMaxDemandValue] = useState(66.7)
  const [maxDemandUnit, setMaxDemandUnit] = useState<DemandUnit>('kW')
  const [loadPowerFactor, setLoadPowerFactor] = useState(0.85)

  const [largestMotorKw, setLargestMotorKw] = useState(15)
  const [largestMotorPf, setLargestMotorPf] = useState(0.85)
  const [startingMethod, setStartingMethod] = useState<StartingMethodId>('star-delta')
  const [startingFactor, setStartingFactor] = useState(getStartingFactorDefault('star-delta'))

  const [marginPercent, setMarginPercent] = useState(20)
  const [installMethod, setInstallMethod] = useState<InstallMethod>('C')
  const [ambientTempC, setAmbientTempC] = useState(30)
  const [groupedCircuits, setGroupedCircuits] = useState(1)

  const result = useMemo(
    () =>
      calcMotorPanel({
        voltage,
        totalConnectedLoadKw,
        maxDemandValue,
        maxDemandUnit,
        loadPowerFactor,
        largestMotorKw,
        largestMotorPf,
        startingFactor,
        marginPercent,
        installMethod,
        ambientTempC,
        groupedCircuits,
      }),
    [
      voltage,
      totalConnectedLoadKw,
      maxDemandValue,
      maxDemandUnit,
      loadPowerFactor,
      largestMotorKw,
      largestMotorPf,
      startingFactor,
      marginPercent,
      installMethod,
      ambientTempC,
      groupedCircuits,
    ],
  )

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle>Motor Control Panel Sizing</SectionTitle>
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          Incoming MCCB, cable (BS7671 Table 4D4A) and earth sizing from the panel's Total
          Connected Load and Maximum Demand, plus the largest motor's starting-surge demand.
        </p>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <NumberField id="voltage" label="Panel Supply Voltage (L-L)" value={voltage} onChange={setVoltage} suffix="V" />
          <NumberField
            id="tcl"
            label="Total Connected Load (TCL)"
            value={totalConnectedLoadKw}
            onChange={setTotalConnectedLoadKw}
            suffix="kW"
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
        </div>

        <div className="mt-4 mb-2 text-sm font-medium text-slate-600 dark:text-slate-300">
          Largest Motor Within the Demand (for starting surge)
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <NumberField
            id="motorkw"
            label="Motor Rating"
            value={largestMotorKw}
            onChange={setLargestMotorKw}
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
            id="factor"
            label="Starting Factor"
            value={startingFactor}
            onChange={setStartingFactor}
            step={0.1}
          />
        </div>

        <div className="mt-4 mb-2 text-sm font-medium text-slate-600 dark:text-slate-300">
          Incoming Cable
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SelectField
            id="installMethod"
            label="Installation Method"
            value={installMethod}
            onChange={setInstallMethod}
            options={INSTALL_METHODS.map((m) => ({ value: m.id, label: m.label }))}
          />
          <NumberField id="ambient" label="Ambient Temperature" value={ambientTempC} onChange={setAmbientTempC} suffix="C" />
          <NumberField
            id="grouped"
            label="Grouped Circuits (touching)"
            value={groupedCircuits}
            onChange={(v) => setGroupedCircuits(Math.max(1, Math.round(v)))}
            step={1}
          />
          <NumberField
            id="margin"
            label="Safety Margin"
            value={marginPercent}
            onChange={setMarginPercent}
            suffix="%"
          />
        </div>
      </Card>

      <Card>
        <SectionTitle>Result</SectionTitle>
        <ResultGrid>
          <ResultStat label="Running load (from MD)" value={fmt(result.runningKva)} unit="kVA" />
          <ResultStat label="Largest motor" value={fmt(result.largestMotorKva)} unit="kVA" />
          <ResultStat label="Starting surge (extra)" value={fmt(result.startingSurgeKva)} unit="kVA" />
          <ResultStat label="Required (with margin)" value={fmt(result.requiredKvaWithMargin)} unit="kVA" />
          <ResultStat label="Incoming running current" value={fmt(result.incomingRunningA)} unit="A" />
          <ResultStat label="Incoming MCCB" value={fmt(result.incomingMccbA, 0)} unit="A" highlight />
          <ResultStat
            label="Incoming cable (BS7671)"
            value={result.incomingCable.selectedSizeMm2 !== null ? fmt(result.incomingCable.selectedSizeMm2, 1) : 'N/A'}
            unit="mm2"
            highlight
          />
          <ResultStat label="Earth / CPC conductor" value={fmt(result.incomingEarth.cpcMm2, 1)} unit="mm2" />
        </ResultGrid>

        {result.incomingCable.selectedSizeMm2 !== null && (
          <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Tabulated capacity {fmt(result.incomingCable.tabulatedCapacityAtSize ?? 0, 0)}A x Ca{' '}
            {fmt(result.incomingCable.ambientFactor, 2)} x Cg {fmt(result.incomingCable.groupingFactor, 2)} = corrected
            capacity {fmt(result.incomingCable.correctedCapacityAtSize ?? 0, 1)}A (must be at least the
            running current, {fmt(result.incomingRunningA, 1)}A).
          </div>
        )}

        {result.incomingMccbExceedsTable && (
          <div className="mt-3">
            <Note>
              Required current exceeds this app's standard breaker table - check manufacturer
              catalogues for larger frame sizes (e.g. ACB).
            </Note>
          </div>
        )}
        {result.incomingCable.selectedSizeMm2 === null && (
          <div className="mt-3">
            <Note>
              Required current exceeds the BS7671 Table 4D4A range for this installation method -
              consider parallel runs or busbar trunking.
            </Note>
          </div>
        )}

        <div className="mt-3">
          <Note>
            Total Connected Load is recorded for reference only - Maximum Demand (which already
            reflects diversity/coincidence factor) is what actually sizes the incomer. This
            assumes the largest motor starts while the rest of the demand is already running
            (staggered/cascaded starting) - starting everything at once produces much higher
            combined inrush and will nuisance-trip the incoming MCCB and cause excessive voltage
            dip. Cable/earth sizing use BS7671 Table 4D4A/4D4B (copper SWA/PVC) and Table 54.7 -
            verify installation method, grouping and ambient temperature match the real site
            conditions.
          </Note>
        </div>
      </Card>
    </div>
  )
}
