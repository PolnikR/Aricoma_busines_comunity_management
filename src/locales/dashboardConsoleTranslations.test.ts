import { describe, expect, it } from 'vitest'
import en from './en.json'
import sk from './sk.json'
import cs from './cs.json'

const required = ['category', 'share', 'count', 'categoryCounts', 'section', 'previous', 'next', 'position', 'indicators', 'applications', 'topology', 'infrastructure', 'issues', 'item']
const catalogs: Record<string, Record<string, string>> = { en, sk, cs }

describe('Operations Console controls', () => {
  it('labels chart units and every section navigation action in all supported languages', () => {
    for (const [language, catalog] of Object.entries(catalogs)) {
      for (const suffix of required) expect(catalog[`dashboard.console.${suffix}`]?.trim(), `${language}: ${suffix}`).toBeTruthy()
      expect(catalog['dashboard.console.position']).toContain('{{current}}')
      expect(catalog['dashboard.console.position']).toContain('{{total}}')
    }
  })
})
