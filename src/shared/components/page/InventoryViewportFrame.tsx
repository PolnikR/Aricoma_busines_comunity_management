import type { ReactNode } from 'react'
import { ContainedViewportFrame } from './ContainedViewportFrame'

export function InventoryViewportFrame({ children }: { children: ReactNode }) {
  return (
    <ContainedViewportFrame>
      <div className="flex min-w-0 flex-1 flex-col p-2 lg:min-h-0">{children}</div>
    </ContainedViewportFrame>
  )
}
