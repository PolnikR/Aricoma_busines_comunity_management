import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { ExternalLinkIcon } from '@/shared/icons/Icons'
import { cn } from '@/shared/utils/cn'
import { DetailCopyButton } from './DetailCopyButton'
import { getOverviewFootprint } from './overviewLayout'

// How a DetailField renders: grid cell (default), technical identifier row
// (DetailTechnicalGroup) or Overview cell (DetailOverview).
const FieldLayoutContext = createContext<'grid' | 'technical' | 'overview'>('grid')

interface DetailFieldProps {
  label: string
  // Plain text or any node: badges, tags, DetailFieldLink, formatted values.
  value?: ReactNode | undefined
  // Second, muted line under the value, e.g. an ID behind a name.
  secondary?: ReactNode | undefined
  // Monospace for technical values outside a technical group.
  mono?: boolean | undefined
  // Stronger value for the few facts that matter most in a group.
  emphasis?: boolean | undefined
  // Span the full row of the field grid (descriptions, paths, URLs, query strings). Inside a
  // DetailOverview it is an explicit full-row override; without it plain text sizes itself.
  wide?: boolean | undefined
  // Adds a copy action for this text.
  copyValue?: string | undefined
}

// Only absent or blank values are empty; `false` and `0` are real values.
function isEmpty(value: ReactNode) {
  return value === null || value === undefined || (typeof value === 'string' && value.trim() === '')
}

// One label/value pair. In a DetailFieldGroup it is a grid cell with the label above the
// value; inside a DetailTechnicalGroup it becomes a "label | mono value | copy" row. An empty
// value shows a muted "Not set" so a missing value never looks like a layout gap.
export function DetailField({ label, value, secondary, mono = false, emphasis = false, wide = false, copyValue }: DetailFieldProps) {
  const { t } = useTranslation()
  const layout = useContext(FieldLayoutContext)
  const empty = isEmpty(value)
  // React renders nothing for booleans, so show them as text; Yes/No wording stays with the consumer.
  const shown = typeof value === 'boolean' ? String(value) : value
  const content = empty ? <span className="font-outfit text-text-subtle">{t('detailView.notSet')}</span> : shown
  const copy = copyValue && !empty ? <DetailCopyButton value={copyValue} label={label} /> : null

  if (layout === 'technical') {
    return (
      <div className="grid grid-cols-[minmax(8rem,12rem)_minmax(0,1fr)_auto] items-baseline gap-x-4 border-t border-border/60 px-4 py-2.5 first:border-t-0 @max-[560px]/detail-content:grid-cols-[minmax(0,1fr)_auto]">
        <dt className="text-xs text-text-muted @max-[560px]/detail-content:col-span-2">{label}</dt>
        <dd className="min-w-0 font-mono text-[12.5px] leading-5 text-text-secondary wrap-anywhere">
          {content}
          {secondary ? <div className="mt-0.5 font-outfit text-xs text-text-muted">{secondary}</div> : null}
        </dd>
        <div className="flex items-center self-center">{copy}</div>
      </div>
    )
  }

  if (layout === 'overview') {
    const footprint = getOverviewFootprint(value, wide)
    return (
      <div
        className={cn(
          'relative min-w-0 py-2 pe-7 @max-[24rem]/detail-content:pe-2',
          // Row rule: a 1 px line under the cell whose copies (12rem apart, never wider than a
          // track) run on to the grid's right edge, so a row that ends early keeps one rule.
          "after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-(--overview-rule) after:content-['']",
          'after:shadow-[12rem_0_var(--overview-rule),24rem_0_var(--overview-rule),36rem_0_var(--overview-rule),48rem_0_var(--overview-rule),60rem_0_var(--overview-rule),72rem_0_var(--overview-rule)]',
          footprint === 'wide' ? '@min-[24rem]/detail-content:col-span-2' : undefined,
          footprint === 'full' ? 'col-span-full' : undefined,
        )}
      >
        <dt className="text-[11.5px] font-medium leading-4 text-text-muted">{label}</dt>
        <dd className="mt-0.5 flex min-w-0 items-start gap-1">
          <div className={cn('min-w-0 text-sm leading-5 text-text-primary wrap-anywhere', emphasis ? 'font-semibold' : undefined, mono && !empty ? 'font-mono text-[12.5px]' : undefined, footprint === 'full' ? 'max-w-[88ch]' : undefined)}>
            {content}
            {secondary ? <div className="mt-0.5 font-outfit text-[11.5px] font-normal leading-4 text-text-muted">{secondary}</div> : null}
          </div>
          {copy}
        </dd>
      </div>
    )
  }

  return (
    <div className={cn('min-w-0', wide ? 'col-span-full' : undefined)}>
      <dt className="text-xs leading-4 text-text-muted">{label}</dt>
      <dd className="mt-1 flex min-w-0 items-start gap-1">
        <div className={cn('min-w-0 text-sm leading-5 text-text-primary wrap-anywhere', emphasis ? 'font-semibold' : undefined, mono && !empty ? 'font-mono text-[12.5px] text-text-secondary' : undefined)}>
          {content}
          {secondary ? <div className="mt-0.5 font-outfit text-xs font-normal text-text-muted">{secondary}</div> : null}
        </div>
        {copy}
      </dd>
    </div>
  )
}

