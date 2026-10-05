import { describe, expect, it } from 'vitest'
import { buildAdjacency, isEdgeHighlighted, isNodeHighlighted } from './relationshipAdjacency'

// compute -> storage -> partner, plus a second compute on the same storage.
const edges = [
  { from: 'compute', to: 'storage' },
  { from: 'storage', to: 'partner' },
  { from: 'compute-2', to: 'storage' },
]

describe('relationship adjacency', () => {
  const adjacency = buildAdjacency(edges)

  it('keeps the active node and its direct neighbours, one hop only', () => {
    expect(['compute', 'storage', 'partner', 'compute-2'].filter(id => isNodeHighlighted('compute', adjacency, id))).toEqual(['compute', 'storage'])
    expect(['compute', 'storage', 'partner', 'compute-2'].filter(id => isNodeHighlighted('storage', adjacency, id))).toEqual(['compute', 'storage', 'partner', 'compute-2'])
    expect(['compute', 'storage', 'partner', 'compute-2'].filter(id => isNodeHighlighted('partner', adjacency, id))).toEqual(['storage', 'partner'])
  })

  it('highlights only edges that touch the active node', () => {
    expect(edges.filter(edge => isEdgeHighlighted('compute', edge.from, edge.to))).toEqual([{ from: 'compute', to: 'storage' }])
    expect(edges.filter(edge => isEdgeHighlighted('partner', edge.from, edge.to))).toEqual([{ from: 'storage', to: 'partner' }])
  })

  it('treats a node without edges as its own only highlight', () => {
    expect(isNodeHighlighted('alone', adjacency, 'alone')).toBe(true)
    expect(isNodeHighlighted('alone', adjacency, 'compute')).toBe(false)
  })
})
