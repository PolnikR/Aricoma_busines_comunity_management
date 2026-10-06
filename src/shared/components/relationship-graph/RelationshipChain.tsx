import type { ReactNode } from 'react'
import { cn } from '@/shared/utils/cn'
import { useRelationshipGraph } from './relationshipGraphContext'
import type { RelationshipChainLayout } from './relationshipGraphTypes'
import { chainColumns } from './chainColumns'

interface RelationshipChainProps {
  layout?: RelationshipChainLayout | undefined
  children: ReactNode
}

// One row of a relationship group: node, connector, node, connector, node, left to
// right from the `relationship-graph` container's 40rem width, otherwise stacked.
// Rows with fewer parts leave the trailing columns empty or fill them with a note.
// Under soft dimming the row holding the highlight gets a quiet surface.
export function RelationshipChain({ layout = 'balanced', children }: RelationshipChainProps) {
  const { density } = useRelationshipGraph()
  return (
    <li
      className={cn(
        'grid min-w-0 grid-cols-1 @min-[40rem]/relationship-graph:items-center @min-[40rem]/relationship-graph:gap-0',
        density === 'compact' ? 'gap-0.5 px-3 py-2.5' : 'gap-1 p-3',
        chainColumns[layout],
        'transition-colors duration-150 in-data-[dimming=soft]:has-data-[highlight=on]:bg-accent-soft/35',
      )}
    >
      {children}
    </li>
  )
}
