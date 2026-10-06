import type { ReactNode } from 'react'

// Plain text without `wide` up to NORMAL_MAX characters takes one track, up to WIDE_MAX two
// tracks, and anything longer the whole row. Mono text is measured the same way.
export const NORMAL_MAX = 28
export const WIDE_MAX = 64

export type OverviewFootprint = 'normal' | 'wide' | 'full'

// How many grid tracks a DetailField takes inside a DetailOverview. `wide` is an explicit
// full-row override for any value. Without it, plain text is measured and nodes (links,
// badges, tags), which cannot be measured, take one track. Empty values ("Not set") are
// always normal.
export function getOverviewFootprint(value: ReactNode, wide: boolean): OverviewFootprint {
  if (value === null || value === undefined) return 'normal'
  if (typeof value === 'string' && value.trim() === '') return 'normal'
  if (wide) return 'full'
  if (typeof value !== 'string' || value.length <= NORMAL_MAX) return 'normal'
  return value.length <= WIDE_MAX ? 'wide' : 'full'
}
