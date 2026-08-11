import { describe, expect, it } from 'vitest'
import { getRecoveryActionPath, getRecoveryActionTab } from './recoveryActionNavigation'

describe('recovery action navigation', () => {
  it('maps nested action paths to their workspace tab', () => {
    expect(getRecoveryActionTab('/recovery-actions/execute')).toBe('execute')
    expect(getRecoveryActionTab('/recovery-actions/history/run-17')).toBe('history')
    expect(getRecoveryActionTab('/recovery-actions')).toBe('validate')
  })

  it('returns a stable route for every action tab', () => {
    expect(getRecoveryActionPath('schedule')).toBe('/recovery-actions/schedule')
  })
})
