import { useEffect, useRef } from 'react'
import { MenuIcon, SearchIcon } from '@/shared/icons/Icons'
import { useSidebar } from './useSidebar'

export function AppHeader() {
  const { isMobileOpen, toggleSidebar, toggleMobileSidebar } = useSidebar()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        inputRef.current?.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const handleToggle = () => {
    if (window.innerWidth >= 1280) {
      toggleSidebar()
      return
    }

    toggleMobileSidebar()
  }

  return (
    <header className="sticky top-0 z-40 flex w-full border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="flex grow flex-col items-center justify-between xl:flex-row xl:px-6">
        <div className="flex w-full items-center justify-between gap-2 px-3 py-3 sm:gap-4 xl:justify-normal xl:px-0 xl:py-4">
          <button
            type="button"
            className={`z-40 flex size-10 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/[0.03] lg:size-11 ${isMobileOpen ? 'bg-gray-100 dark:bg-white/[0.03]' : ''}`}
            onClick={handleToggle}
            aria-label="Toggle sidebar"
          >
            <MenuIcon />
          </button>

          <div className="min-w-0 xl:hidden">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">ABCO</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Recovery console</p>
          </div>

          <div className="hidden xl:block">
            <label className="sr-only" htmlFor="global-search">Search</label>
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                <SearchIcon />
              </span>
              <input
                ref={inputRef}
                id="global-search"
                type="search"
                placeholder="Search virtual machines, providers, commands..."
                className="h-11 w-[430px] rounded-lg border border-gray-200 bg-transparent py-2.5 pl-12 pr-14 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-white/[0.03] dark:text-white/90 dark:placeholder:text-white/30"
              />
              <kbd className="absolute right-2.5 top-1/2 inline-flex -translate-y-1/2 items-center gap-0.5 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400">
                Ctrl K
              </kbd>
            </div>
          </div>
        </div>

        <div className="hidden w-full items-center justify-end gap-3 px-5 py-4 xl:flex xl:px-0">
          <span className="rounded-full bg-success-50 px-3 py-1 text-xs font-medium text-success-700 dark:bg-success-500/15 dark:text-success-500">
            Discovery snapshot loaded
          </span>
          <div className="size-9 rounded-full bg-gray-200 dark:bg-gray-800" aria-label="Current user" />
        </div>
      </div>
    </header>
  )
}