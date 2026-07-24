import type { ReactNode } from 'react'
import { createContext, useContext, useState, useEffect } from 'react'

export type Language = 'en' | 'sk' | 'cs'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  translations: Record<string, string>
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

const SUPPORTED_LANGUAGES: Language[] = ['en', 'sk', 'cs']
const STORAGE_KEY = 'app-language'

function getBrowserLanguage(): Language {
  const browserLanguage = navigator.language.split('-')[0]

  if (SUPPORTED_LANGUAGES.includes(browserLanguage as Language)) {
    return browserLanguage as Language
  }

  return 'en'
}

async function loadTranslations(language: Language): Promise<Record<string, string>> {
  const module = (await import(`../locales/${language}.json`)) as { default: Record<string, string> }

  return module.default
}

function getInitialLanguage(): Language {
  const stored = localStorage.getItem(STORAGE_KEY)

  if (stored && SUPPORTED_LANGUAGES.includes(stored as Language)) {
    return stored as Language
  }

  return getBrowserLanguage()
}

interface LanguageProviderProps {
  children: ReactNode
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage)
  const [translations, setTranslations] = useState<Record<string, string>>({})

  useEffect(() => {
    void loadTranslations(language).then(setTranslations)
  }, [language])

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem(STORAGE_KEY, lang)
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, translations }}>
      {children}
    </LanguageContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLanguageContext() {
  const context = useContext(LanguageContext)

  if (context === undefined) {
    throw new Error('useLanguageContext must be used within LanguageProvider')
  }

  return context
}