interface DetailFieldGroupProps {
  title?: string | undefined
  description?: ReactNode | undefined
  children: ReactNode
}

function GroupHeader({ title, description, className }: { title?: string | undefined; description?: ReactNode; className?: string | undefined }) {
  if (!title) return null
  return (
    <header className={className}>
      <h4 className="text-[13px] font-semibold leading-5 text-text-primary">{title}</h4>
      {description ? <p className="text-xs text-text-muted">{description}</p> : null}
    </header>
  )
}

// A titled set of fields in a responsive grid: 1 column, 2 from 520 px and 3 from 860 px of
// content width. Consecutive groups are separated by a hairline; there is no card.
export function DetailFieldGroup({ title, description, children }: DetailFieldGroupProps) {
  return (
    <section data-detail-field-group="" className="[[data-detail-field-group]+&]:border-t [[data-detail-field-group]+&]:border-border/70 [[data-detail-field-group]+&]:pt-7">
      <GroupHeader title={title} description={description} className="mb-3.5" />
      <dl className="grid grid-cols-1 gap-x-10 gap-y-5 @min-[520px]/detail-content:grid-cols-2 @min-[860px]/detail-content:grid-cols-3">
        {children}
      </dl>
    </section>
  )
}

// Identifiers (IDs, UUIDs, NAA, provider IDs, paths, run and request IDs) on a recessed
// surface: one row per DetailField with a wrapping mono value and its copy action.
export function DetailTechnicalGroup({ title, description, children }: DetailFieldGroupProps) {
  return (
    <section>
      <GroupHeader title={title} description={description} className="mb-2" />
      <dl className="overflow-hidden rounded-lg bg-surface-muted/70 dark:bg-surface-muted/50">
        <FieldLayoutContext.Provider value="technical">{children}</FieldLayoutContext.Provider>
      </dl>
    </section>
  )
}

// The Overview section's field grid (A4): as many tracks as the content width allows, no
// column count, a horizontal rule under every row except the last, no card or vertical rules.
// Fields keep their DOM order (no dense backfill); plain text takes one track, two or the whole
// row by its length (overviewLayout.ts).
export function DetailOverview({ children }: { children: ReactNode }) {
  return (
    <dl className="grid grid-flow-row grid-cols-[repeat(auto-fill,minmax(min(12.75rem,100%),1fr))] gap-x-0 [--overview-rule:color-mix(in_srgb,var(--color-border)_60%,var(--color-surface))] [clip-path:inset(-0.5rem_0_2px_-0.5rem)]">
      <FieldLayoutContext.Provider value="overview">{children}</FieldLayoutContext.Provider>
    </dl>
  )
}

interface DetailFieldLinkProps {
  children: ReactNode
  // A URL renders an anchor; without one, `onClick` renders a button (in-app navigation).
  href?: string | undefined
  onClick?: (() => void) | undefined
  // Opens in a new tab and shows the external-link icon.
  external?: boolean | undefined
}

// Link presentation for field values: internal (button or same-tab link) or external.
export function DetailFieldLink({ children, href, onClick, external = false }: DetailFieldLinkProps) {
  const className = 'rounded text-accent hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus/15'
  const icon = external ? <ExternalLinkIcon className="ml-1 inline size-3 -translate-y-px" /> : null
  if (href) {
    return (
      <a href={href} className={className} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
        {children}{icon}
      </a>
    )
  }
  return <button type="button" onClick={onClick} className={cn(className, 'text-left')}>{children}{icon}</button>
}
