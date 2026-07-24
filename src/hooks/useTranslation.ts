import { useLanguageContext } from '@/contexts/LanguageContext'

export function useTranslation() {
  const { language, translations } = useLanguageContext()

  const t = (key: string): string => {
    return translations[key] ?? key
  }

  return { t, language }
}
