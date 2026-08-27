import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { SidebarContext } from './AppSidebarContext'

interface SidebarProviderProps {
  children: ReactNode
}

const EXPANDED_STORAGE_KEY = 'app-sidebar-expanded'

function getInitialIsMobile() {
  return window.innerWidth < 1280
}

function getInitialIsExpanded() {
  try {
    return localStorage.getItem(EXPANDED_STORAGE_KEY) !== 'false'
  } catch {
    return true
  }
}

export function SidebarProvider({ children }: SidebarProviderProps) {
  const [isExpanded, setIsExpanded] = useState(getInitialIsExpanded)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(getInitialIsMobile)
  const [isHovered, setIsHovered] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem(EXPANDED_STORAGE_KEY, String(isExpanded))
    } catch {
      // The in-memory preference still works when storage is unavailable.
    }
  }, [isExpanded])

  useEffect(() => {
    const handleResize = () => {
      const nextIsMobile = window.innerWidth < 1280
      setIsMobile(nextIsMobile)

      if (!nextIsMobile) {
        setIsMobileOpen(false)
      }
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  const value = useMemo(
    () => ({
      isExpanded: isMobile ? false : isExpanded,
      isCollapsed: !isMobile && !isExpanded,
      isMobileOpen,
      isHovered,
      toggleSidebar: () => {
        setIsExpanded((current) => !current)
      },
      toggleMobileSidebar: () => {
        setIsMobileOpen((current) => !current)
      },
      closeMobileSidebar: () => {
        setIsMobileOpen(false)
      },
      setIsHovered,
    }),
    [isExpanded, isHovered, isMobile, isMobileOpen],
  )

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
}