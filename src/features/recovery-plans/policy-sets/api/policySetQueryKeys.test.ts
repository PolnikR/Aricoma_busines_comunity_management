import { describe, expect, it } from 'vitest'
import { policySetKeys } from './policySetQueryKeys'

describe('policySetKeys', () => {
  it('provides a stable isolated list cache key', () => {
    expect(policySetKeys.all).toEqual(['policy-sets'])
    expect(policySetKeys.list()).toEqual(['policy-sets', 'list'])
  })
})
