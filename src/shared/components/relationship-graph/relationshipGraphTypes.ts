// Meaning of a connector, which drives its colour: backing storage (accent),
// storage partner (orange, never a warning), data replicated from one entity to
// another (accent), a snapshot/copy protection relationship (protection pink), a
// problem reference (dashed error), or a plain association with no relationship
// semantics (neutral).
export type RelationshipEdgeKind = 'backing' | 'partner' | 'replication' | 'protection' | 'problem' | 'neutral'

// Reading direction of a connector between the node before and the node after it.
export type RelationshipDirection = 'forward' | 'backward' | 'both'

// Line drawing of a connector, independent of its kind. The consumer decides what a
// dashed line means (unresolved, not reported, ...); without it, problems are dashed.
export type RelationshipLineStyle = 'solid' | 'dashed'

// Identity of a node's icon chip. It is the kind of entity, never a status.
export type RelationshipNodeTone = 'compute' | 'storage' | 'infrastructure' | 'protection' | 'problem'

// Presentation of a whole graph. `compact` uses one-row nodes and connectors with the
// label above a stronger line, for dense operational views.
export type RelationshipDensity = 'default' | 'compact'

// How strongly parts outside the highlight recede: `strong` (35 % nodes, 12 % edges) for
// small contextual helpers, `soft` (60 %) where every row stays readable.
export type RelationshipDimming = 'strong' | 'soft'

// What a hovered or focused node highlights: itself and its direct neighbours, or every
// entity connected to it (a whole row of a chain).
export type RelationshipHighlightScope = 'neighbours' | 'component'

// Grid of a chain row from the `relationship-graph` container's 40rem width: `balanced`
// gives the nodes equal room; `leading` widens the first connector (status, progress)
// and keeps the trailing column for a compact endpoint.
export type RelationshipChainLayout = 'balanced' | 'leading'

// A drawn connection between two logical entity ids. An entity that is rendered
// in several rows keeps one id, so highlighting treats all its cards as one node.
export interface RelationshipEdge {
  from: string
  to: string
}
