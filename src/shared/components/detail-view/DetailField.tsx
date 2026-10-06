import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { ExternalLinkIcon } from '@/shared/icons/Icons'
import { cn } from '@/shared/utils/cn'
import { DetailCopyButton } from './DetailCopyButton'

// Whether fields render as technical identifier rows (DetailTechnicalGroup).
const TechnicalContext = createContext(false)

interface DetailFieldProps {
  label: string
  // Plain text or any node: badges, tags, DetailFieldLink, formatted values.
  value?: ReactNode
  // Second, muted line under the value, e.g. an ID behind a name.
  secondary?: ReactNode
  // Monospace for technical values outside a technical group.
  mono?: boolean
  // Stronger value for the few facts that matter most in a group.
  emphasis?: boolean
  // Span the full row of the field grid (descriptions, paths, URLs, query strings).
  wide?: boolean
  // Adds a copy action for this text.
  copyValue?: string
}

function isEmpty(value: ReactNode) {
  return value === null || value === undefined || value === false || (typeof value === 'string' && value.trim() === '')
}

// One label/value pair. In a DetailFieldGroup it is a grid cell with the label above the
// value; inside a DetailTechnicalGroup it becomes a "label | mono value | copy" row. An empty
// value shows a muted "Not set" so a missing value never looks like a layout gap.
export function DetailField({ label, value, secondary, mono = false, emphasis = false, wide = false, copyValue }: DetailFieldProps) {
  const { t } = useTranslation()
  const technical = useContext(TechnicalContext)
  const empty = isEmpty(value)
  const content = empty ? <span className="font-outfit text-text-subtle">{t('detailView.notSet')}</span> : value
  const copy = copyValue && !empty ? <DetailCopyButton value={copyValue} label={label} /> : null

  if (technical) {
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
  title?: string
  description?: ReactNode
  children: ReactNode
}

function GroupHeader({ title, description, className }: { title?: string; description?: ReactNode; className?: string }) {
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
        <TechnicalContext.Provider value={true}>{children}</TechnicalContext.Provider>
      </dl>
    </section>
  )
}

interface DetailFieldLinkProps {
  children: ReactNode
  // A URL renders an anchor; without one, `onClick` renders a button (in-app navigation).
  href?: string
  onClick?: () => void
  // Opens in a new tab and shows the external-link icon.
  external?: boolean
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
