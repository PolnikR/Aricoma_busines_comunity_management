import { describe, expect, it } from 'vitest'
import { recoveryAppPolicyKeys } from './recoveryAppPolicyQueryKeys'

describe('recoveryAppPolicyKeys', () => {
  it('provides a stable isolated list cache key', () => {
    expect(recoveryAppPolicyKeys.all).toEqual(['recovery-app-policies'])
    expect(recoveryAppPolicyKeys.list()).toEqual(['recovery-app-policies', 'list'])
  })
})
