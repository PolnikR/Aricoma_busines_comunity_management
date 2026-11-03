import { expect, it } from 'vitest'
import en from './en.json'
import sk from './sk.json'
import cs from './cs.json'

it('provides the usage table headers and preserves the detail link name placeholder in every language', () => {
  for (const messages of [en, sk, cs]) {
    const translations: Record<string, string> = messages
    for (const column of ['id', 'name', 'openDetail']) {
      expect(translations[`policyReferences.columns.${column}`]?.trim()).toBeTruthy()
    }
    expect(translations['policyReferences.openDetail']?.match(/\{\{\w+\}\}/g)).toEqual(['{{name}}'])
  }
})
