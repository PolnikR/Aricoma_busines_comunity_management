import { createContext } from 'react'

export interface SidebarContextValue {
  isExpanded: boolean
  isMobileOpen: boolean
  isHovered: boolean
  toggleSidebar: () => void
  toggleMobileSidebar: () => void
  closeMobileSidebar: () => void
  setIsHovered: (isHovered: boolean) => void
}

export const SidebarContext = createContext<SidebarContextValue | undefined>(undefined)