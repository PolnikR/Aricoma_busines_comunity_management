import { createContext, useContext } from 'react'

export type Language = 'en' | 'sk' | 'cs'

export interface LanguageContextValue {
  language: Language
  setLanguage: (language: Language) => void
  translations: Record<string, string>
}

export const LanguageContext = createContext<LanguageContextValue | undefined>(undefined)

export function useLanguageContext() {
  const context = useContext(LanguageContext)

  if (context === undefined) {
    throw new Error('useLanguageContext must be used within LanguageProvider')
  }

  return context
}
