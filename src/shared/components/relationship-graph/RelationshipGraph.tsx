import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { buildAdjacency, isEdgeHighlighted, isNodeHighlighted } from './relationshipAdjacency'
import { RelationshipGraphContext, type RelationshipGraphContextValue } from './relationshipGraphContext'
import type { RelationshipEdge } from './relationshipGraphTypes'

interface RelationshipGraphProps {
  // Every drawn connection, by logical entity id; it defines who neighbours whom.
  edges: readonly RelationshipEdge[]
  children: ReactNode
}

// A small contextual relationship diagram. Hovering or focusing a node keeps it
// and its direct neighbours at full strength and dims everything else; leaving
// falls back to the keyboard-focused node, if any. Rows switch from a left-to-right
// chain to a vertical stack through the `relationship-graph` container query.
export function RelationshipGraph({ edges, children }: RelationshipGraphProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const adjacency = useMemo(() => buildAdjacency(edges), [edges])
  const activeId = hoveredId ?? focusedId

  const value = useMemo<RelationshipGraphContextValue>(() => ({
    nodeHighlight: entityId => {
      if (activeId === null) return 'idle'
      return isNodeHighlighted(activeId, adjacency, entityId) ? 'on' : 'off'
    },
    edgeHighlight: (from, to) => {
      if (activeId === null) return 'idle'
      return isEdgeHighlighted(activeId, from, to) ? 'on' : 'off'
    },
    hover: setHoveredId,
    focus: setFocusedId,
  }), [activeId, adjacency])

  return (
    <RelationshipGraphContext.Provider value={value}>
      <div className="@container/relationship-graph flex flex-col gap-3" data-dimmed={activeId === null ? undefined : 'true'}>
        {children}
      </div>
    </RelationshipGraphContext.Provider>
  )
}
