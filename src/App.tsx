import { useState } from 'react'
import CableCalculator from './calculators/CableCalculator'
import FieldReference from './calculators/FieldReference'
import FlcCalculator from './calculators/FlcCalculator'
import GensetCalculator from './calculators/GensetCalculator'
import MotorPanelCalculator from './calculators/MotorPanelCalculator'
import OhmCalculator from './calculators/OhmCalculator'
import PfcCalculator from './calculators/PfcCalculator'
import TransformerCalculator from './calculators/TransformerCalculator'
import VoltageDropCalculator from './calculators/VoltageDropCalculator'

const TOOLS = [
  { id: 'motor-panel', label: 'Motor Panel / MCCB Sizing', icon: '⚙️', Component: MotorPanelCalculator },
  { id: 'genset', label: 'Genset Sizing', icon: '🔌', Component: GensetCalculator },
  { id: 'flc', label: 'Full Load Current', icon: '⚡', Component: FlcCalculator },
  { id: 'cable', label: 'Cable & Earth Sizing', icon: '🔌', Component: CableCalculator },
  { id: 'vdrop', label: 'Voltage Drop', icon: '📉', Component: VoltageDropCalculator },
  { id: 'pfc', label: 'Power Factor Correction', icon: '🔁', Component: PfcCalculator },
  { id: 'transformer', label: 'Transformer Sizing', icon: '🔲', Component: TransformerCalculator },
  { id: 'ohm', label: "Ohm's Law & Power", icon: '📐', Component: OhmCalculator },
  { id: 'reference', label: 'Field Reference (Rule of Thumb)', icon: '📋', Component: FieldReference },
] as const

type ToolId = (typeof TOOLS)[number]['id']

function App() {
  const [active, setActive] = useState<ToolId>('motor-panel')
  const [navOpen, setNavOpen] = useState(false)
  const ActiveTool = TOOLS.find((t) => t.id === active)?.Component ?? MotorPanelCalculator

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col lg:flex-row">
      <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3 lg:hidden dark:border-slate-700">
        <span className="text-base font-semibold">EEE Toolkit</span>
        <button
          onClick={() => setNavOpen((v) => !v)}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600"
        >
          Menu
        </button>
      </header>

      <nav
        className={`w-full shrink-0 border-b border-slate-200 p-3 lg:block lg:w-72 lg:border-b-0 lg:border-r lg:p-4 dark:border-slate-700 ${
          navOpen ? 'block' : 'hidden'
        }`}
      >
        <div className="mb-4 hidden lg:block">
          <div className="text-lg font-bold text-slate-900 dark:text-slate-100">EEE Toolkit</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Electrical &amp; Electronics Engineering calculators
          </div>
        </div>
        <ul className="space-y-1">
          {TOOLS.map((t) => (
            <li key={t.id}>
              <button
                onClick={() => {
                  setActive(t.id)
                  setNavOpen(false)
                }}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
                  active === t.id
                    ? 'bg-sky-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                <span>{t.icon}</span>
                {t.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <main className="min-w-0 flex-1 p-4 lg:p-6">
        <ActiveTool />
        <footer className="mt-8 pb-4 text-center text-xs text-slate-400 dark:text-slate-500">
          Calculations use standard formulas and BS7671/IEC reference tables - always verify
          installation-specific factors (method, grouping, ambient temperature) and manufacturer
          data before finalizing a design.
        </footer>
      </main>
    </div>
  )
}

export default App
