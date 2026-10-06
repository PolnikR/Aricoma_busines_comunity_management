type Translate = (key: string, params?: Record<string, string | number>) => string

// Picks `<baseKey>.one|few|many|other` by the language's plural rules, falling back to
// `.other`, so "1 snapshot", "2 snapshots" and Czech/Slovak forms all read correctly.
export function countLabel(t: Translate, language: string, baseKey: string, count: number): string {
  const category = new Intl.PluralRules(language).select(count)
  const key = `${baseKey}.${category}`
  const text = t(key, { count })
  return text === key ? t(`${baseKey}.other`, { count }) : text
}
