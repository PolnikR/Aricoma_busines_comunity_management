import { Fragment, useId } from 'react'
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
  // 2 wraps a long technical name onto a second line (breaking after _ - . / first)
  // instead of truncating it; the full name stays in the title.
  nameLines?: 1 | 2 | undefined
  // Makes the node a button that performs this action, e.g. revealing related details.
  onActivate?: (() => void) | undefined
  // Accessible name of the action; defaults to the node name.
  activateLabel?: string | undefined
  children?: ReactNode
}

// Break opportunities after technical separators, so "aux_V5000_VOLUME01" wraps at "_".
function withSeparatorBreaks(name: string): ReactNode {
  return name.split(/(?<=[_\-./])/).map((part, index) => <Fragment key={index}>{index > 0 ? <wbr /> : null}{part}</Fragment>)
}

// A focusable card in a relationship diagram. Without an action it is a labelled group
// rather than a button: focus only drives the highlight. With `onActivate` it is a real
// button with the same look and highlight behaviour.
export function RelationshipNode({
  entityId, icon: Icon, tone, name, meta, monoId, description, nameLines = 1, onActivate, activateLabel, children,
}: RelationshipNodeProps) {
  const { nodeHighlight, hover, focus, density, dimming } = useRelationshipGraph()
  // DOM ids are per rendered card; the same entity may appear in several rows.
  const id = useId()
  const nameId = `${id}-name`
  const descriptionId = `${id}-description`
  const highlight = nodeHighlight(entityId)
  const problem = tone === 'problem'
  const compact = density === 'compact'

  const shared = {
    'aria-describedby': descriptionId,
    'data-entity-id': entityId,
    'data-highlight': highlight,
    onPointerEnter: () => { hover(entityId) },
    onPointerLeave: () => { hover(null) },
    onFocus: () => { focus(entityId) },
    onBlur: () => { focus(null) },
    className: cn(
      'min-w-0 border outline-none transition-[opacity,border-color,box-shadow] duration-150 hover:border-accent focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-focus/30',
      compact ? 'flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left' : 'rounded-xl px-3 py-2.5',
      problem ? 'border-dashed border-error-500 bg-surface-subtle' : 'border-border bg-surface',
      highlight === 'off' ? (dimming === 'soft' ? 'opacity-60' : 'opacity-35') : undefined,
      highlight === 'on' && dimming === 'soft' && !problem ? 'border-accent/45' : undefined,
      onActivate ? 'group/node cursor-pointer' : undefined,
    ),
  }

  const nameElement = (
    <span
      id={nameId}
      title={name}
      className={cn(
        'min-w-0 text-[13px] text-text-primary',
        nameLines === 2 ? 'line-clamp-2 leading-[1.1rem] wrap-anywhere' : 'truncate',
        problem ? 'font-mono font-medium' : 'font-semibold',
        onActivate ? 'group-hover/node:text-accent group-focus-visible/node:text-accent' : undefined,
      )}
    >
      {nameLines === 2 ? withSeparatorBreaks(name) : name}
    </span>
  )
  const chip = (
    <span data-node-icon className={cn('grid shrink-0 place-items-center', compact ? 'size-5.5 rounded-md' : 'size-6.5 rounded-lg', chipTone[tone])}>
      <Icon className={compact ? 'size-3.25' : 'size-3.75'} aria-hidden="true" />
    </span>
  )
  const facts = meta || monoId ? (
    <span className={cn('flex min-w-0 flex-wrap items-center gap-1.5 text-[11px] text-text-muted', compact ? 'mt-0.5 leading-4' : 'mt-1.5')}>
      {meta}
      {monoId ? <span className="min-w-0 font-mono break-all text-text-subtle">{monoId}</span> : null}
    </span>
  ) : null

  const body = compact ? (
    <>
      {chip}
      <span className="flex min-w-0 flex-1 flex-col">{nameElement}{facts}</span>
    </>
  ) : (
    <>
      <span className="flex min-w-0 items-center gap-2">{chip}{nameElement}</span>
      {facts}
    </>
  )

  if (onActivate) {
    return (
      <button type="button" aria-label={activateLabel ?? name} onClick={onActivate} {...shared} className={cn(shared.className, !compact && 'block w-full text-left')}>
        {body}
        {children}
        <span id={descriptionId} hidden>{description}</span>
      </button>
    )
  }

  return (
    <div role="group" tabIndex={0} aria-labelledby={nameId} {...shared}>
      {body}
      {children}
      <span id={descriptionId} hidden>{description}</span>
    </div>
  )
}
