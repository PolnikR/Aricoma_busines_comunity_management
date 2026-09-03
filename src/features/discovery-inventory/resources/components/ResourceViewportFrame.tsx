import type { ReactNode } from 'react'
import { ContainedViewportFrame } from '@/shared/components/page/ContainedViewportFrame'

export function ResourceViewportFrame({ children }: { children: ReactNode }) {
  return <ContainedViewportFrame>{children}</ContainedViewportFrame>
}
