# EEE Toolkit

A collection of electrical engineering calculators for sizing and estimation work, built with
React, TypeScript, and Tailwind CSS. Calculations use standard formulas and BS7671/IEC reference
tables rather than field heuristics.

## Calculators

- **Motor Panel / MCCB Sizing** - incoming MCCB, cable and earth sizing for a panel feeding
  single-phase and/or three-phase motors. FLC is computed from the exact formula
  (I = kW / (sqrt(3) x V x PF x efficiency) for 3-phase, I = kW / (V x PF x efficiency) for
  1-phase); loads are aggregated in kVA (phase-independent) before being converted back to the
  three-phase incomer current, so mixed single-phase/three-phase panels are sized correctly.
  Assumes staggered/cascaded motor starting.
- **Genset Sizing** - standby/prime diesel generator sizing from a load schedule, accounting
  for diversity and the largest motor's starting-surge demand.
- **Full Load Current (FLC)** - current drawn by a load from kW, kVA or HP rating, any
  voltage/phase/power factor/efficiency.
- **Cable & Earth (CPC) Sizing** - BS7671 Table 4D4A ampacity (copper, SWA/PVC, 70C) for
  installation methods C/E/D1/D2, with Table 4B1 ambient-temperature and Table 4C1 grouping
  correction factors (It = Ib / (Ca x Cg)). Earth/CPC sizing follows Table 54.7.
- **Voltage Drop** - BS7671 Table 4D4B mV/A/m data for the same cable, using tabulated
  impedance or the resistance/reactance combined with the circuit's power factor
  (r cos-phi + x sin-phi) for cables 25mm2 and above.
- **Power Factor Correction** - required capacitor bank kVAR to reach a target power factor
  (Qc = P x (tan(phi1) - tan(phi2))).
- **Transformer Sizing** - full load current and sizing from a connected load schedule.
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
