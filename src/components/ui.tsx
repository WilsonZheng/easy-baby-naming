import type { ReactNode } from 'react'

export function Switch({
  checked, onChange, label, desc,
}: { checked: boolean; onChange: (v: boolean) => void; label: string; desc?: string }) {
  return (
    <div
      className="switch-row"
      onClick={() => onChange(!checked)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onChange(!checked) } }}
    >
      <div>
        <div className="label">{label}</div>
        {desc && <div className="desc">{desc}</div>}
      </div>
      <span className="switch" role="switch" aria-checked={checked} aria-label={label} />
    </div>
  )
}

export function ChipGroup<T extends string>({
  value, options, onChange, small,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  small?: boolean
}) {
  return (
    <div className="chips">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={small ? 'chip sm' : 'chip'}
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Empty({ glyph, title, children }: { glyph: string; title: string; children: ReactNode }) {
  return (
    <div className="empty">
      <span className="glyph">{glyph}</span>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  )
}

export function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section>
      <div className="section-title">
        <h2>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}
