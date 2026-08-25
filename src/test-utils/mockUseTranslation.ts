import translations from '@/locales/en.json'

const englishTranslations = translations as Record<string, string>

export function useTranslation() {
  const t = (key: string, params?: Record<string, string | number>): string => {
    let text = englishTranslations[key] ?? key
    if (params) {
      for (const [paramKey, paramValue] of Object.entries(params)) {
        text = text.replace(`{{${paramKey}}}`, String(paramValue))
      }
    }
    return text
  }

  return { t, language: 'en' as const }
}
