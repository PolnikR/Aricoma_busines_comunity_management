import { describe, expect, it } from 'vitest'
import en from './en.json'
import cs from './cs.json'
import sk from './sk.json'

const english: Record<string, string> = en
const catalogs: Record<string, Record<string, string>> = { en: english, cs, sk }

// Texts of the contextual relationship graphics shown in drawer help.
const PREFIXES = ['providers.relationships.', 'resources.relationships.']

function relationshipKeys(catalog: Record<string, string>) {
  return Object.keys(catalog).filter(key => PREFIXES.some(prefix => key.startsWith(prefix))).sort()
}

const placeholders = (text: string) => [...text.matchAll(/{{\s*(\w+)\s*}}/g)].map(match => match[1]).sort()

describe('relationship graphic translations', () => {
  it('has the same non-empty keys and placeholders in every locale', () => {
    const expected = relationshipKeys(english)
    expect(expected.length).toBeGreaterThan(0)
    for (const [language, catalog] of Object.entries(catalogs)) {
      expect(relationshipKeys(catalog), language).toEqual(expected)
      for (const key of expected) {
        expect(catalog[key]?.trim(), `${language} ${key}`).toBeTruthy()
        expect(placeholders(catalog[key] ?? ''), `${language} ${key}`).toEqual(placeholders(english[key] ?? ''))
      }
    }
  })
})
