import { useState, useRef, useEffect } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { useLanguageContext } from '@/contexts/LanguageContext'
import { ChevronDownIcon, SettingsIcon, SignOutIcon } from '@/shared/icons/Icons'
import { ThemeSelector } from './ThemeSelector'

interface UserMenuProps {
  userName?: string
  userTitle?: string
  userInitials?: string
}

export function UserMenu({
  userName = 'ABCO operator',
  userTitle = 'Administrator',
  userInitials = 'AB',
}: UserMenuProps) {
  const { t, language } = useTranslation()
  const { setLanguage } = useLanguageContext()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleLanguageChange = (lang: 'en' | 'sk' | 'cs') => {
    setLanguage(lang)
    setIsOpen(false)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        className="group flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-surface-hover"
        onClick={() => {
          setIsOpen(!isOpen)
        }}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent to-text-primary text-xs font-semibold text-white">
          {userInitials}
        </span>
        <div className="hidden text-left lg:block">
          <p className="text-sm font-medium text-text-primary">{userName}</p>
          <p className="text-xs text-text-muted">{userTitle}</p>
        </div>
        <ChevronDownIcon className={`hidden size-4 shrink-0 transition-transform lg:block ${isOpen ? 'rotate-180 text-accent' : 'text-text-muted group-hover:text-accent'}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-64 origin-top-right animate-in rounded-lg border border-border bg-surface shadow-lg fade-in zoom-in-95">
          {/* Main Actions */}
          <div className="px-2 py-2">
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-hover"
            >
              <span className="text-text-muted">
                <SettingsIcon />
              </span>
              {t('header.userMenu.settings')}
            </button>
          </div>

          {/* Language Selection */}
          <div className="border-t border-border px-4 py-3">
            <p className="mb-2 text-xs font-medium text-text-muted">{t('header.language')}</p>
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  handleLanguageChange('en')
                }}
                className={`flex-1 min-w-24 rounded px-2 py-1.5 text-xs font-medium transition-colors ${
                  language === 'en'
                    ? 'bg-accent text-white'
                    : 'bg-surface-muted text-text-secondary hover:bg-surface-hover'
                }`}
              >
                {t('language.en')}
              </button>
              <button
                type="button"
                onClick={() => {
                  handleLanguageChange('sk')
                }}
                className={`flex-1 min-w-24 rounded px-2 py-1.5 text-xs font-medium transition-colors ${
                  language === 'sk'
                    ? 'bg-accent text-white'
                    : 'bg-surface-muted text-text-secondary hover:bg-surface-hover'
                }`}
              >
                {t('language.sk')}
              </button>
              <button
                type="button"
                onClick={() => {
                  handleLanguageChange('cs')
                }}
                className={`flex-1 min-w-24 rounded px-2 py-1.5 text-xs font-medium transition-colors ${
                  language === 'cs'
                    ? 'bg-accent text-white'
                    : 'bg-surface-muted text-text-secondary hover:bg-surface-hover'
                }`}
              >
                {t('language.cs')}
              </button>
            </div>
          </div>

          <div className="border-t border-border px-4 py-3">
            <ThemeSelector />
          </div>

          {/* Sign Out */}
          <div className="border-t border-border px-2 py-2">
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-500 dark:hover:bg-red-500/10"
            >
              <span className="text-red-600 dark:text-red-500">
                <SignOutIcon />
              </span>
              {t('header.userMenu.logout')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
