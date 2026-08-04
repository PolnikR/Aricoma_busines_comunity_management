import { useCallback } from 'react'
import { useLanguageContext } from '@/contexts/LanguageContext'

export function useTranslation() {
  const { language, translations } = useLanguageContext()

  const t = useCallback((key: string): string => {
    return translations[key] ?? key
  }, [translations])

  return { t, language }
}
