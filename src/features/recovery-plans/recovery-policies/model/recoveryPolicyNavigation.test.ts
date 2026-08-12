import { describe, expect, it } from 'vitest'
import {
  RECOVERY_POLICY_TABS,
  getRecoveryPolicyTab,
  getRecoveryPolicyPath,
} from './recoveryPolicyNavigation'

describe('recovery policy navigation', () => {
  it('keeps policy tabs in the product order', () => {
    expect(RECOVERY_POLICY_TABS.map(tab => tab.value)).toEqual([
      'snapshot',
      'application-recovery',
      'clean-room',
    ])
  })

  it('falls back to snapshot for an unknown tab', () => {
    expect(getRecoveryPolicyTab('validation')).toBe('snapshot')
    expect(getRecoveryPolicyTab('unknown')).toBe('snapshot')
  })

  it('builds canonical child paths', () => {
    expect(getRecoveryPolicyPath('application-recovery')).toBe(
      '/recovery-plans/recovery-policies/application-recovery',
    )
    expect(getRecoveryPolicyPath('clean-room')).toBe(
      '/recovery-plans/recovery-policies/clean-room',
    )
  })
})
