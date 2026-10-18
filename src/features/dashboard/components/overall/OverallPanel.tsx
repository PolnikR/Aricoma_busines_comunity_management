import { useId, type ReactNode } from 'react'

export function OverallPanel({ title, subtitle, children, className = '' }: {
  title: string
  subtitle: string
  children: ReactNode
  className?: string
}) {
  const id = useId()
  return <section className={`overall-panel ${className}`} aria-labelledby={id}>
    <header className="overall-panel-header">
      <div><h2 id={id}>{title}</h2><p>{subtitle}</p></div>
      <span className="overall-simulated">SIMULATED</span>
    </header>
    <div className="overall-panel-content">{children}</div>
  </section>
}
