import { Card, SectionTitle } from '../components/ui'

function Rule({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
      <h3 className="mb-1 font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
      <div className="space-y-1 text-sm text-slate-600 dark:text-slate-300">{children}</div>
    </div>
  )
}

export default function FieldReference() {
  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle>Field Rule-of-Thumb Reference</SectionTitle>
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          Quick heuristics used on-site for a fast sanity check or first estimate. The
          calculators in this app do <strong>not</strong> use these - they compute from exact
          formulas and IEC 60364 standard tables (as adopted in Malaysia in MS IEC 60364, and in
          the UK as BS7671). Keep this page as a reference for eyeballing a number quickly;
          always confirm the final design with the calculators (or the full standard) before
          committing to it.
        </p>

        <div className="space-y-3">
          <Rule title="Motor Full Load Current (415V, 3-phase)">
            <p>
              <strong>kW x 2 ~= FLC (A)</strong> - e.g. a 15kW motor ~= 30A.
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Only a rough estimate for standard-efficiency motors around 0.85 PF at 415V - it is
              not valid at other voltages, and single-phase motors need the full formula
              (I = kW x 1000 / (V x PF x efficiency)).
            </p>
          </Rule>

          <Rule title="Motor Panel Incoming MCCB Sizing">
            <p>
              Incoming (A) = (largest motor's FLC x its starting factor) + (sum of the other
              motors' FLC) + 20% margin, rounded up to the next standard MCCB.
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Example (4 x 15kW, star-delta): (30A x 3) + 90A = 180A, +20% = 216A -&gt; 250A MCCB.
              Assumes staggered/cascaded starting - starting everything at once produces much
              higher combined inrush (roughly 360-840A in this example) and will trip the
              breaker and cause excessive voltage dip.
            </p>
          </Rule>

          <Rule title="Typical Motor Starting-Current Multipliers">
            <ul className="list-inside list-disc">
              <li>Direct-On-Line (DOL): 6-7x FLC</li>
              <li>Star-Delta: 2.5-3x FLC</li>
              <li>Soft starter: 2-4x FLC</li>
              <li>Auto-transformer starter: 1.5-2.5x FLC</li>
              <li>VFD / inverter: 1-1.5x FLC</li>
            </ul>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              These are typical ranges only - use the actual figure from the motor's nameplate or
              datasheet (locked rotor current / code letter) when it is available.
            </p>
          </Rule>

          <Rule title="Recommended Starting Method by Motor Size">
            <ul className="list-inside list-disc">
              <li>Up to ~5.5kW: Direct-On-Line (DOL) is normally fine</li>
              <li>~5.5kW - 37kW: Star-Delta or soft starter recommended</li>
              <li>~37kW - 90kW: Soft starter or VFD recommended</li>
              <li>Above ~90kW: VFD strongly preferred; DOL/star-delta starting current is usually too large for the supply</li>
            </ul>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Rough guidance only - the actual limit depends on the supply's fault level, the
              site's/utility's permitted voltage dip, and any specific utility approval
              requirements for DOL starting above a given kW. Always check the local supply
              authority's rules and the motor manufacturer's recommendation before finalizing.
            </p>
          </Rule>

          <Rule title="Quick Cable Sizing (copper, PVC/SWA/PVC)">
            <p>Up to 130A: cable size (mm2) ~= current (A) / 4</p>
            <p>Above 130A: cable size (mm2) ~= current (A) / 2.5</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Thicker cables dissipate heat less efficiently per mm2, which is why the divisor
              drops above the ~130A breakpoint. Go up one standard size if the run is over ~50m
              or is routed through high ambient heat. This does not account for installation
              method, grouping, or actual ambient temperature - use the Cable &amp; Earth Sizing
              calculator (IEC 60364-5-52 / MS IEC 60364-5-52 ampacity method) for a real design.
            </p>
          </Rule>

          <Rule title="Earth (CPC) Conductor Sizing">
            <ul className="list-inside list-disc">
              <li>Phase &lt;= 16mm2: earth = phase size</li>
              <li>16mm2 &lt; Phase &lt;= 35mm2: earth = 16mm2</li>
              <li>Phase &gt; 35mm2: earth = phase / 2 (rounded up to a standard size)</li>
            </ul>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Unlike the other rules on this page, this one is not a field shortcut - it is
              IEC 60364-5-54's own Table 54.7, a simplified alternative to the full adiabatic
              equation (S = sqrt(I^2 t) / k), adopted in Malaysia as MS IEC 60364-5-54 and in the
              UK as BS7671 Table 54.7 - and is what the Cable &amp; Earth and Motor Panel
              calculators use directly.
            </p>
          </Rule>

          <Rule title="Genset Sizing Margin">
            <p>
              Size the generator for Maximum Demand (as kVA) plus the largest single motor's
              starting surge, then add ~20-25% margin for safety/future growth.
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              The Genset Sizing calculator computes this from the site's actual TCL/MD and motor
              data rather than a flat guess - use this line only for a back-of-envelope check.
            </p>
          </Rule>
        </div>
      </Card>
    </div>
  )
}
