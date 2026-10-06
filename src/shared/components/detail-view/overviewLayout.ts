import type { ReactNode } from 'react'

// Plain text without `wide` up to NORMAL_MAX characters takes one track, up to WIDE_MAX two
// tracks, and anything longer the whole row. Mono text is measured the same way.
export const NORMAL_MAX = 28
export const WIDE_MAX = 64

export type OverviewFootprint = 'normal' | 'wide' | 'full'

// How many grid tracks a DetailField takes inside a DetailOverview. `wide` is the consumer's
// explicit full-row intent and wins for every value, empty ones included, so a missing value
// never re-pairs the fields after it. Without it, empty values ("Not set") and nodes (links,
// badges, tags), which cannot be measured, take one track, and plain text is measured.
export function getOverviewFootprint(value: ReactNode, wide: boolean): OverviewFootprint {
  if (wide) return 'full'
  if (typeof value !== 'string' || value.trim() === '' || value.length <= NORMAL_MAX) return 'normal'
  return value.length <= WIDE_MAX ? 'wide' : 'full'
}
