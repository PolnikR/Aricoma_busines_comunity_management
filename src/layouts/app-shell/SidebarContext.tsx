import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { SidebarContext } from './AppSidebarContext'

interface SidebarProviderProps {
  children: ReactNode
}

function getInitialIsMobile() {
  return window.innerWidth < 1280
}

export function SidebarProvider({ children }: SidebarProviderProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(getInitialIsMobile)
  const [isHovered, setIsHovered] = useState(false)

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