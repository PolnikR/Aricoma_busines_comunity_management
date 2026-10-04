import { cn } from '@/shared/utils/cn'
import { useRelationshipGraph } from './relationshipGraphContext'
import type { RelationshipDirection, RelationshipEdgeKind } from './relationshipGraphTypes'

// Line (and tips, through currentColor) and label colours per kind. Partner uses the
// orange family on purpose: it is a structural relationship, not a warning.
const lineTone: Record<RelationshipEdgeKind, string> = {
  backing: 'text-accent',
  partner: 'text-orange-500 dark:text-orange-400',
  problem: 'text-error-500',
  neutral: 'text-border-strong',
}

const labelTone: Record<RelationshipEdgeKind, string> = {
  backing: 'text-accent',
  partner: 'text-orange-600 dark:text-orange-400',
  problem: 'text-error-600 dark:text-error-500',
  neutral: 'text-text-muted',
}

type TipPlacement = 'end' | 'start'

// A small triangle pointing along the line. Wide rows run left to right, so the
// end tip points right; narrow rows stack top to bottom, so it points down.
function Tip({ placement, layout }: { placement: TipPlacement; layout: 'wide' | 'narrow' }) {
  const position = layout === 'wide'
    ? placement === 'end' ? 'right-0.5 top-1/2 -translate-y-1/2' : 'left-0.5 top-1/2 -translate-y-1/2 rotate-180'
    : placement === 'end' ? 'bottom-0 left-1/2 -translate-x-1/2 rotate-90' : 'top-0 left-1/2 -translate-x-1/2 -rotate-90'
  return (
    <svg
      viewBox="0 0 10 10"
      aria-hidden="true"
      data-tip={`${layout}-${placement}`}
      className={cn('absolute size-2.5 fill-current', position, layout === 'wide' ? 'hidden @min-[40rem]/relationship-graph:block' : '@min-[40rem]/relationship-graph:hidden')}
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
  direction?: RelationshipDirection
  label: string
  // Read instead of the visible label, e.g. "mutual partner".
  srLabel?: string
}

export function RelationshipConnector({ from, to, kind, direction = 'forward', label, srLabel }: RelationshipConnectorProps) {
  const { edgeHighlight } = useRelationshipGraph()
  const highlight = edgeHighlight(from, to)
  const showEnd = direction !== 'backward'
  const showStart = direction !== 'forward'
  const lineStyle = kind === 'problem' ? 'border-dashed' : 'border-solid'

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
        className={cn('absolute inset-0 transition-opacity duration-150', lineTone[kind], highlight === 'off' ? 'opacity-[0.12]' : undefined)}
      >
        <span className={cn('absolute inset-y-1 left-1/2 -translate-x-1/2 border-l-2 border-current @min-[40rem]/relationship-graph:hidden', lineStyle)} />
        <span className={cn('absolute inset-x-1.5 top-1/2 hidden -translate-y-1/2 border-t-2 border-current @min-[40rem]/relationship-graph:block', lineStyle)} />
        {showEnd ? <><Tip placement="end" layout="wide" /><Tip placement="end" layout="narrow" /></> : null}
        {showStart ? <><Tip placement="start" layout="wide" /><Tip placement="start" layout="narrow" /></> : null}
      </div>
      <span
        aria-hidden="true"
        data-connector-label
        className={cn('relative max-w-full truncate bg-surface px-1.5 text-[10.5px] font-semibold transition-opacity duration-150', labelTone[kind], highlight === 'off' ? 'opacity-15' : undefined)}
      >
        {label}
      </span>
      <span className="sr-only">{srLabel ?? label}</span>
    </div>
  )
}
