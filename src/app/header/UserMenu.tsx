import { useState, useRef, useEffect } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { useLanguageContext } from '@/contexts/LanguageContext'

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
  }, [])

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        className="flex items-center gap-3"
        onClick={() => {
          setIsOpen(!isOpen)
        }}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <span className="flex size-8 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
          {userInitials}
        </span>
        <div className="hidden text-left lg:block">
          <p className="text-sm font-medium text-gray-900">{userName}</p>
          <p className="text-xs text-gray-500">{userTitle}</p>
        </div>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-lg border bg-white shadow-lg">
          <div className="border-b px-4 py-3">
            <p className="mb-2 text-xs font-medium text-gray-500">{t('header.language')}</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setLanguage('en')
                  setIsOpen(false)
                }}
                className={`rounded px-2 py-1 text-xs ${language === 'en' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'}`}
              >
                {t('language.en')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setLanguage('sk')
                  setIsOpen(false)
                }}
                className={`rounded px-2 py-1 text-xs ${language === 'sk' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'}`}
              >
                {t('language.sk')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setLanguage('cs')
                  setIsOpen(false)
                }}
                className={`rounded px-2 py-1 text-xs ${language === 'cs' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'}`}
              >
                {t('language.cs')}
              </button>
            </div>
          </div>

          <button
            type="button"
            className="w-full border-b px-4 py-2 text-left text-sm text-gray-700"
          >
            {t('header.userMenu.settings')}
          </button>

          <button
            type="button"
            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
          >
            {t('header.userMenu.logout')}
          </button>
        </div>
      )}
    </div>
  )
}
