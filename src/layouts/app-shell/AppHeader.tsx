import { Button } from '@/shared/components/button/Button'
import { MenuIcon } from '@/shared/icons/Icons'
import { UserMenu } from '@/app/header/UserMenu'
import { useSidebar } from './useSidebar'
import { useTranslation } from '@/hooks/useTranslation'

export function AppHeader() {
  const { t } = useTranslation()
  const { isMobileOpen, toggleMobileSidebar } = useSidebar()

  const handleToggle = () => {
    toggleMobileSidebar()
  }

  return (
    <header className="z-30 flex h-14 w-full shrink-0 border-b border-border bg-surface/95 backdrop-blur">
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
