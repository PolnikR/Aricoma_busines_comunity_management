import type { ReactNode } from 'react'

// One row of a relationship group: node, connector, node, connector, node, left to
// right from the `relationship-graph` container's 40rem width, otherwise stacked.
// Rows with fewer parts leave the trailing columns empty or fill them with a note.
export function RelationshipChain({ children }: { children: ReactNode }) {
  return (
    <li className="grid min-w-0 grid-cols-1 gap-1 p-3 @min-[40rem]/relationship-graph:grid-cols-[minmax(0,1fr)_7.5rem_minmax(0,1fr)_6.25rem_minmax(0,1fr)] @min-[40rem]/relationship-graph:items-center @min-[40rem]/relationship-graph:gap-0">
      {children}
    </li>
  )
}
