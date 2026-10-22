import { expect, it } from 'vitest'
import en from './en.json'
import sk from './sk.json'
import cs from './cs.json'

it('provides policy catalog states and consistent placeholders in every language', () => {
  const keys = ['waiting', 'paused', 'refreshing', 'error', 'cachedError', 'missing', 'unknown', 'retry']
  for (const messages of [en, sk, cs]) {
    for (const key of keys) {
      const fullKey = `policyCatalog.${key}`
      const text = (messages as Record<string, string>)[fullKey]
      expect(text?.trim(), fullKey).toBeTruthy()
      const english = (en as Record<string, string>)[fullKey] ?? ''
      expect(text?.match(/\{\{\w+\}\}/g) ?? []).toEqual(english.match(/\{\{\w+\}\}/g) ?? [])
    }
  }
})
