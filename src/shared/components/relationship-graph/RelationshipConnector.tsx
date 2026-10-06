import type { ReactNode } from 'react'
import { cn } from '@/shared/utils/cn'
import { useRelationshipGraph, type RelationshipHighlight } from './relationshipGraphContext'
import type { RelationshipDimming, RelationshipDirection, RelationshipEdgeKind, RelationshipLineStyle } from './relationshipGraphTypes'

// Line (and tips, through currentColor) and label colours per kind. Partner uses the
// orange family on purpose: it is a structural relationship, not a warning.
const lineTone: Record<RelationshipEdgeKind, string> = {
  backing: 'text-accent',
  partner: 'text-orange-500 dark:text-orange-400',
  replication: 'text-accent',
  protection: 'text-theme-pink-500',
  problem: 'text-error-500',
  neutral: 'text-border-strong',
}

const labelTone: Record<RelationshipEdgeKind, string> = {
  backing: 'text-accent',
  partner: 'text-orange-600 dark:text-orange-400',
  replication: 'text-accent',
  protection: 'text-theme-pink-500',
  problem: 'text-error-600 dark:text-error-500',
  neutral: 'text-text-muted',
}

type TipPlacement = 'end' | 'start'

// A small triangle pointing along the line. Wide rows run left to right, so the
// end tip points right; narrow rows stack top to bottom, so it points down.
function Tip({ placement, layout, large = false }: { placement: TipPlacement; layout: 'wide' | 'narrow'; large?: boolean }) {
  const position = layout === 'wide'
    ? placement === 'end' ? 'right-0.5 top-1/2 -translate-y-1/2' : 'left-0.5 top-1/2 -translate-y-1/2 rotate-180'
    : placement === 'end' ? 'bottom-0 left-1/2 -translate-x-1/2 rotate-90' : 'top-0 left-1/2 -translate-x-1/2 -rotate-90'
  return (
    <svg
      viewBox="0 0 10 10"
      aria-hidden="true"
      data-tip={`${layout}-${placement}`}
      className={cn('absolute fill-current', large ? 'size-3' : 'size-2.5', position, layout === 'wide' ? 'hidden @min-[40rem]/relationship-graph:block' : '@min-[40rem]/relationship-graph:hidden')}
    >
      <path d="M0 0 10 5 0 10z" />
    </svg>
  )
}

interface RelationshipConnectorProps {
  // Logical entity ids of the nodes before and after the connector.
  from: string
  to: string
  kind: RelationshipEdgeKind
  direction?: RelationshipDirection | undefined
  label: string
  // Read instead of the visible label (and value/note), e.g. "mutual partner".
  srLabel?: string
  // Short fact next to the label, e.g. "72 %" or "In sync". The consumer decides the wording.
  value?: ReactNode | undefined
  // Secondary line under the connector, e.g. a state that differs from its group.
  note?: ReactNode | undefined
  // 0–100: the line becomes a track filled in the reading direction. Omit when unknown;
  // 0 is a real, empty fill.
  progress?: number | undefined
  // Defaults to dashed for problems and solid otherwise.
  lineStyle?: RelationshipLineStyle | undefined
}

function dimClass(highlight: RelationshipHighlight, dimming: RelationshipDimming, strong: string) {
  if (highlight !== 'off') return undefined
  return dimming === 'soft' ? 'opacity-60' : strong
}

