import { useState, useRef, useEffect } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { useLanguageContext } from '@/contexts/LanguageContext'
import { ChevronDownIcon } from '@/shared/icons/Icons'

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
        className="group flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-gray-100"
        onClick={() => {
          setIsOpen(!isOpen)
        }}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <span className="flex size-8 items-center justify-center rounded-full bg-[#17233d] text-xs font-semibold text-white">
          {userInitials}
        </span>
        <div className="hidden text-left lg:block">
          <p className="text-sm font-medium text-[#17233d]">{userName}</p>
          <p className="text-xs text-[#8492a8]">{userTitle}</p>
        </div>
        <ChevronDownIcon className={`hidden size-4 transition-transform lg:block ${isOpen ? 'rotate-180 text-[#0d91d7]' : 'text-[#8492a8] group-hover:text-[#0d91d7]'}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 animate-in fade-in zoom-in-95 rounded-lg border border-[#dce7f4] bg-white shadow-lg">
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
