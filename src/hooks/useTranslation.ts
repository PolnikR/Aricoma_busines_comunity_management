import { useCallback } from 'react'
import { useLanguageContext } from '@/contexts/LanguageContext'

export function useTranslation() {
  const { language, translations } = useLanguageContext()

  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    let text = translations[key] ?? key
    if (params) {
      for (const [paramKey, paramValue] of Object.entries(params)) {
        text = text.replace(`{{${paramKey}}}`, String(paramValue))
      }
    }
    return text
  }, [translations])

  return { t, language }
}
