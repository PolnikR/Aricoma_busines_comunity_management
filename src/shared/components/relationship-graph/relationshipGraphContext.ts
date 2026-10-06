import { createContext, useContext } from 'react'
import type { RelationshipDensity, RelationshipDimming } from './relationshipGraphTypes'

// 'idle' while nothing is hovered or focused; otherwise whether the part stays at
// full opacity ('on') or is dimmed ('off').
export type RelationshipHighlight = 'idle' | 'on' | 'off'

export interface RelationshipGraphContextValue {
  nodeHighlight: (entityId: string) => RelationshipHighlight
  edgeHighlight: (from: string, to: string) => RelationshipHighlight
  hover: (entityId: string | null) => void
  focus: (entityId: string | null) => void
  density: RelationshipDensity
  dimming: RelationshipDimming
}

export const RelationshipGraphContext = createContext<RelationshipGraphContextValue | null>(null)

export function useRelationshipGraph(): RelationshipGraphContextValue {
  const context = useContext(RelationshipGraphContext)
  if (!context) throw new Error('Relationship graph parts must be rendered inside RelationshipGraph')
  return context
}
