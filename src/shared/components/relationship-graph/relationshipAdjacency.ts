import type { RelationshipEdge } from './relationshipGraphTypes'

export type RelationshipAdjacency = ReadonlyMap<string, ReadonlySet<string>>

export function buildAdjacency(edges: readonly RelationshipEdge[]): RelationshipAdjacency {
  const adjacency = new Map<string, Set<string>>()
  const link = (from: string, to: string) => {
    const neighbours = adjacency.get(from) ?? new Set<string>()
    neighbours.add(to)
    adjacency.set(from, neighbours)
  }
  for (const edge of edges) {
    link(edge.from, edge.to)
    link(edge.to, edge.from)
  }
  return adjacency
}

// One hop only: the active node and its direct neighbours, never the whole chain.
export function isNodeHighlighted(activeId: string, adjacency: RelationshipAdjacency, entityId: string): boolean {
  return entityId === activeId || (adjacency.get(activeId)?.has(entityId) ?? false)
}

export function isEdgeHighlighted(activeId: string, from: string, to: string): boolean {
  return from === activeId || to === activeId
}

// Every entity reachable from the active one, the active entity included.
export function connectedComponent(activeId: string, adjacency: RelationshipAdjacency): ReadonlySet<string> {
  const seen = new Set<string>([activeId])
  const queue = [activeId]
  for (let next = queue.pop(); next !== undefined; next = queue.pop()) {
    for (const neighbour of adjacency.get(next) ?? []) {
      if (!seen.has(neighbour)) {
        seen.add(neighbour)
        queue.push(neighbour)
      }
    }
  }
  return seen
}
