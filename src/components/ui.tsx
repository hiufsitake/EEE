import { createContext, useContext, type ReactNode } from 'react'

// Namespaces field ids so multiple calculators can stay mounted at once (to preserve their
// input state when switching tabs) without colliding on ids like "voltage" or "phase".
const IdNamespaceContext = createContext('')

export function IdScope({ prefix, children }: { prefix: string; children: ReactNode }) {
  return <IdNamespaceContext.Provider value={prefix}>{children}</IdNamespaceContext.Provider>
}

export function useNamespacedId(id: string): string {
  const prefix = useContext(IdNamespaceContext)
  return prefix ? `${prefix}-${id}` : id
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 dark:border-slate-700 dark:bg-slate-900 ${className}`}
    >
      {children}
    </div>
  )
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-1 text-lg font-semibold text-slate-900 dark:text-slate-100">{children}</h2>
  )
}

export function Label({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  const namespacedFor = useNamespacedId(htmlFor ?? '')
  return (
    <label
      htmlFor={htmlFor ? namespacedFor : undefined}
      className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300"
    >
      {children}
    </label>
  )
}

export function NumberField({
  id,
  label,
  value,
  onChange,
  suffix,
  step = 'any',
  min,
}: {
  id: string
  label: string
  value: number
  onChange: (v: number) => void
  suffix?: string
  step?: number | 'any'
  min?: number
}) {
  const namespacedId = useNamespacedId(id)
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <input
          id={namespacedId}
          type="number"
          inputMode="decimal"
          step={step}
          min={min}
          value={Number.isNaN(value) ? '' : value}
          onChange={(e) => onChange(e.target.valueAsNumber)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 sm:text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        />
        {suffix && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
            {suffix}
          </span>
        )}
      </div>
    </div>
  )
}

export function SelectField<T extends string>({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string
  label: string
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
}) {
  const namespacedId = useNamespacedId(id)
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <select
        id={namespacedId}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 sm:text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}

export function CheckboxField({
  id,
  label,
  checked,
  onChange,
}: {
  id: string
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  const namespacedId = useNamespacedId(id)
  return (
    <label htmlFor={namespacedId} className="flex cursor-pointer items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
      <input
        id={namespacedId}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
      />
      {label}
    </label>
  )
}

export function ResultGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
}

export function ResultStat({
  label,
  value,
  unit,
  highlight = false,
}: {
  label: string
  value: string
  unit?: string
  highlight?: boolean
}) {
  return (
    <div
      className={`rounded-lg border p-3 ${
        highlight
          ? 'border-sky-300 bg-sky-50 dark:border-sky-700 dark:bg-sky-950/40'
          : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60'
      }`}
    >
      <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
      <div
        className={`mt-0.5 text-xl font-semibold tabular-nums ${
          highlight ? 'text-sky-700 dark:text-sky-300' : 'text-slate-900 dark:text-slate-100'
        }`}
      >
        {value}
        {unit && <span className="ml-1 text-sm font-normal text-slate-500">{unit}</span>}
      </div>
    </div>
  )
}

export function Note({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg bg-amber-50 p-3 text-xs leading-relaxed text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
      {children}
    </p>
  )
}

export function fmt(n: number, digits = 2): string {
  if (!Number.isFinite(n)) return '-'
  return n.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: 0 })
}
