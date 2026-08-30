import { describe, expect, it } from 'vitest'
import type { DiscoveryCacheConfig } from '../model/discoveryCacheTypes'
import {
  createDiscoveryCacheConfigDraft,
  getOrderedDiscoveryCacheDefaultKeys,
  toDiscoveryCacheConfigPatch,
  validateDiscoveryCacheConfigDraft,
} from './discoveryCacheConfigDraft'

const config: DiscoveryCacheConfig = {
  defaults: { CUSTOM: 900, IBM_POWER: 300, VMWARE: 60, FLASHCOPY: 120 },
  historyRetention: { retentionDays: 30, maxRecords: 100 },
}

describe('discoveryCacheConfigDraft', () => {
  it('creates string inputs while preserving unknown default keys', () => {
    expect(createDiscoveryCacheConfigDraft(config)).toEqual({
      defaults: { CUSTOM: '900', IBM_POWER: '300', VMWARE: '60', FLASHCOPY: '120' },
      historyRetention: { retentionDays: '30', maxRecords: '100' },
    })
  })

  it('orders known defaults before intact unknown keys', () => {
    expect(getOrderedDiscoveryCacheDefaultKeys(config.defaults)).toEqual(['VMWARE', 'FLASHCOPY', 'IBM_POWER', 'CUSTOM'])
  })

  it.each(['', '0', '-1', '1.5', ' 1', '01'])('rejects invalid positive whole number %j', value => {
    const draft = createDiscoveryCacheConfigDraft(config)
    draft.defaults['VMWARE'] = value
    draft.historyRetention.retentionDays = value
    draft.historyRetention.maxRecords = value

    expect(validateDiscoveryCacheConfigDraft(draft).isValid).toBe(false)
  })

  it('returns no patch for an unchanged valid draft', () => {
    const draft = createDiscoveryCacheConfigDraft(config)
    expect(toDiscoveryCacheConfigPatch(draft, config)).toBeNull()
  })

  it('includes only one changed default in a patch', () => {
    const draft = createDiscoveryCacheConfigDraft(config)
    draft.defaults['VMWARE'] = '75'

    expect(toDiscoveryCacheConfigPatch(draft, config)).toEqual({ defaults: { VMWARE: 75 } })
  })

  it('includes only changed retention values in a patch', () => {
    const draft = createDiscoveryCacheConfigDraft(config)
    draft.historyRetention.maxRecords = '200'

    expect(toDiscoveryCacheConfigPatch(draft, config)).toEqual({ historyRetention: { maxRecords: 200 } })
  })

  it('builds a mixed partial patch without unchanged values', () => {
    const draft = createDiscoveryCacheConfigDraft(config)
    draft.defaults['CUSTOM'] = '1800'
    draft.historyRetention.retentionDays = '60'

    expect(toDiscoveryCacheConfigPatch(draft, config)).toEqual({
      defaults: { CUSTOM: 1800 },
      historyRetention: { retentionDays: 60 },
    })
  })
})
