import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { buildAdjacency, connectedComponent, isEdgeHighlighted, isNodeHighlighted } from './relationshipAdjacency'
import { RelationshipGraphContext, type RelationshipGraphContextValue } from './relationshipGraphContext'
import type { RelationshipDensity, RelationshipDimming, RelationshipEdge, RelationshipHighlightScope } from './relationshipGraphTypes'

interface RelationshipGraphProps {
  // Every drawn connection, by logical entity id; it defines who neighbours whom.
  edges: readonly RelationshipEdge[]
  density?: RelationshipDensity | undefined
  dimming?: RelationshipDimming | undefined
  highlightScope?: RelationshipHighlightScope | undefined
  // Highlight driven from outside the graph (e.g. a linked list). The pointer still wins;
  // keyboard focus inside the graph applies when it is null. An id the graph does not
  // draw is ignored, so it never dims everything.
  activeEntityId?: string | null | undefined
  // Reports the entity the user hovers or focuses inside the graph (null when none).
  onActiveEntityChange?: ((entityId: string | null) => void) | undefined
  children: ReactNode
}

// A small contextual relationship diagram. Hovering or focusing a node keeps it
// and its direct neighbours (or its whole connected component) at full strength and
// dims everything else; leaving falls back to the external, then the keyboard-focused
// node, if any. Rows switch from a left-to-right chain to a vertical stack through the
// `relationship-graph` container query.
export function RelationshipGraph({
  edges,
  density = 'default',
  dimming = 'strong',
  highlightScope = 'neighbours',
  activeEntityId = null,
  onActiveEntityChange,
  children,
}: RelationshipGraphProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const adjacency = useMemo(() => buildAdjacency(edges), [edges])
  const externalId = activeEntityId !== null && adjacency.has(activeEntityId) ? activeEntityId : null
  const activeId = hoveredId ?? externalId ?? focusedId
  const component = useMemo(
    () => (highlightScope === 'component' && activeId !== null ? connectedComponent(activeId, adjacency) : null),
    [highlightScope, activeId, adjacency],
  )

  const onChangeRef = useRef(onActiveEntityChange)
  useEffect(() => {
    onChangeRef.current = onActiveEntityChange
  }, [onActiveEntityChange])
  const internalId = hoveredId ?? focusedId
  useEffect(() => {
    onChangeRef.current?.(internalId)
  }, [internalId])

  const value = useMemo<RelationshipGraphContextValue>(() => ({
    nodeHighlight: entityId => {
      if (activeId === null) return 'idle'
      const on = component ? component.has(entityId) : isNodeHighlighted(activeId, adjacency, entityId)
      return on ? 'on' : 'off'
    },
    edgeHighlight: (from, to) => {
      if (activeId === null) return 'idle'
      const on = component ? component.has(from) && component.has(to) : isEdgeHighlighted(activeId, from, to)
      return on ? 'on' : 'off'
    },
    hover: setHoveredId,
    focus: setFocusedId,
    density,
    dimming,
  }), [activeId, adjacency, component, density, dimming])

  return (
    <RelationshipGraphContext.Provider value={value}>
      <div
        className="@container/relationship-graph flex flex-col gap-3"
        data-dimmed={activeId === null ? undefined : 'true'}
        data-dimming={dimming === 'soft' ? 'soft' : undefined}
      >
        {children}
      </div>
    </RelationshipGraphContext.Provider>
  )
}
