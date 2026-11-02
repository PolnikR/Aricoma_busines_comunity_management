import { describe, expect, it } from 'vitest'
import en from './en.json'
import sk from './sk.json'
import cs from './cs.json'

describe('Recovery Application lifecycle translations', () => {
  it('provides the same nonempty lifecycle keys and interpolations in EN/SK/CS', () => {
    const english: Record<string, string> = en
    const keys = Object.keys(en).filter(key => key.startsWith('recovery.application.lifecycle.')).sort()
    expect(keys.length).toBeGreaterThan(20)
    for (const catalog of [en, sk, cs] as Record<string, string>[]) {
      expect(Object.keys(catalog).filter(key => key.startsWith('recovery.application.lifecycle.')).sort()).toEqual(keys)
      for (const key of keys) {
        expect(catalog[key]?.trim(), key).toBeTruthy()
        expect((catalog[key] ?? '').match(/\{\{\w+\}\}/g) ?? [], key).toEqual((english[key] ?? '').match(/\{\{\w+\}\}/g) ?? [])
      }
    }
  })
})
