import { useState, useRef, useEffect } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { useLanguageContext } from '@/contexts/LanguageContext'
import { ChevronDownIcon, SettingsIcon, SignOutIcon } from '@/shared/icons/Icons'

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
        className="group flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-200"
        onClick={() => {
          setIsOpen(!isOpen)
        }}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <span className="flex size-8 items-center justify-center shrink-0 rounded-full bg-gradient-to-br from-[#0d91d7] to-[#17233d] text-xs font-semibold text-white">
          {userInitials}
        </span>
        <div className="hidden text-left lg:block">
          <p className="text-sm font-medium text-[#17233d] dark:text-gray-200">{userName}</p>
          <p className="text-xs text-[#8492a8] dark:text-gray-400">{userTitle}</p>
        </div>
        <ChevronDownIcon className={`hidden size-4 shrink-0 transition-transform lg:block ${isOpen ? 'rotate-180 text-[#0d91d7]' : 'text-[#8492a8] group-hover:text-[#0d91d7]'}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 origin-top-right rounded-lg border border-gray-200 bg-white shadow-lg animate-in fade-in zoom-in-95 dark:border-gray-700 dark:bg-gray-800 z-50">
          {/* Main Actions */}
          <div className="px-2 py-2">
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <span className="text-gray-400 dark:text-gray-500">
                <SettingsIcon />
              </span>
              {t('header.userMenu.settings')}
            </button>
          </div>

          {/* Language Selection */}
          <div className="border-t border-gray-200 px-4 py-3 dark:border-gray-700">
            <p className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">{t('header.language')}</p>
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  handleLanguageChange('en')
                }}
                className={`flex-1 min-w-24 rounded px-2 py-1.5 text-xs font-medium transition-colors ${
                  language === 'en'
                    ? 'bg-[#0d91d7] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
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
                    ? 'bg-[#0d91d7] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
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
                    ? 'bg-[#0d91d7] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {t('language.cs')}
              </button>
            </div>
          </div>

          {/* Sign Out */}
          <div className="border-t border-gray-200 px-2 py-2 dark:border-gray-700">
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
