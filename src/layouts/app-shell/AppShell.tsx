import { useLayoutEffect, useRef } from 'react'
import { Outlet, useMatches } from 'react-router'
import { cn } from '@/shared/utils/cn'
import { AppHeader } from './AppHeader'
import { AppSidebar } from './AppSidebar'
import { useSidebar } from './useSidebar'

interface AppShellRouteHandle {
  contentScroll?: 'contained'
  contentFit?: 'viewport'
}

export function AppShell() {
  const { isMobileOpen, closeMobileSidebar } = useSidebar()
  const matches = useMatches()
  const fitsViewport = matches.some(match => (
    (match.handle as AppShellRouteHandle | undefined)?.contentFit === 'viewport'
  ))
  const hasContainedContent = fitsViewport || matches.some(match => (
    (match.handle as AppShellRouteHandle | undefined)?.contentScroll === 'contained'
  ))
  const shellRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLElement>(null)

  // Publishes the content surface's viewport box, so fixed overlays (DetailView) can centre
  // on it instead of on sidebar + content. Sidebar toggle, its content-based width and window
  // resizes all change the section's width, so observing the section covers them.
  useLayoutEffect(() => {
    const shell = shellRef.current
    const content = contentRef.current
    if (!shell || !content) return
    const publish = () => {
      const { left, width } = content.getBoundingClientRect()
      shell.style.setProperty('--app-content-left', `${String(left)}px`)
      shell.style.setProperty('--app-content-width', `${String(width)}px`)
    }
    publish()
    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(publish)
    resizeObserver?.observe(content)
    return () => {
      resizeObserver?.disconnect()
    }
  }, [])

  return (
    <div ref={shellRef} data-content-fit={fitsViewport ? 'viewport' : undefined} className={cn(
      'p-0 text-text-primary lg:p-3 xl:p-4',
      fitsViewport ? 'h-dvh min-h-0' : 'min-h-screen lg:h-screen lg:overflow-hidden',
    )}>
      {isMobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm lg:hidden"
          aria-label="Close sidebar backdrop"
          onClick={closeMobileSidebar}
        />
      ) : null}
      <div className={cn('flex w-full gap-3 xl:gap-4', fitsViewport ? 'h-full min-h-0' : 'min-h-screen lg:h-full lg:min-h-0')}>
        <AppSidebar />
        <section ref={contentRef} className={cn('flex min-w-0 flex-1 flex-col bg-surface lg:min-h-0 lg:overflow-hidden lg:rounded-[28px] lg:border lg:border-border lg:shadow-[0_24px_70px_-34px_rgba(34,78,122,0.35)]', fitsViewport && 'min-h-0')}>
          <AppHeader />
          <main className={cn(
            'flex flex-1 flex-col px-4 py-5 sm:px-6 lg:min-h-0 lg:px-6 lg:py-5 xl:px-8',
            hasContainedContent ? 'lg:overflow-hidden' : 'lg:overflow-auto',
            fitsViewport && 'min-h-0 overflow-hidden',
          )}>
            {/*
              min-h-min stops the page shrinking past its own content minimum, so a
              window too short to hold it overflows into a scrollbar instead of
              squeezing the table to nothing. The browser derives that minimum per
              page, which keeps it correct when the metrics grid wraps.
            */}
            <div className={cn(
              'flex flex-1 flex-col',
              hasContainedContent ? 'lg:min-h-0' : 'lg:min-h-min',
              fitsViewport && 'min-h-0',
            )}>
              <Outlet />
            </div>
          </main>
        </section>
      </div>
    </div>
  )
}
