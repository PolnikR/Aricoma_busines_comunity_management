import type { ReactNode } from 'react'

export function ContainedViewportFrame({ children }: { children: ReactNode }) {
  return <div className="flex min-h-full flex-col lg:h-full lg:min-h-0 lg:overflow-y-auto">{children}</div>
}
