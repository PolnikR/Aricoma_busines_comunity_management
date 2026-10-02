import { describe, expect, it } from 'vitest'
import en from './en.json'
import cs from './cs.json'
import sk from './sk.json'

const englishCatalog: Record<string, string> = en
const catalogs: Record<string, Record<string, string>> = { en: englishCatalog, cs, sk }

// Keys of the detail drawer "?" help, read by KeyedHelpPopover: `<prefix>.help.*`.
function helpKeys(catalog: Record<string, string>) {
  return Object.keys(catalog).filter(key => key.includes('.help.')).sort()
}

function helpPrefixes() {
  return helpKeys(englishCatalog)
    .filter(key => key.endsWith('.help.trigger'))
    .map(key => key.slice(0, -'.trigger'.length))
}

describe('detail drawer help translations', () => {
  it('has the same non-empty help keys and the shared close label in every locale', () => {
    const expected = helpKeys(englishCatalog)
    expect(expected.length).toBeGreaterThan(0)
    for (const [language, catalog] of Object.entries(catalogs)) {
      expect(helpKeys(catalog), language).toEqual(expected)
      for (const key of [...expected, 'help.close']) {
        expect(catalog[key]?.trim(), `${language} ${key}`).toBeTruthy()
      }
    }
  })

  it('gives every help a title and intro, and every section both a title and a text', () => {
    for (const prefix of helpPrefixes()) {
      expect(englishCatalog[`${prefix}.title`], prefix).toBeTruthy()
      expect(englishCatalog[`${prefix}.intro`], prefix).toBeTruthy()
      const sectionTitles = helpKeys(englishCatalog).filter(key => key.startsWith(`${prefix}.`) && key.endsWith('.title') && key !== `${prefix}.title`)
      for (const titleKey of sectionTitles) {
        expect(englishCatalog[`${titleKey.slice(0, -'.title'.length)}.text`], titleKey).toBeTruthy()
      }
    }
  })
})
