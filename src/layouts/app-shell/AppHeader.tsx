import { useEffect, useRef } from 'react'
import { Button } from '@/shared/components/button/Button'
import { MenuIcon, SearchIcon } from '@/shared/icons/Icons'
import { UserMenu } from '@/app/header/UserMenu'
import { useSidebar } from './useSidebar'
import { useTranslation } from '@/hooks/useTranslation'

export function AppHeader() {
  const { t } = useTranslation()
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
    <header className="z-30 flex h-16 w-full shrink-0 border-b border-border bg-surface/95 backdrop-blur lg:h-[72px]">
      <div className="flex grow items-center justify-between px-4 sm:px-6 lg:px-7">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <Button
            size="icon"
            variant="outline"
            className={`z-40 shrink-0 lg:hidden ${isMobileOpen ? 'bg-accent-soft' : ''}`}
            onClick={handleToggle}
            aria-label="Toggle sidebar"
          >
            <MenuIcon />
          </Button>

          <div className="min-w-0 sm:hidden">
            <p className="text-sm font-semibold text-text-primary">{t('header.appName')}</p>
            <p className="text-xs text-text-muted">{t('header.tagline')}</p>
          </div>

          <div className="hidden sm:block">
            <label className="sr-only" htmlFor="global-search">Search</label>
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-subtle">
                <SearchIcon />
              </span>
              <input
                ref={inputRef}
                id="global-search"
                type="search"
                placeholder={t('header.search')}
                className="h-10 w-[min(42vw,420px)] rounded-xl border border-border bg-surface-subtle py-2 pl-10 pr-14 text-sm text-text-secondary shadow-sm outline-none placeholder:text-text-subtle focus:border-accent focus:ring-4 focus:ring-focus/10"
              />
              <kbd className="absolute right-2 top-1/2 inline-flex -translate-y-1/2 items-center rounded-md border border-border bg-surface px-1.5 py-1 text-[11px] text-text-muted">
                {t('header.searchHint')}
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
