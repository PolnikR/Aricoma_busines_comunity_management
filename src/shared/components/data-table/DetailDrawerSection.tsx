import { useId, useState } from 'react'
import type { ReactNode } from 'react'
import { ChevronRightIcon } from '@/shared/icons/Icons'
import { cn } from '@/shared/utils/cn'

interface DetailDrawerSectionProps {
  title: string
  // Text at the right of the header, e.g. "VMware VM" or "VMs: 12".
  summary?: ReactNode
  // Non-interactive badge right after the title.
  badge?: ReactNode
  defaultOpen?: boolean
  // Drop the body padding for content that brings its own (inventory, tables).
  flush?: boolean
  children: ReactNode
}

// A collapsible section of the DetailDrawer body (Model C). Uncontrolled only:
// it keeps its own open state, and consumers reset it with a `key`. Collapsed
// content is unmounted, so data it fetches loads only once the section opens.
// The button's name is the title alone; the summary is its description.
export function DetailDrawerSection({ title, summary, badge, defaultOpen = false, flush = false, children }: DetailDrawerSectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  const id = useId()
  const titleId = `${id}-title`
  const summaryId = `${id}-summary`
  const panelId = `${id}-panel`

  return (
    <section className="border-b border-border last:border-b-0">
      <h3 className="sticky top-0 z-1 bg-surface">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={open ? panelId : undefined}
          aria-labelledby={titleId}
          aria-describedby={summary ? summaryId : undefined}
          onClick={() => { setOpen(value => !value) }}
          className="flex w-full items-center gap-2 px-5 py-3 text-left text-sm font-semibold text-text-primary transition hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-focus/15"
        >
          <ChevronRightIcon
            className={cn(
              'size-4 shrink-0 text-text-subtle transition-transform duration-150 motion-reduce:transition-none',
              open ? 'rotate-90' : undefined,
            )}
          />
          <span id={titleId} className="min-w-0 truncate">{title}</span>
          {badge ? <span className="shrink-0">{badge}</span> : null}
          {summary ? (
            <span id={summaryId} className="ml-auto max-w-[50%] truncate text-xs font-normal text-text-muted">{summary}</span>
          ) : null}
        </button>
      </h3>
      {open ? (
        <div id={panelId} role="region" aria-labelledby={titleId} className={flush ? undefined : 'px-5 pb-4'}>
          {children}
        </div>
      ) : null}
    </section>
  )
}
