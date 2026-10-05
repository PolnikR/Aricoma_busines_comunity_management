import { describe, expect, it } from 'vitest'
import { getRecoveryGroupSearchMode } from './recoveryGroupSearchMode'

describe('getRecoveryGroupSearchMode', () => {
  it.each([
    ['no scope', null],
    ['blank values', { vmPrefix: '  ', vmTags: [' ', ''] }],
  ] as const)('searches VMware on the server for %s', (_, providerScope) => {
    expect(getRecoveryGroupSearchMode('vmware_virtual_machines', providerScope)).toBe('server')
  })

  it.each([
    ['a prefix', { vmPrefix: 'TEST-' }],
    ['a tag only', { vmPrefix: null, vmTags: ['WEB'] }],
    ['a prefix and a tag', { vmPrefix: 'TEST-', vmTags: ['WEB'] }],
  ] as const)('searches VMware locally inside a fixed scope with %s', (_, providerScope) => {
    expect(getRecoveryGroupSearchMode('vmware_virtual_machines', providerScope)).toBe('client')
  })

  it('searches locally while the VMware provider scope is unknown', () => {
    expect(getRecoveryGroupSearchMode('vmware_virtual_machines', undefined)).toBe('client')
  })

  it.each([
    ['ibm_power_virtual_machines', { vmPrefix: 'TEST-' }],
    ['ibm_power_virtual_machines', { vmTags: ['WEB'] }],
    ['ibm_power_virtual_machines', null],
    ['ibm_flashsystem', null],
  ] as const)('always searches %s locally', (workloadType, providerScope) => {
    expect(getRecoveryGroupSearchMode(workloadType, providerScope)).toBe('client')
  })
})
