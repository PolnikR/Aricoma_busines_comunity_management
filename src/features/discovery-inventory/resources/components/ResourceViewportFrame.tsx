import type { ReactNode } from 'react'
import { InventoryViewportFrame } from '@/shared/components/page/InventoryViewportFrame'

export function ResourceViewportFrame({ children }: { children: ReactNode }) {
  return <InventoryViewportFrame>{children}</InventoryViewportFrame>
}
