import { useId } from 'react'
import type { ReactNode } from 'react'

interface RelationshipGroupProps {
  title: string
  // RelationshipChain rows.
  children: ReactNode
}

// A bordered group of rows with an eyebrow header, read as a labelled list.
export function RelationshipGroup({ title, children }: RelationshipGroupProps) {
  const titleId = useId()
  return (
    <section className="overflow-hidden rounded-xl border border-border">
      <header className="border-b border-border bg-surface-muted px-3 py-2">
        <h5 id={titleId} className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">{title}</h5>
      </header>
      <ul aria-labelledby={titleId} className="divide-y divide-dashed divide-border">
        {children}
      </ul>
    </section>
  )
}
