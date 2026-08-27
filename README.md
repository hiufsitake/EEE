# EEE Toolkit

A collection of field-practice electrical engineering calculators for quick sizing and
estimation work, built with React, TypeScript, and Tailwind CSS.

## Calculators

- **Motor Panel / MCCB Sizing** - incoming MCCB, cable and earth sizing for a panel feeding
  multiple motors, based on total running FLC plus the worst-case motor starting surge
  (staggered/cascaded starting assumed).
- **Genset Sizing** - standby/prime diesel generator sizing from a load schedule, accounting
  for diversity and the largest motor's starting-surge demand.
- **Full Load Current (FLC)** - current drawn by a load from kW, kVA or HP rating.
- **Cable & Earth (CPC) Sizing** - fast field rule-of-thumb cable sizing (I/4 up to 130A,
  I/2.5 above) with earth conductor sizing.
- **Voltage Drop** - resistive-only voltage drop estimate for a cable run.
- **Power Factor Correction** - required capacitor bank kVAR to reach a target power factor.
- **Transformer Sizing** - full load current and sizing from a connected load schedule.
- **Ohm's Law & Power Triangle** - quick V/I/R and P/S/Q solver.

These are fast field estimates for quick engineering guidance, not a substitute for full
IEC 60364 / BS7671 ampacity tables, manufacturer data, or the applicable local code - always
verify before finalizing a design.

## Development

```bash
npm install
npm run dev      # start dev server
npm run build     # type-check and build for production
npm run preview   # preview the production build
```
