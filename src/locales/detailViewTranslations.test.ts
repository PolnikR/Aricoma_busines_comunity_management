import { describe, expect, it } from 'vitest'
import en from './en.json'
import cs from './cs.json'
import sk from './sk.json'

const catalogs: Record<string, Record<string, string>> = { en, cs, sk }

// Generic labels of the shared DetailView (`detailView.*`), read with useTranslation.
function detailViewKeys(catalog: Record<string, string>) {
  return Object.keys(catalog).filter(key => key.startsWith('detailView.')).sort()
}

describe('detail view translations', () => {
  it('has the same non-empty detailView keys in every locale', () => {
    const expected = detailViewKeys(en)
    expect(expected.length).toBeGreaterThan(0)
    for (const [language, catalog] of Object.entries(catalogs)) {
      expect(detailViewKeys(catalog), language).toEqual(expected)
      for (const key of expected) {
        expect(catalog[key]?.trim(), `${language} ${key}`).toBeTruthy()
      }
    }
  })

  it('keeps the {{label}} placeholder in the copy label', () => {
    for (const [language, catalog] of Object.entries(catalogs)) {
      expect(catalog['detailView.copyField'], language).toContain('{{label}}')
    }
  })
})
