import { describe, expect, it } from 'vitest'
import { isRecoveryGroupCompatible, isRecoveryGroupEligible } from './recoveryGroupPlatform'

const vmwareGroup = { sourceCategory: 'backup_system_workload', workloadType: 'vmware_virtual_machines' } as const
const powerGroup = { sourceCategory: 'backup_system_workload', workloadType: 'ibm_power_virtual_machines' } as const
const unresolvedGroup = { sourceCategory: 'backup_system_workload', workloadType: null } as const
const storageGroup = { sourceCategory: 'storage_system', workloadType: 'ibm_flashsystem' } as const

describe('isRecoveryGroupCompatible', () => {
  it('matches VMware groups to a VMware platform', () => {
    expect([vmwareGroup, powerGroup, unresolvedGroup, storageGroup].map(group => isRecoveryGroupCompatible(group, 'VMWARE')))
      .toEqual([true, false, false, false])
  })

  it.each(['IBM_POWER', 'ibm_power'])('matches IBM Power groups to the %s platform', (platform) => {
    expect([vmwareGroup, powerGroup, unresolvedGroup, storageGroup].map(group => isRecoveryGroupCompatible(group, platform)))
      .toEqual([false, true, false, false])
  })

  it.each([undefined, '', 'HITACHI'])('matches no group without a supported platform (%s)', (platform) => {
    expect([vmwareGroup, powerGroup].some(group => isRecoveryGroupCompatible(group, platform))).toBe(false)
  })
})

describe.each([
  ['VMWARE', vmwareGroup, powerGroup],
  ['IBM_POWER', powerGroup, vmwareGroup],
] as const)('eligibility for %s', (platform, compatible, incompatible) => {
  it.each([
    [true, 'run-1', true], [false, 'run-1', false], [true, null, false],
    [true, '', false], [true, '   ', false], [true, undefined, false],
    [undefined, 'run-1', false],
  ] as const)('requires publication and an identifier (%s, %s)', (pushToOrchestrator, airflowRunId, expected) => {
    expect(isRecoveryGroupEligible({ ...compatible, pushToOrchestrator, airflowRunId }, platform)).toBe(expected)
  })
  it('rejects a published group of another platform', () => {
    expect(isRecoveryGroupEligible({ ...incompatible, pushToOrchestrator: true, airflowRunId: 'run-1' }, platform)).toBe(false)
  })
})
