import { useMemo, useState } from 'react'
import { INSTALL_METHODS, BS7671_CABLE_SIZES_MM2, type ConductorMaterial, type CoreConfig, type InstallMethod } from '../calc/bs7671Tables'
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
  const [material, setMaterial] = useState<ConductorMaterial>('copper')
  const [usePf, setUsePf] = useState(false)
  const [powerFactor, setPowerFactor] = useState(0.85)
  const [systemVoltage, setSystemVoltage] = useState(415)

  const [installMethod, setInstallMethod] = useState<InstallMethod>('C')
  const [ambientTempC, setAmbientTempC] = useState(30)
  const [groupedCircuits, setGroupedCircuits] = useState(1)

  const [useCustomMv, setUseCustomMv] = useState(false)
  const [customMvPerAPerM, setCustomMvPerAPerM] = useState(1.1)

  const result = useMemo(
    () =>
      calcVoltageDropBS7671({
        designCurrent: current,
        lengthM,
        sizeMm2,
        coreConfig,
        material,
        powerFactor: usePf ? powerFactor : undefined,
        installMethod,
        ambientTempC,
        groupedCircuits,
        customMvPerAPerM: useCustomMv ? customMvPerAPerM : undefined,
      }),
    [
      current,
      lengthM,
      sizeMm2,
      coreConfig,
      material,
      usePf,
      powerFactor,
      installMethod,
      ambientTempC,
      groupedCircuits,
      useCustomMv,
      customMvPerAPerM,
    ],
  )

  const percentDrop = systemVoltage > 0 ? (result.voltDrop / systemVoltage) * 100 : 0

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle>Voltage Drop</SectionTitle>
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          BS7671 Table 4D4B mV/A/m data (SWA/PVC 70C) - the same cable as Table 4D4A ampacity.
          Uses tabulated impedance (z), or resistance/reactance combined with the circuit's
          power factor (r cos-phi + x sin-phi) for cables 25mm2 and above.
        </p>

        <div className="mb-3">
          <CheckboxField
            id="usecustom"
            label="Use a known mV/A/m value instead (e.g. from a manufacturer datasheet)"
            checked={useCustomMv}
            onChange={setUseCustomMv}
          />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <NumberField id="current" label="Load Current" value={current} onChange={setCurrent} suffix="A" />
          <NumberField id="length" label="Route Length" value={lengthM} onChange={setLengthM} suffix="m" />
          <NumberField
            id="voltage"
            label="System Voltage"
            value={systemVoltage}
            onChange={setSystemVoltage}
            suffix="V"
          />

          {useCustomMv ? (
            <NumberField
              id="custommv"
              label="mV/A/m (from datasheet)"
              value={customMvPerAPerM}
              onChange={setCustomMvPerAPerM}
              step={0.001}
            />
          ) : (
            <>
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
              <SelectField
                id="material"
                label="Conductor Material"
                value={material}
                onChange={setMaterial}
                options={[
                  { value: 'copper', label: 'Copper' },
                  { value: 'aluminium', label: 'Aluminium' },
                ]}
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
            </>
          )}
        </div>

        {!useCustomMv && (
          <>
            <div className="mt-4 mb-2 text-sm font-medium text-slate-600 dark:text-slate-300">
              Installation (for the operating-temperature correction)
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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
            </div>
          </>
        )}
      </Card>

      <Card>
        <SectionTitle>Result</SectionTitle>
        <ResultGrid>
          <ResultStat label="mV/A/m used" value={fmt(result.mvPerAPerM, 3)} />
          <ResultStat label="Voltage Drop" value={fmt(result.voltDrop)} unit="V" highlight />
          <ResultStat label="Percent Drop" value={fmt(percentDrop)} unit="%" highlight />
          <ResultStat label="Within 5% guideline" value={percentDrop <= 5 ? 'Yes' : 'No - oversize cable'} />
          {!useCustomMv && (
            <>
              <ResultStat
                label="Corrected capacity (Iz)"
                value={result.correctedCapacityAtSize !== null ? fmt(result.correctedCapacityAtSize, 1) : 'N/A'}
                unit="A"
              />
              <ResultStat
                label="Load ratio (Ib/Iz)"
                value={result.loadRatio !== null ? fmt(result.loadRatio * 100, 0) : 'N/A'}
                unit="%"
              />
              <ResultStat label="Est. conductor temp" value={fmt(result.estimatedConductorTempC, 0)} unit="C" />
              <ResultStat label="Temp. correction (Ct)" value={fmt(result.ct, 3)} />
            </>
          )}
        </ResultGrid>
        {!result.found && (
          <div className="mt-3">
            <Note>No Table 4D4B entry for this cross-section.</Note>
          </div>
        )}
        {!useCustomMv && result.found && result.tabulatedCapacityAtSize === null && (
          <div className="mt-3">
            <Note>
              No Table 4D4A ampacity entry for this size/installation method, so the
              operating-temperature correction could not be computed (Ct assumed 1, i.e. full
              rated 70C - the standard's own worst case).
            </Note>
          </div>
        )}
        {!useCustomMv && material === 'aluminium' && (
          <div className="mt-3">
            <Note>
              Table 4D4B only publishes copper values. Aluminium figures here are derived from
              the copper resistance scaled by the IEC 60228 resistivity ratio (~1.64x); the
              reactance term is kept as published, since it depends on conductor geometry rather
              than material. Verify against the cable manufacturer's own aluminium data for a
              final design.
            </Note>
          </div>
        )}
        {useCustomMv ? (
          <div className="mt-3">
            <Note>
              Using your entered mV/A/m directly - no table lookup, material derivation or
              temperature correction is applied, since those all assume the app's own
              cable/installation data rather than an arbitrary supplied figure.
            </Note>
          </div>
        ) : (
          <div className="mt-3">
            <Note>
              The tabulated mV/A/m figures assume the conductor is at its full rated 70C - which
              only happens when it's loaded right up to its corrected capacity (Iz). Installation
              method, ambient temperature and grouping change Iz (BS7671 Tables 4D4A/4B1/4C1), and
              a cable loaded below Iz runs cooler, so its real resistance and voltage drop are
              lower than the raw table value - the BS7671 Appendix 4 "Ct" temperature correction
              factor applied above accounts for this.
            </Note>
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
