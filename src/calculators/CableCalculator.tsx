import { useMemo, useState } from 'react'
import { INSTALL_METHODS, type CoreConfig, type InstallMethod } from '../calc/bs7671Tables'
import { sizeCableBS7671, sizeEarthConductor } from '../calc/cable'
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

export default function CableCalculator() {
  const [current, setCurrent] = useState(100)
  const [installMethod, setInstallMethod] = useState<InstallMethod>('C')
  const [coreConfig, setCoreConfig] = useState<CoreConfig>('threeOrFourCore')
  const [ambientTempC, setAmbientTempC] = useState(30)
  const [groupedCircuits, setGroupedCircuits] = useState(1)

  const cable = useMemo(
    () =>
      sizeCableBS7671({
        designCurrent: current,
        installMethod,
        coreConfig,
        ambientTempC,
        groupedCircuits,
      }),
    [current, installMethod, coreConfig, ambientTempC, groupedCircuits],
  )
  const earth = useMemo(
    () => sizeEarthConductor(cable.selectedSizeMm2 ?? 0),
    [cable.selectedSizeMm2],
  )

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle>Cable &amp; Earth (CPC) Sizing</SectionTitle>
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          IEC 60364-5-52 ampacity method (MS IEC 60364-5-52 / BS7671 Appendix 4): armoured
          SWA/PVC copper cable, 70C, with ambient temperature and grouping correction factors -
          It = Ib / (Ca x Cg).
        </p>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <NumberField id="current" label="Design Current (Ib)" value={current} onChange={setCurrent} suffix="A" />
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
            id="method"
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
      </Card>

      <Card>
        <SectionTitle>Result</SectionTitle>
        <ResultGrid>
          <ResultStat label="Ambient factor (Ca)" value={fmt(cable.ambientFactor, 2)} />
          <ResultStat label="Grouping factor (Cg)" value={fmt(cable.groupingFactor, 2)} />
          <ResultStat label="Required tabulated current" value={fmt(cable.requiredTabulatedCurrent)} unit="A" />
          <ResultStat
            label="Selected cable size"
            value={cable.selectedSizeMm2 !== null ? fmt(cable.selectedSizeMm2, 1) : 'N/A'}
            unit="mm2"
            highlight
          />
          <ResultStat
            label="Tabulated capacity"
            value={cable.tabulatedCapacityAtSize !== null ? fmt(cable.tabulatedCapacityAtSize, 0) : 'N/A'}
            unit="A"
          />
          <ResultStat
            label="Corrected capacity (Iz)"
            value={cable.correctedCapacityAtSize !== null ? fmt(cable.correctedCapacityAtSize, 1) : 'N/A'}
            unit="A"
            highlight
          />
          <ResultStat label="Earth / CPC conductor" value={fmt(earth.cpcMm2, 1)} unit="mm2" highlight />
        </ResultGrid>

        {cable.exceedsTable && (
          <div className="mt-3">
            <Note>
              Required current exceeds the ampacity table's range for this installation method -
              consider parallel runs or busbar trunking.
            </Note>
          </div>
        )}
        <div className="mt-3">
          <Note>{earth.ruleApplied}</Note>
        </div>
        <div className="mt-3">
          <Note>
            This covers multicore armoured (SWA) 70C PVC-insulated copper cable (the same
            reference table used by both BS7671 and, as MS IEC 60364-5-52, Malaysian practice).
            For other constructions (single-core, XLPE/90C, aluminium) use the manufacturer's
            IEC 60502-1 datasheet or the corresponding IEC 60364-5-52 table for that cable type.
          </Note>
        </div>
      </Card>
    </div>
  )
}
