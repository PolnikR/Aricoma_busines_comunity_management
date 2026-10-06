import { useId } from 'react'
import type { ReactNode } from 'react'

interface RelationshipGroupProps {
  // Accessible name of the row list; shown as the eyebrow unless `header` replaces it.
  title: string
  // Replaces the visible eyebrow, e.g. RelationshipLanes; the title stays the list name.
  header?: ReactNode | undefined
  // Under the rows, e.g. pagination.
  footer?: ReactNode | undefined
  // RelationshipChain rows.
  children: ReactNode
}

// A bordered group of rows with an eyebrow header, read as a labelled list.
export function RelationshipGroup({ title, header, footer, children }: RelationshipGroupProps) {
  const titleId = useId()
  return (
    <section className="overflow-hidden rounded-xl border border-border">
      {header ? (
        <>
          <h5 id={titleId} className="sr-only">{title}</h5>
          {header}
        </>
      ) : (
        <header className="border-b border-border bg-surface-muted px-3 py-2">
          <h5 id={titleId} className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">{title}</h5>
        </header>
      )}
      <ul aria-labelledby={titleId} className="divide-y divide-dashed divide-border">
        {children}
      </ul>
      {footer ? <div className="border-t border-border px-3 py-2">{footer}</div> : null}
    </section>
  )
}
