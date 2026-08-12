import { describe, expect, it } from 'vitest'
import { snapshotPolicyKeys } from './snapshotPolicyQueryKeys'

describe('snapshotPolicyKeys', () => {
  it('provides a stable isolated list cache key', () => {
    expect(snapshotPolicyKeys.all).toEqual(['snapshot-policies'])
    expect(snapshotPolicyKeys.list()).toEqual(['snapshot-policies', 'list'])
  })
})
