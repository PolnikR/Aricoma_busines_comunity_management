import { useId, useState } from 'react'
import type { ComponentType, ReactNode, SVGProps } from 'react'
import { ChevronRightIcon } from '@/shared/icons/Icons'
import { cn } from '@/shared/utils/cn'

// The kind of content a section holds. The colour is the section's identity,
// never a status: success/warning/error colours are deliberately not used.
export type DetailDrawerSectionAccent =
  | 'overview'
  | 'infrastructure'
  | 'storage'
  | 'protection'
  | 'configuration'
  | 'technical'

interface AccentClasses {
  // Stripe on the header's left edge, faint while closed.
  bar: string
  // Icon chip next to the title.
  chip: string
  // The stripe continued along the open panel, so a scrolled panel still shows its section.
  panel: string
}

// Full class strings only, so Tailwind can see every one of them.
const accentClasses: Record<DetailDrawerSectionAccent, AccentClasses> = {
  overview: {
    bar: 'before:bg-accent',
    chip: 'bg-accent/10 text-accent dark:bg-accent/15',
    panel: 'shadow-[inset_3px_0_0_color-mix(in_srgb,var(--color-accent)_20%,transparent)]',
  },
  infrastructure: {
    bar: 'before:bg-brand-500 dark:before:bg-brand-400',
    chip: 'bg-brand-500/10 text-brand-500 dark:bg-brand-400/15 dark:text-brand-400',
    panel: 'shadow-[inset_3px_0_0_color-mix(in_srgb,var(--color-brand-500)_20%,transparent)]',
  },
  storage: {
    bar: 'before:bg-theme-purple-500',
    chip: 'bg-theme-purple-500/10 text-theme-purple-500 dark:bg-theme-purple-500/20',
    panel: 'shadow-[inset_3px_0_0_color-mix(in_srgb,var(--color-theme-purple-500)_20%,transparent)]',
  },
  protection: {
    bar: 'before:bg-theme-pink-500',
    chip: 'bg-theme-pink-500/10 text-theme-pink-500 dark:bg-theme-pink-500/20',
    panel: 'shadow-[inset_3px_0_0_color-mix(in_srgb,var(--color-theme-pink-500)_20%,transparent)]',
  },
  // Orange is a structural accent only (stripe and chip), never text or a badge.
  configuration: {
    bar: 'before:bg-orange-500 dark:before:bg-orange-400',
    chip: 'bg-orange-500/10 text-orange-500 dark:bg-orange-400/15 dark:text-orange-400',
    panel: 'shadow-[inset_3px_0_0_color-mix(in_srgb,var(--color-orange-500)_20%,transparent)]',
  },
  technical: {
    bar: 'before:bg-gray-500 dark:before:bg-gray-400',
    chip: 'bg-gray-500/10 text-gray-500 dark:bg-gray-400/15 dark:text-gray-400',
    panel: 'shadow-[inset_3px_0_0_color-mix(in_srgb,var(--color-gray-500)_20%,transparent)]',
  },
}

interface DetailDrawerSectionProps {
  title: string
  // Text at the right of the header, e.g. "VMware VM" or "VMs: 12".
  summary?: ReactNode
  // Non-interactive badge right after the title.
  badge?: ReactNode
  defaultOpen?: boolean
  // Drop the body padding for content that brings its own (inventory, tables).
  flush?: boolean
  // What kind of content the section holds; drives the stripe and icon colour.
  // Required with `icon`: every drawer section carries its identity.
  accent: DetailDrawerSectionAccent
  // Shared icon component; the section sizes and colours it.
  icon: ComponentType<SVGProps<SVGSVGElement>>
  children: ReactNode
}

// A collapsible section of the DetailDrawer body (Model C). Uncontrolled only:
// it keeps its own open state, and consumers reset it with a `key`. Collapsed
// content is unmounted, so data it fetches loads only once the section opens.
// The button's name is the title alone; the summary is its description.
// In a `bodyLayout="sections"` drawer the header stays put and open sections
// split the height equally; one that needs less keeps just its content
// (`max-h-fit`), so a short section is never squeezed. Each open panel scrolls
// on its own. In a scrolling body the flex classes have no effect.
export function DetailDrawerSection({ title, summary, badge, defaultOpen = false, flush = false, accent, icon: Icon, children }: DetailDrawerSectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  const id = useId()
  const titleId = `${id}-title`
  const summaryId = `${id}-summary`
  const panelId = `${id}-panel`
  const accentStyle = accentClasses[accent]

  return (
    <section
      data-accent={accent}
      className={cn('flex min-h-0 flex-col border-b border-border last:border-b-0', open ? 'flex-1 max-h-fit' : 'shrink-0')}
    >
      <h3 className="sticky top-0 z-1 shrink-0 bg-surface">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={open ? panelId : undefined}
          aria-labelledby={titleId}
          aria-describedby={summary ? summaryId : undefined}
          onClick={() => { setOpen(value => !value) }}
          className={cn(
            'relative flex w-full items-center gap-2 px-5 py-3 text-left text-sm font-semibold text-text-primary transition hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-focus/15',
            'before:absolute before:inset-y-0 before:left-0 before:w-0.75 before:transition-opacity',
            accentStyle.bar,
            open ? 'before:opacity-100' : 'before:opacity-35',
          )}
        >
          <ChevronRightIcon
            className={cn(
              'size-4 shrink-0 text-text-subtle transition-transform duration-150 motion-reduce:transition-none',
              open ? 'rotate-90' : undefined,
            )}
          />
          <span data-section-icon className={cn('flex size-6 shrink-0 items-center justify-center rounded-md', accentStyle.chip)}>
            <Icon className="size-3.5" aria-hidden="true" />
          </span>
          <span id={titleId} className="min-w-0 truncate">{title}</span>
          {badge ? <span className="shrink-0">{badge}</span> : null}
          {summary ? (
            <span id={summaryId} className="ml-auto max-w-[50%] truncate text-xs font-normal text-text-muted">{summary}</span>
          ) : null}
        </button>
      </h3>
      {open ? (
        <div
          id={panelId}
          role="region"
          aria-labelledby={titleId}
          className={cn('custom-scrollbar min-h-0 flex-1 overflow-y-auto', flush ? undefined : 'px-5 pb-4', accentStyle.panel)}
        >
          {children}
        </div>
      ) : null}
    </section>
  )
}
