import { useMemo, useState } from 'react'
import { BS7671_CABLE_SIZES_MM2, type CoreConfig } from '../calc/bs7671Tables'
import { calcVoltageDropBS7671 } from '../calc/cable'
import {
  Card,
  CheckboxField,
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
  const [sizeMm2, setSizeMm2] = useState(35)
  const [coreConfig, setCoreConfig] = useState<CoreConfig>('threeOrFourCore')
  const [usePf, setUsePf] = useState(false)
  const [powerFactor, setPowerFactor] = useState(0.85)
  const [systemVoltage, setSystemVoltage] = useState(415)

  const result = useMemo(
    () =>
      calcVoltageDropBS7671({
        designCurrent: current,
        lengthM,
        sizeMm2,
        coreConfig,
        powerFactor: usePf ? powerFactor : undefined,
      }),
    [current, lengthM, sizeMm2, coreConfig, usePf, powerFactor],
  )

  const percentDrop = systemVoltage > 0 ? (result.voltDrop / systemVoltage) * 100 : 0

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle>Voltage Drop</SectionTitle>
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          BS7671 Table 4D4B mV/A/m data (copper, SWA/PVC 70C) - the same cable as Table 4D4A
          ampacity. Uses tabulated impedance (z), or resistance/reactance combined with the
          circuit's power factor (r cos-phi + x sin-phi) for cables 25mm2 and above.
        </p>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <NumberField id="current" label="Load Current" value={current} onChange={setCurrent} suffix="A" />
          <NumberField id="length" label="Route Length" value={lengthM} onChange={setLengthM} suffix="m" />
          <SelectField
            id="size"
            label="Conductor CSA"
            value={String(sizeMm2)}
            onChange={(v) => setSizeMm2(Number(v))}
            options={BS7671_CABLE_SIZES_MM2.map((s) => ({ value: String(s), label: `${s} mm2` }))}
          />
          <SelectField
            id="core"
            label="Circuit"
            value={coreConfig}
            onChange={setCoreConfig}
            options={[
              { value: 'threeOrFourCore', label: '3-phase (3/4-core)' },
              { value: 'twoCore', label: '1-phase / DC (2-core)' },
            ]}
          />
          <NumberField
            id="voltage"
            label="System Voltage"
            value={systemVoltage}
            onChange={setSystemVoltage}
            suffix="V"
          />
          <div className="flex items-center">
            <CheckboxField
              id="usepf"
              label="Use load power factor (r cos-phi + x sin-phi)"
              checked={usePf}
              onChange={setUsePf}
            />
          </div>
          {usePf && (
            <NumberField
              id="pf"
              label="Power Factor"
              value={powerFactor}
              onChange={setPowerFactor}
              step={0.01}
            />
          )}
        </div>
      </Card>

      <Card>
        <SectionTitle>Result</SectionTitle>
        <ResultGrid>
          <ResultStat label="mV/A/m used" value={fmt(result.mvPerAPerM, 3)} />
          <ResultStat label="Voltage Drop" value={fmt(result.voltDrop)} unit="V" highlight />
          <ResultStat label="Percent Drop" value={fmt(percentDrop)} unit="%" highlight />
          <ResultStat label="Within 5% guideline" value={percentDrop <= 5 ? 'Yes' : 'No - oversize cable'} />
        </ResultGrid>
        {!result.found && (
          <div className="mt-3">
            <Note>No Table 4D4B entry for this cross-section.</Note>
          </div>
        )}
        <div className="mt-3">
          <Note>
            5% is a common guideline (BS7671 for LV installations under normal conditions,
            sometimes split 3%/5% across distribution/final circuits) - check the applicable
            regulation/local code for the actual limit that applies.
          </Note>
        </div>
      </Card>
    </div>
  )
}
