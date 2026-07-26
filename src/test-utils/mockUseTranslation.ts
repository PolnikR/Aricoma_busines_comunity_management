import translations from '@/locales/en.json'

const englishTranslations = translations as Record<string, string>

export function useTranslation() {
  const t = (key: string): string => englishTranslations[key] ?? key

  return { t, language: 'en' as const }
}
