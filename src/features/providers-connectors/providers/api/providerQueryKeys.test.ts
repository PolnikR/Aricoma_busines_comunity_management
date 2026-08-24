import { describe, expect, it } from 'vitest'
import { providerKeys } from './providerQueryKeys'

describe('providerKeys', () => {
  it('builds stable provider list keys', () => {
    expect(providerKeys.all).toEqual(['providers'])
    expect(providerKeys.list('all')).toEqual(['providers', 'list', 'all'])
    expect(providerKeys.list('source')).toEqual(['providers', 'list', 'source'])
    expect(providerKeys.list('target')).toEqual(['providers', 'list', 'target'])
    expect(providerKeys.list('source')).not.toEqual(providerKeys.list('target'))
  })
})
