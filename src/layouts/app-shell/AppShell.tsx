import { Outlet } from 'react-router'
import { AppHeader } from './AppHeader'
import { AppSidebar } from './AppSidebar'
import { useSidebar } from './useSidebar'

export function AppShell() {
  const { isMobileOpen, closeMobileSidebar } = useSidebar()

  return (
    <div className="min-h-screen p-0 text-text-primary lg:h-screen lg:overflow-hidden lg:p-3 xl:p-4">
      {isMobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm lg:hidden"
          aria-label="Close sidebar backdrop"
          onClick={closeMobileSidebar}
        />
      ) : null}
      <div className="flex min-h-screen w-full gap-3 lg:h-full lg:min-h-0 xl:gap-4">
        <AppSidebar />
        <section className="flex min-w-0 flex-1 flex-col bg-surface lg:min-h-0 lg:overflow-hidden lg:rounded-[28px] lg:border lg:border-border lg:shadow-[0_24px_70px_-34px_rgba(34,78,122,0.35)]">
          <AppHeader />
          <main className="flex flex-1 flex-col px-4 py-5 sm:px-6 lg:min-h-0 lg:overflow-auto lg:px-6 lg:py-5 xl:px-8">
            {/*
              min-h-min stops the page shrinking past its own content minimum, so a
              window too short to hold it overflows into a scrollbar instead of
              squeezing the table to nothing. The browser derives that minimum per
              page, which keeps it correct when the metrics grid wraps.
            */}
            <div className="flex flex-1 flex-col lg:min-h-min">
              <Outlet />
            </div>
          </main>
        </section>
      </div>
    </div>
  )
}
