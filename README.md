# EEE Toolkit

A collection of electrical engineering calculators for sizing and estimation work, built with
React, TypeScript, and Tailwind CSS. Calculations use standard formulas and IEC 60364 reference
tables (as adopted in Malaysia in MS IEC 60364, and in the UK as BS7671) rather than field
heuristics. Where MS IEC 60364 itself doesn't publish construction-specific data (e.g. armoured
SWA cable ampacity, which IEC defers to the relevant cable product standard/manufacturer), the
commonly-used BS7671 reference table for that construction is used and flagged as such - always
verify against the actual Malaysian-approved cable manufacturer's datasheet for critical designs.

## Calculators

- **Motor Panel / MCCB Sizing** - incoming MCCB, cable and earth sizing for a panel from its
  Total Connected Load (TCL, recorded for reference) and Maximum Demand (MD, the actual
  diversified running load), plus the largest motor's starting-surge demand. Assumes
  staggered/cascaded motor starting.
- **Genset Sizing** - standby/prime diesel generator sizing from Total Connected Load and
  Maximum Demand, accounting for the largest motor's starting-surge demand.
- **Full Load Current (FLC)** - current drawn by a load from kW, kVA or HP rating, any
  voltage/phase/power factor/efficiency.
- **Cable & Earth (CPC) Sizing** - IEC 60364-5-52 ampacity method (MS IEC 60364-5-52 / BS7671
  Appendix 4): armoured SWA/PVC copper cable, 70C, for installation methods C/E/D1/D2, with
  ambient-temperature and grouping correction factors (It = Ib / (Ca x Cg)). Earth/CPC sizing
  follows IEC 60364-5-54 Table 54.7.
- **Voltage Drop** - load can be entered directly as a current or derived from a connected kW
  rating (with efficiency and an actual-load-demand factor, e.g. motors run below their duty
  rating). Uses the same armoured SWA/PVC copper cable's mV/A/m data as the ampacity table, with
  tabulated impedance or the resistance/reactance combined with the circuit's power factor
  (r cos-phi + x sin-phi) for cables 25mm2 and above; supports copper (published table values)
  or aluminium (resistance scaled by the IEC 60228 resistivity ratio, reactance unchanged).
  Supports parallel cable sets (mV/A/m divided by the set count, ampacity/ Ct evaluated per
  cable). Installation method/ambient/grouping feed into the IEC 60364-5-52 "Ct"
  operating-temperature correction (a cable loaded below its corrected capacity runs cooler, so
  its real resistance and voltage drop are lower than the raw table value). A known mV/A/m value
  (e.g. from a manufacturer datasheet) can be entered directly instead of using the table. The
  compliance limit is selectable (BS7671 5%, JKR/MS IEC 60364-5-52 4%, or custom); the app
  reverse-calculates the maximum allowable current for that limit, and an optional panel
  auto-suggests the power factor a capacitor bank would need to hit it (current is inversely
  proportional to PF for the same real power) and shows the before/after voltage drop.
- **Power Factor Correction** - required capacitor bank kVAR to reach a target power factor
  (Qc = P x (tan(phi1) - tan(phi2))).
- **Transformer Sizing** - full load current and sizing from a connected load and demand factor.
- **Ohm's Law & Power Triangle** - quick V/I/R and P/S/Q solver.
- **Field Reference (Rule of Thumb)** - a reference-only page documenting common field
  heuristics (kW x 2 motor FLC, I/4 cable sizing, etc.) for a quick sanity check. None of the
  calculators above use these - they are listed for reference only.

Always verify installation-specific factors (method, grouping, ambient temperature) and
manufacturer data before finalizing a design.

## Development

```bash
npm install
npm run dev      # start dev server
npm run build     # type-check and build for production
npm run preview   # preview the production build
```
