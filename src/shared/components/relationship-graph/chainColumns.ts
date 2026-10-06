import type { RelationshipChainLayout } from './relationshipGraphTypes'

// Full class strings only, so Tailwind can see every one of them. `leading` takes a
// second step at 54rem, where the first connector has room for status and progress.
export const chainColumns: Record<RelationshipChainLayout, string> = {
  balanced: '@min-[40rem]/relationship-graph:grid-cols-[minmax(0,1fr)_7.5rem_minmax(0,1fr)_6.25rem_minmax(0,1fr)]',
  leading: '@min-[40rem]/relationship-graph:grid-cols-[minmax(0,1fr)_8.5rem_minmax(0,1.2fr)_4.75rem_7.75rem] @min-[54rem]/relationship-graph:grid-cols-[minmax(0,0.9fr)_11.5rem_minmax(0,1.15fr)_7rem_8.5rem]',
}
