import type { ReactNode } from 'react'

export interface ResourceDetailField<T> {
  id: string
  label: string
  value: (resource: T) => ReactNode
  secondary?: (resource: T) => ReactNode
}
