import { describe, expect, it } from 'vitest'
import en from './en.json'
import sk from './sk.json'
import cs from './cs.json'
const fields: Record<string, string[]> = {
  recoveryGroupSourceMismatch: ['actual', 'expected', 'group', 'tier'], recoveryGroupSourceMissing: ['group', 'tier'],
  workloadMissing: ['group', 'name', 'tier'], duplicateWorkloadAcrossTiers: ['name', 'tiers'],
  duplicateWorkloadWithinTier: ['name', 'tier'], tiersRequired: [], referencesUnverified: [],
}
describe('application functional messages', () => {
  it.each([en, sk, cs])('provides actionable messages with matching context', catalog => {
    const messages: Record<string, string> = catalog
    for (const [suffix, params] of Object.entries(fields)) {
      const value = messages['recovery.application.validation.' + suffix]
      expect(value?.trim(), suffix).toBeTruthy()
      expect([...(value ?? '').matchAll(/\{\{(\w+)\}\}/g)].map(match => match[1]).sort()).toEqual(params)
      if (suffix.startsWith('duplicate')) expect(value).toContain('IBM Power v2')
    }
  })
})
