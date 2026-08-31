import { createContext } from 'react'

export interface SidebarContextValue {
  isExpanded: boolean
  /**
   * True only when the desktop sidebar is deliberately collapsed to its icon
   * rail. Stays false on mobile, where `isMobileOpen` drives the full drawer.
   */
  isCollapsed: boolean
  isMobileOpen: boolean
  isHovered: boolean
  toggleSidebar: () => void
  toggleMobileSidebar: () => void
  closeMobileSidebar: () => void
  setIsHovered: (isHovered: boolean) => void
}

export const SidebarContext = createContext<SidebarContextValue | undefined>(undefined)