import { describe, expect, it } from 'vitest'
import { calculateRecoveryGroupStepIndices } from './calculateRecoveryGroupStepIndices'

describe('calculateRecoveryGroupStepIndices', () => {
  it('places Topology before resources in both the 8-step VM and 7-step volume flow', () => {
    expect(calculateRecoveryGroupStepIndices(true)).toEqual({ resourcesStepIndex: 5, relatedStorageStepIndex: 6, policySetStepIndex: 7, orchestrationStepIndex: 8, lastStep: 8 })
    expect(calculateRecoveryGroupStepIndices(false)).toEqual({ resourcesStepIndex: 5, relatedStorageStepIndex: 6, policySetStepIndex: 6, orchestrationStepIndex: 7, lastStep: 7 })
  })
})
