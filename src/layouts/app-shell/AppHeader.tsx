import { useEffect, useRef } from 'react'
import { MenuIcon, SearchIcon } from '@/shared/icons/Icons'
import { UserMenu } from '@/app/header/UserMenu'
import { useSidebar } from './useSidebar'

export function AppHeader() {
  const { isMobileOpen, toggleMobileSidebar } = useSidebar()
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
    toggleMobileSidebar()
  }

  return (
    <header className="z-30 flex h-16 w-full shrink-0 border-b border-[#e8eef7] bg-white/95 backdrop-blur lg:h-[72px]">
      <div className="flex grow items-center justify-between px-4 sm:px-6 lg:px-7">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <button
            type="button"
            className={`z-40 flex size-10 shrink-0 items-center justify-center rounded-xl border border-[#dce7f4] text-[#66758f] shadow-sm transition hover:border-[#bcdcff] hover:bg-[#f2f8ff] hover:text-[#087fd1] lg:hidden ${isMobileOpen ? 'bg-[#edf7ff]' : ''}`}
            onClick={handleToggle}
            aria-label="Toggle sidebar"
          >
            <MenuIcon />
          </button>

          <div className="min-w-0 sm:hidden">
            <p className="text-sm font-semibold text-[#17233d]">Aricoma</p>
            <p className="text-xs text-[#7a89a2]">Business continuity management</p>
          </div>

          <div className="hidden sm:block">
            <label className="sr-only" htmlFor="global-search">Search</label>
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8b9ab3]">
                <SearchIcon />
              </span>
              <input
                ref={inputRef}
                id="global-search"
                type="search"
                placeholder="Search or type a command..."
                className="h-10 w-[min(42vw,420px)] rounded-xl border border-[#dce7f4] bg-[#fbfdff] py-2 pl-10 pr-14 text-sm text-[#263650] shadow-sm outline-none placeholder:text-[#9aa8bc] focus:border-[#63bdf2] focus:ring-4 focus:ring-[#1596dd]/10"
              />
              <kbd className="absolute right-2 top-1/2 inline-flex -translate-y-1/2 items-center rounded-md border border-[#dce7f4] bg-white px-1.5 py-1 text-[11px] text-[#7a89a2]">
                Ctrl K
              </kbd>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className="ml-1 flex items-center gap-2.5">
            <UserMenu />
          </div>
        </div>
      </div>
    </header>
  )
}
