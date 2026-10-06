import type { ReactNode } from 'react'

// Plain text up to NORMAL_MAX characters takes one track, up to WIDE_MAX two tracks, and
// anything longer the whole row. Mono text is measured the same way.
export const NORMAL_MAX = 28
export const WIDE_MAX = 64

export type OverviewFootprint = 'normal' | 'wide' | 'full'

// How many grid tracks a DetailField takes inside a DetailOverview. Plain text is measured;
// nodes (links, badges, tags) cannot be, so `wide` makes them full and they are normal
// otherwise. `wide` on plain text is ignored. Empty values ("Not set") are always normal.
export function getOverviewFootprint(value: ReactNode, wide: boolean): OverviewFootprint {
  if (value === null || value === undefined) return 'normal'
  if (typeof value === 'string') {
    if (value.trim() === '' || value.length <= NORMAL_MAX) return 'normal'
    return value.length <= WIDE_MAX ? 'wide' : 'full'
  }
  return wide ? 'full' : 'normal'
}
