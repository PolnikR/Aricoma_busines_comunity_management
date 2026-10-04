import { useId } from 'react'
import type { ComponentType, ReactNode, SVGProps } from 'react'
import { cn } from '@/shared/utils/cn'
import { useRelationshipGraph } from './relationshipGraphContext'
import type { RelationshipNodeTone } from './relationshipGraphTypes'

// Full class strings only, so Tailwind can see every one of them.
const chipTone: Record<RelationshipNodeTone, string> = {
  compute: 'bg-surface-muted text-text-secondary',
  storage: 'bg-accent-soft text-accent',
  infrastructure: 'bg-brand-500/10 text-brand-500 dark:bg-brand-400/15 dark:text-brand-400',
  protection: 'bg-theme-pink-500/10 text-theme-pink-500 dark:bg-theme-pink-500/20',
  problem: 'bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-500',
}

interface RelationshipNodeProps {
  // Logical identity shared by every card of the same entity; drives highlighting.
  entityId: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
  tone: RelationshipNodeTone
  name: string
  // Facts under the name, e.g. type label and role badge.
  meta?: ReactNode
  // Technical id shown as subtle mono metadata.
  monoId?: string
  // Screen-reader sentence listing this node's relationships.
  description: string
  children?: ReactNode
}

// A focusable card in a relationship diagram. It has no action of its own, so it
// is a labelled group rather than a button: focus only drives the highlight.
export function RelationshipNode({ entityId, icon: Icon, tone, name, meta, monoId, description, children }: RelationshipNodeProps) {
  const { nodeHighlight, hover, focus } = useRelationshipGraph()
  // DOM ids are per rendered card; the same entity may appear in several rows.
  const id = useId()
  const nameId = `${id}-name`
  const descriptionId = `${id}-description`
  const highlight = nodeHighlight(entityId)
  const problem = tone === 'problem'

  return (
    <div
      role="group"
      tabIndex={0}
      aria-labelledby={nameId}
      aria-describedby={descriptionId}
      data-entity-id={entityId}
      data-highlight={highlight}
      onPointerEnter={() => { hover(entityId) }}
      onPointerLeave={() => { hover(null) }}
      onFocus={() => { focus(entityId) }}
      onBlur={() => { focus(null) }}
      className={cn(
        'min-w-0 rounded-xl border px-3 py-2.5 outline-none transition-[opacity,border-color,box-shadow] duration-150 hover:border-accent focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-focus/30',
        problem ? 'border-dashed border-error-500 bg-surface-subtle' : 'border-border bg-surface',
        highlight === 'off' ? 'opacity-35' : undefined,
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <span data-node-icon className={cn('grid size-6.5 shrink-0 place-items-center rounded-lg', chipTone[tone])}>
          <Icon className="size-3.75" aria-hidden="true" />
        </span>
        <span id={nameId} title={name} className={cn('min-w-0 truncate text-[13px] text-text-primary', problem ? 'font-mono font-medium' : 'font-semibold')}>
          {name}
        </span>
      </div>
      {meta || monoId ? (
        <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-1.5 text-[11px] text-text-muted">
          {meta}
          {monoId ? <span className="min-w-0 font-mono break-all text-text-subtle">{monoId}</span> : null}
        </div>
      ) : null}
      {children}
      <span id={descriptionId} hidden>{description}</span>
    </div>
  )
}
