import { describe, expect, it } from 'vitest'
import { discoveryCacheKeys } from './discoveryCacheQueryKeys'

describe('discoveryCacheKeys', () => {
  it('builds isolated stable keys', () => {
    expect(discoveryCacheKeys.all).toEqual(['discovery-cache'])
    expect(discoveryCacheKeys.config()).toEqual(['discovery-cache', 'config'])
    expect(discoveryCacheKeys.history()).toEqual(['discovery-cache', 'history', null, null])
    expect(discoveryCacheKeys.history({ providerId: 'vmware', limit: 10 })).toEqual(['discovery-cache', 'history', 'vmware', 10])
  })
})
