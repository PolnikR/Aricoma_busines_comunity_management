import { Outlet } from 'react-router-dom'
import { AppHeader } from './AppHeader'
import { AppSidebar } from './AppSidebar'
import { useSidebar } from './useSidebar'

export function AppShell() {
  const { isExpanded, isHovered, isMobileOpen, closeMobileSidebar } = useSidebar()
  const contentOffset = isExpanded || isHovered ? 'xl:ml-[290px]' : 'xl:ml-[90px]'

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <AppSidebar />
      {isMobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-gray-900/50 xl:hidden"
          aria-label="Close sidebar backdrop"
          onClick={closeMobileSidebar}
        />
      ) : null}
      <div className={`min-h-screen transition-all duration-300 ease-in-out ${contentOffset}`}>
        <AppHeader />
        <main className="mx-auto max-w-screen-2xl p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}