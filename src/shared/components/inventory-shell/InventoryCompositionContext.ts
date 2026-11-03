import { createContext, useContext } from 'react'

export type InventoryFrame = 'standalone' | 'embedded'
export type InventoryNavigationAppearance = 'default' | 'embedded'

export const InventoryFrameContext = createContext<InventoryFrame>('standalone')
export const InventoryNavigationContext = createContext<InventoryNavigationAppearance>('default')

export function useInventoryFrame(override?: InventoryFrame): InventoryFrame {
  const inherited = useContext(InventoryFrameContext)
  return override ?? inherited
}

export function useInventoryNavigation(override?: InventoryNavigationAppearance): InventoryNavigationAppearance {
  const inherited = useContext(InventoryNavigationContext)
  return override ?? inherited
}
