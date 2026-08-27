import { useMemo, useState } from 'react'
import { INSTALL_METHODS, BS7671_CABLE_SIZES_MM2, type ConductorMaterial, type CoreConfig, type InstallMethod } from '../calc/bs7671Tables'
import { calcMaxAllowableCurrent, calcVoltageDropBS7671, calcVoltageDropPfcImpact } from '../calc/cable'
import { calcFlc } from '../calc/flc'
import type { Phase } from '../calc/tables'
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

type LoadInputMode = 'current' | 'kw'

export default function VoltageDropCalculator() {
  // --- Load ---
  const [loadInputMode, setLoadInputMode] = useState<LoadInputMode>('kw')
  const [totalConnectedLoadKw, setTotalConnectedLoadKw] = useState(87.5)
  const [efficiency, setEfficiency] = useState(0.95)
  const [demandFactorPercent, setDemandFactorPercent] = useState(80)
  const [directCurrent, setDirectCurrent] = useState(100)
  const [systemVoltage, setSystemVoltage] = useState(415)
  const [coreConfig, setCoreConfig] = useState<CoreConfig>('threeOrFourCore')
  const [powerFactor, setPowerFactor] = useState(0.85)
  const [usePf, setUsePf] = useState(false)

  const phase: Phase = coreConfig === 'threeOrFourCore' ? 3 : 1

  const dutyLoadCurrent = useMemo(
    () =>
      calcFlc({
        inputType: 'kW',
        value: totalConnectedLoadKw,
        voltage: systemVoltage,
        phase,
        powerFactor,
        efficiency,
        isMotor: true,
      }).current,
    [totalConnectedLoadKw, systemVoltage, phase, powerFactor, efficiency],
  )
  const kwModeCurrent = dutyLoadCurrent * (demandFactorPercent / 100)
  const current = loadInputMode === 'kw' ? kwModeCurrent : directCurrent

  // --- Cable & route ---
  const [lengthM, setLengthM] = useState(50)
  const [parallelSets, setParallelSets] = useState(1)
  const [sizeMm2, setSizeMm2] = useState(35)
  const [material, setMaterial] = useState<ConductorMaterial>('copper')
  const [useCustomMv, setUseCustomMv] = useState(false)
  const [customMvPerAPerM, setCustomMvPerAPerM] = useState(1.1)

  const [installMethod, setInstallMethod] = useState<InstallMethod>('C')
  const [ambientTempC, setAmbientTempC] = useState(30)
  const [groupedCircuits, setGroupedCircuits] = useState(1)

  // --- Compliance limit ---
  const [limitStandard, setLimitStandard] = useState<'bs7671' | 'jkr' | 'custom'>('bs7671')
  const [customLimitPercent, setCustomLimitPercent] = useState(4)
  const limitPercent =
    limitStandard === 'bs7671' ? 5 : limitStandard === 'jkr' ? 4 : customLimitPercent

  // --- PF correction ---
  const [checkPfc, setCheckPfc] = useState(false)
  const [existingPfForPfc, setExistingPfForPfc] = useState(0.85)
  const [targetPfForPfc, setTargetPfForPfc] = useState(0.95)

  const result = useMemo(
    () =>
      calcVoltageDropBS7671({
        designCurrent: current,
        lengthM,
        sizeMm2,
        coreConfig,
        material,
        powerFactor: loadInputMode === 'kw' || usePf ? powerFactor : undefined,
        installMethod,
        ambientTempC,
        groupedCircuits,
        parallelSets,
        customMvPerAPerM: useCustomMv ? customMvPerAPerM : undefined,
      }),
    [
      current,
      lengthM,
      sizeMm2,
      coreConfig,
      material,
      loadInputMode,
      usePf,
      powerFactor,
      installMethod,
      ambientTempC,
      groupedCircuits,
      parallelSets,
      useCustomMv,
      customMvPerAPerM,
    ],
  )

  const percentDrop = systemVoltage > 0 ? (result.voltDrop / systemVoltage) * 100 : 0
  const { maxVoltDropV, maxCurrentA } = useMemo(
    () => calcMaxAllowableCurrent(limitPercent, systemVoltage, result.mvPerAPerM, lengthM),
    [limitPercent, systemVoltage, result.mvPerAPerM, lengthM],
  )

  const overLimit = maxCurrentA !== null && current > maxCurrentA
  const rawSuggestedPf =
    overLimit && maxCurrentA ? existingPfForPfc * (current / maxCurrentA) : existingPfForPfc
  const suggestedPfImpossible = rawSuggestedPf >= 1
  const suggestedTargetPf = suggestedPfImpossible ? 0.999 : rawSuggestedPf

  const pfcImpact = useMemo(
    () =>
      checkPfc
        ? calcVoltageDropPfcImpact({
            designCurrent: current,
            existingPf: existingPfForPfc,
            targetPf: targetPfForPfc,
            systemVoltage,
            phase,
            lengthM,
            sizeMm2,
            coreConfig,
            material,
            installMethod,
            ambientTempC,
            groupedCircuits,
            parallelSets,
            customMvPerAPerM: useCustomMv ? customMvPerAPerM : undefined,
          })
        : null,
    [
      checkPfc,
      current,
      existingPfForPfc,
      targetPfForPfc,
      systemVoltage,
      phase,
      lengthM,
      sizeMm2,
      coreConfig,
      material,
      installMethod,
      ambientTempC,
      groupedCircuits,
      parallelSets,
      useCustomMv,
      customMvPerAPerM,
    ],
  )
  const pfcPercentBefore =
    pfcImpact && systemVoltage > 0 ? (pfcImpact.before.voltDrop / systemVoltage) * 100 : 0
  const pfcPercentAfter =
    pfcImpact && systemVoltage > 0 ? (pfcImpact.after.voltDrop / systemVoltage) * 100 : 0

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle>Load</SectionTitle>
        <div className="mb-3">
          <SelectField
            id="loadmode"
            label="Load Input"
            value={loadInputMode}
            onChange={setLoadInputMode}
            options={[
              { value: 'kw', label: 'From connected load (kW)' },
              { value: 'current', label: 'Direct current (A)' },
            ]}
          />
        </div>

        {loadInputMode === 'kw' ? (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <NumberField
                id="tcl"
                label="Total Connected Load"
                value={totalConnectedLoadKw}
                onChange={setTotalConnectedLoadKw}
                suffix="kW"
              />
              <NumberField id="efficiency" label="Efficiency" value={efficiency} onChange={setEfficiency} step={0.01} />
              <NumberField
                id="demandfactor"
                label="Actual Load Demand"
                value={demandFactorPercent}
                onChange={setDemandFactorPercent}
                suffix="%"
              />
              <NumberField id="pf" label="Power Factor" value={powerFactor} onChange={setPowerFactor} step={0.01} />
              <NumberField id="voltage" label="System Voltage" value={systemVoltage} onChange={setSystemVoltage} suffix="V" />
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
            </div>
            <div className="mt-3">
              <ResultGrid>
                <ResultStat label="Duty Load Current" value={fmt(dutyLoadCurrent)} unit="A" />
                <ResultStat label="Actual Design Current" value={fmt(kwModeCurrent)} unit="A" highlight />
              </ResultGrid>
            </div>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Duty Load Current = kW / (sqrt(3) x V x PF x efficiency); Actual Design Current
              applies the demand factor (e.g. motors are often rated 20-30% above the load they
              actually run at, to avoid overload).
            </p>
          </>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <NumberField id="current" label="Load Current" value={directCurrent} onChange={setDirectCurrent} suffix="A" />
            <NumberField id="voltage" label="System Voltage" value={systemVoltage} onChange={setSystemVoltage} suffix="V" />
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
            <div className="flex items-center">
              <CheckboxField
                id="usepf"
                label="Use load power factor (r cos-phi + x sin-phi)"
                checked={usePf}
                onChange={setUsePf}
              />
            </div>
            {usePf && (
              <NumberField id="pf" label="Power Factor" value={powerFactor} onChange={setPowerFactor} step={0.01} />
            )}
          </div>
        )}
      </Card>

      <Card>
        <SectionTitle>Cable &amp; Route</SectionTitle>
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          Armoured SWA/PVC copper cable, 70C mV/A/m data (BS7671 Table 4D4B, the same reference
          also used in Malaysian practice as MS IEC 60364-5-52) - the same cable as the ampacity
          table above.
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
          <NumberField id="length" label="Route Length" value={lengthM} onChange={setLengthM} suffix="m" />
          <NumberField
            id="parallelsets"
            label="Parallel Sets"
            value={parallelSets}
            onChange={(v) => setParallelSets(Math.max(1, Math.round(v)))}
            step={1}
            min={1}
          />

          {useCustomMv ? (
            <NumberField
              id="custommv"
              label="mV/A/m per set (from datasheet)"
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
                id="material"
                label="Conductor Material"
                value={material}
                onChange={setMaterial}
                options={[
                  { value: 'copper', label: 'Copper' },
                  { value: 'aluminium', label: 'Aluminium' },
                ]}
              />
            </>
          )}
        </div>

        {parallelSets > 1 && (
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {fmt(result.mvPerAPerMSingle, 3)} mV/A/m per set / {parallelSets} sets ={' '}
            {fmt(result.mvPerAPerM, 3)} mV/A/m combined. Each cable carries {fmt(result.perCableCurrent)}A
            (total current / {parallelSets}); if not using a custom mV/A/m value, remember the parallel
            sets also count towards Grouped Circuits below, since they touch each other.
          </p>
        )}

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
        <div className="mb-3">
          <SelectField
            id="limitstandard"
            label="Voltage Drop Limit"
            value={limitStandard}
            onChange={setLimitStandard}
            options={[
              { value: 'bs7671', label: 'BS7671 (5%)' },
              { value: 'jkr', label: 'JKR / MS IEC 60364-5-52 (4%)' },
              { value: 'custom', label: 'Custom' },
            ]}
          />
        </div>
        {limitStandard === 'custom' && (
          <div className="mb-3 max-w-xs">
            <NumberField
              id="customlimit"
              label="Custom Limit"
              value={customLimitPercent}
              onChange={setCustomLimitPercent}
              suffix="%"
              step={0.1}
            />
          </div>
        )}

        <ResultGrid>
          <ResultStat label="mV/A/m used" value={fmt(result.mvPerAPerM, 3)} />
          <ResultStat label="Voltage Drop" value={fmt(result.voltDrop)} unit="V" highlight />
          <ResultStat label="Percent Drop" value={fmt(percentDrop)} unit="%" highlight />
          <ResultStat
            label={`Within ${fmt(limitPercent, 1)}% limit`}
            value={percentDrop <= limitPercent ? 'Yes' : 'No - oversize cable'}
          />
          <ResultStat label="Max Allowable Voltage Drop" value={fmt(maxVoltDropV)} unit="V" />
          <ResultStat
            label="Max Allowable Current"
            value={maxCurrentA !== null ? fmt(maxCurrentA) : 'N/A'}
            unit="A"
          />
          {!useCustomMv && (
            <>
              <ResultStat
                label="Corrected capacity (Iz, per cable)"
                value={result.correctedCapacityAtSize !== null ? fmt(result.correctedCapacityAtSize, 1) : 'N/A'}
                unit="A"
              />
              <ResultStat
                label="Load ratio (per cable)"
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
              method, ambient temperature and grouping change Iz, and a cable loaded below Iz
              runs cooler, so its real resistance and voltage drop are lower than the raw table
              value - the IEC 60364-5-52 (MS IEC 60364-5-52 / BS7671 Appendix 4) "Ct" temperature
              correction factor applied above accounts for this.
            </Note>
          </div>
        )}
        <div className="mt-3">
          <Note>
            BS7671's 5% is a common general guideline for LV installations under normal
            conditions (sometimes split 3%/5% across distribution/final circuits); JKR
            (Malaysian Public Works Department) guidance, sourced from MS IEC 60364-5-52:2003,
            limits it to 4%. Check the applicable regulation/local code for the actual limit
            that governs the project.
          </Note>
        </div>
      </Card>

      <Card>
        <SectionTitle>Reduce Voltage Drop with Power Factor Correction</SectionTitle>
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          For the same real power, current is inversely proportional to power factor - a
          capacitor bank that corrects PF towards 1 reduces the current the cable actually
          carries, so voltage drop (which is directly proportional to current) falls too.
        </p>

        <div className="mb-3">
          <CheckboxField
            id="checkpfc"
            label="Check whether a capacitor bank would help"
            checked={checkPfc}
            onChange={setCheckPfc}
          />
        </div>

        {checkPfc && (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <NumberField
                id="existingpf"
                label="Existing Load PF"
                value={existingPfForPfc}
                onChange={setExistingPfForPfc}
                step={0.01}
              />
              <NumberField
                id="targetpf"
                label="Target PF"
                value={targetPfForPfc}
                onChange={setTargetPfForPfc}
                step={0.01}
              />
              <div className="flex flex-col justify-end">
                <button
                  onClick={() => setTargetPfForPfc(Number(suggestedTargetPf.toFixed(3)))}
                  disabled={!overLimit}
                  className="rounded-md border border-sky-300 bg-sky-50 px-3 py-2.5 text-sm text-sky-700 hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-sky-700 dark:bg-sky-950/40 dark:text-sky-300"
                >
                  {overLimit
                    ? `Use suggested PF (${fmt(suggestedTargetPf, 3)})`
                    : 'Already within limit'}
                </button>
              </div>
            </div>

            {overLimit && suggestedPfImpossible && (
              <div className="mt-3">
                <Note>
                  Even correcting PF to ~1.0 would not be enough to meet the {fmt(limitPercent, 1)}%
                  limit at this current/length/size - the cable itself needs to be upsized (or
                  the route shortened), PF correction alone cannot fix it.
                </Note>
              </div>
            )}

            {pfcImpact && (
              <div className="mt-4">
                <ResultGrid>
                  <ResultStat label="Real Power" value={fmt(pfcImpact.realPowerKw)} unit="kW" />
                  <ResultStat
                    label="Required Capacitor Bank"
                    value={fmt(pfcImpact.requiredKvar)}
                    unit="kVAR"
                    highlight
                  />
                  <ResultStat label="Capacitor Current" value={fmt(pfcImpact.capacitorCurrent)} unit="A" />
                  <ResultStat label="Current: Before" value={fmt(current)} unit="A" />
                  <ResultStat label="Current: After" value={fmt(pfcImpact.newCurrent)} unit="A" highlight />
                  <ResultStat
                    label="Current Reduction"
                    value={fmt(100 - (pfcImpact.newCurrent / Math.max(current, 1e-9)) * 100)}
                    unit="%"
                  />
                  <ResultStat label="Voltage Drop: Before" value={fmt(pfcImpact.before.voltDrop)} unit="V" />
                  <ResultStat
                    label="Voltage Drop: After"
                    value={fmt(pfcImpact.after.voltDrop)}
                    unit="V"
                    highlight
                  />
                  <ResultStat
                    label="Percent Drop: Before -> After"
                    value={`${fmt(pfcPercentBefore)} -> ${fmt(pfcPercentAfter)}`}
                    unit="%"
                    highlight
                  />
                  <ResultStat
                    label={`Meets ${fmt(limitPercent, 1)}% limit after correction`}
                    value={pfcPercentAfter <= limitPercent ? 'Yes' : 'No - still over limit'}
                    highlight={pfcPercentAfter <= limitPercent}
                  />
                </ResultGrid>

                {useCustomMv && (
                  <div className="mt-3">
                    <Note>
                      Using your custom mV/A/m value for both before and after - this captures
                      the benefit of the reduced current, but not any further reduction from the
                      changed resistance/reactance mix, since that split isn't known for a single
                      supplied figure.
                    </Note>
                  </div>
                )}
                <div className="mt-3">
                  <Note>
                    This sizes the capacitor bank for the load itself, independent of this
                    specific cable run - see the Power Factor Correction calculator for a
                    standalone version. The reduced current also means a smaller cable could
                    potentially be used; re-run the Cable &amp; Earth Sizing calculator at the
                    new current if reducing cable size is being considered.
                  </Note>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  )
}
