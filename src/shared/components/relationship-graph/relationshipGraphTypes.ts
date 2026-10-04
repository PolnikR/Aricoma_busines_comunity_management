// Meaning of a connector, which drives its colour: backing storage (accent),
// storage partner (orange, never a warning), a problem reference (dashed error),
// or a plain association with no relationship semantics (neutral).
export type RelationshipEdgeKind = 'backing' | 'partner' | 'problem' | 'neutral'

// Reading direction of a connector between the node before and the node after it.
export type RelationshipDirection = 'forward' | 'backward' | 'both'

// Identity of a node's icon chip. It is the kind of entity, never a status.
export type RelationshipNodeTone = 'compute' | 'storage' | 'infrastructure' | 'protection' | 'problem'

// A drawn connection between two logical entity ids. An entity that is rendered
// in several rows keeps one id, so highlighting treats all its cards as one node.
export interface RelationshipEdge {
  from: string
  to: string
}