export function RelationshipConnector({ from, to, kind, direction = 'forward', label, srLabel, value, note, progress, lineStyle }: RelationshipConnectorProps) {
  const { edgeHighlight, density, dimming } = useRelationshipGraph()
  const highlight = edgeHighlight(from, to)
  const showEnd = direction !== 'backward'
  const showStart = direction !== 'forward'
  const dashed = (lineStyle ?? (kind === 'problem' ? 'dashed' : 'solid')) === 'dashed'
  const rich = density === 'compact' || value !== undefined || note !== undefined || progress !== undefined

  if (!rich) {
    const style = dashed ? 'border-dashed' : 'border-solid'
    return (
      <div
        data-edge-kind={kind}
        data-direction={direction}
        data-highlight={highlight}
        className="relative flex h-12 min-w-0 items-center justify-center @min-[40rem]/relationship-graph:h-5.5"
      >
        <div
          aria-hidden="true"
          data-connector-line
          className={cn('absolute inset-0 transition-opacity duration-150', lineTone[kind], dimClass(highlight, dimming, 'opacity-[0.12]'))}
        >
          <span className={cn('absolute inset-y-1 left-1/2 -translate-x-1/2 border-l-2 border-current @min-[40rem]/relationship-graph:hidden', style)} />
          <span className={cn('absolute inset-x-1.5 top-1/2 hidden -translate-y-1/2 border-t-2 border-current @min-[40rem]/relationship-graph:block', style)} />
          {showEnd ? <><Tip placement="end" layout="wide" /><Tip placement="end" layout="narrow" /></> : null}
          {showStart ? <><Tip placement="start" layout="wide" /><Tip placement="start" layout="narrow" /></> : null}
        </div>
        <span
          aria-hidden="true"
          data-connector-label
          className={cn('relative max-w-full truncate bg-surface px-1.5 text-[10.5px] font-semibold transition-opacity duration-150', labelTone[kind], dimClass(highlight, dimming, 'opacity-15'))}
        >
          {label}
        </span>
        <span className="sr-only">{srLabel ?? label}</span>
      </div>
    )
  }

  // Rich connector: label (and value) above a 3 px line, optional note under it. The line
  // is a progress track when progress is given, filled from the side the arrow leaves.
  const fill = progress === undefined ? null : Math.max(0, Math.min(100, progress))
  const fromEnd = direction === 'backward'
  const track = (axis: 'x' | 'y') => {
    const wide = axis === 'x'
    if (dashed) {
      return <span data-connector-track className={wide ? 'absolute inset-x-1 top-1/2 -translate-y-1/2 border-t-2 border-dashed border-current' : 'absolute inset-y-1 left-1/2 -translate-x-1/2 border-l-2 border-dashed border-current'} />
    }
    return (
      <>
        <span data-connector-track className={cn('absolute rounded-full', wide ? 'inset-x-1 top-1/2 h-0.75 -translate-y-1/2' : 'inset-y-1 left-1/2 w-0.75 -translate-x-1/2', fill === null ? 'bg-current' : 'bg-current/20')} />
        {fill === null ? null : (
          <span
            data-connector-progress={fill}
            className={cn('absolute rounded-full bg-current', wide ? cn('top-1/2 h-0.75 -translate-y-1/2', fromEnd ? 'right-1' : 'left-1') : cn('left-1/2 w-0.75 -translate-x-1/2', fromEnd ? 'bottom-1' : 'top-1'))}
            style={wide ? { width: `calc((100% - 0.5rem) * ${String(fill / 100)})` } : { height: `calc((100% - 0.5rem) * ${String(fill / 100)})` }}
          />
        )}
      </>
    )
  }

  return (
    <div
      data-edge-kind={kind}
      data-direction={direction}
      data-highlight={highlight}
      className={cn('relative min-w-0 transition-opacity duration-150', dimClass(highlight, dimming, 'opacity-35'))}
    >
      <div aria-hidden="true" className="hidden px-2.5 @min-[40rem]/relationship-graph:block">
        <div className="flex items-baseline justify-between gap-2 text-[11px] leading-4 font-semibold">
          <span data-connector-label className={cn('truncate', labelTone[kind])}>{label}</span>
          {value !== undefined ? <span data-connector-value className="shrink-0">{value}</span> : null}
        </div>
        <div data-connector-line className={cn('relative mt-0.5 h-3', lineTone[kind])}>
          {track('x')}
          {showEnd ? <Tip placement="end" layout="wide" large /> : null}
          {showStart ? <Tip placement="start" layout="wide" large /> : null}
        </div>
        {note !== undefined ? <div data-connector-note className="mt-0.5 line-clamp-2 text-[10.5px] leading-4 font-medium">{note}</div> : null}
      </div>
      <div aria-hidden="true" className="flex min-h-11 items-stretch gap-2.5 pl-2 @min-[40rem]/relationship-graph:hidden">
        <span className={cn('relative w-3 shrink-0', lineTone[kind])}>
          {track('y')}
          {showEnd ? <Tip placement="end" layout="narrow" large /> : null}
          {showStart ? <Tip placement="start" layout="narrow" large /> : null}
        </span>
        <span className="min-w-0 self-center py-1 text-[11px] leading-4">
          <span className={cn('font-semibold', labelTone[kind])}>{label}</span>
          {value !== undefined ? <> <span className="text-text-subtle">·</span> <span className="font-semibold">{value}</span></> : null}
          {note !== undefined ? <span className="block font-medium">{note}</span> : null}
        </span>
      </div>
      <span className="sr-only">{srLabel ?? <>{label}{value !== undefined ? <>, {value}</> : null}{note !== undefined ? <>, {note}</> : null}</>}</span>
    </div>
  )
}
