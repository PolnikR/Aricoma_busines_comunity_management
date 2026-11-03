import { expect, it } from 'vitest'
import en from './en.json'
import sk from './sk.json'
import cs from './cs.json'

it('provides reference protection and usage states consistently in all languages', () => {
  const keys = [
    'checking', 'blocked.title', 'blocked.description', 'checkFailed.title', 'checkFailed.description',
    'sources.policySets', 'sources.groups', 'sources.applications', 'usedIn.title', 'usedIn.loading',
    'usedIn.refreshing', 'usedIn.paused', 'usedIn.error', 'usedIn.cachedError', 'usedIn.empty',
    'usedIn.sourceEmpty', 'usedIn.retry', 'openDetail', 'detailMissing', 'closeDetail',
  ]
  for (const language of [en, sk, cs]) {
    const messages: Record<string, string> = language
    const english: Record<string, string> = en
    for (const key of keys) {
      const fullKey = `policyReferences.${key}`
      expect(messages[fullKey]?.trim(), fullKey).toBeTruthy()
      expect(messages[fullKey]?.match(/\{\{\w+\}\}/g) ?? []).toEqual(english[fullKey]?.match(/\{\{\w+\}\}/g) ?? [])
    }
    expect(messages['policyReferences.checkFailed.description']).not.toBe(messages['policyReferences.usedIn.empty'])
  }
})
