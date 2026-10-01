import { describe, expect, it } from 'vitest'
import en from './en.json'
import cs from './cs.json'
import sk from './sk.json'

const prefix = 'pages.recoveryGroupBuilder.topology.'
const requiredKeys = [
  'pages.recoveryGroupBuilder.steps.topology',
  ...[
    'title', 'description', 'loadError', 'loading', 'mode', 'choose',
    'local', 'metroMirror', 'source', 'target', 'targetPlaceholder',
    'metroMode', 'existing', 'managed', 'managedHint', 'consistencyGroup',
    'auxiliary', 'discoveryError',
    'lookup.loading', 'lookup.hint', 'lookup.error', 'lookup.incomplete',
    'lookup.unresolved', 'lookup.missingGroup', 'lookup.mismatch',
    'errors.required', 'errors.sourceRequired',
    'errors.sourceInvalid', 'errors.partnerMissing', 'errors.partnerSame',
    'errors.partnerInvalid', 'errors.modeRequired',
  ].map(suffix => `${prefix}${suffix}`),
]
const englishCatalog: Record<string, string> = en
const catalogs: Record<string, Record<string, string>> = { en: englishCatalog, cs, sk }

function topologyKeys(catalog: Record<string, string>) {
  return Object.keys(catalog).filter(key => key.startsWith(prefix)).sort()
}

function placeholders(value: string) {
  return [...value.matchAll(/\{[^{}]+\}/g)].map(match => match[0]).sort()
}

describe('recovery group topology translations', () => {
  it('provides every required key with nonempty text in each locale', () => {
    for (const [locale, catalog] of Object.entries(catalogs)) {
      for (const key of requiredKeys) {
        expect(catalog[key]?.trim(), `${locale}: ${key}`).toBeTruthy()
      }
    }
  })

  it('keeps topology keys and interpolation placeholders consistent', () => {
    const expectedKeys = topologyKeys(englishCatalog)
    for (const catalog of Object.values(catalogs)) {
      expect(topologyKeys(catalog)).toEqual(expectedKeys)
      for (const key of expectedKeys) {
        expect(placeholders(catalog[key] ?? ''), key).toEqual(placeholders(englishCatalog[key] ?? ''))
      }
    }
  })
})
