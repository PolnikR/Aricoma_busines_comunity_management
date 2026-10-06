import type { ReactNode } from 'react'
import { cn } from '@/shared/utils/cn'
import { chainColumns } from './chainColumns'
import type { RelationshipChainLayout } from './relationshipGraphTypes'

interface RelationshipLanesProps {
  layout?: RelationshipChainLayout | undefined
  // One label per chain column (node, connector, node, connector, node); null leaves a
  // column unlabelled, typically the connectors, which name themselves.
  labels: readonly (ReactNode | null)[]
}

// Column labels for a RelationshipGroup header, aligned with its chain rows, so a role
// is named once instead of on every node. Hidden in the stacked layout, where the nodes
// carry their role instead. Decorative: rows and nodes have their own accessible names.
export function RelationshipLanes({ layout = 'balanced', labels }: RelationshipLanesProps) {
  return (
    <div
      aria-hidden="true"
      data-relationship-lanes
      className={cn(
        'hidden border-b border-border bg-surface-muted px-3 py-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-text-muted @min-[40rem]/relationship-graph:grid',
        chainColumns[layout],
      )}
    >
      {labels.map((label, index) => <span key={index} className="min-w-0 truncate">{label}</span>)}
    </div>
  )
}
