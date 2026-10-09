import { describe, expect, it } from 'vitest'
import { isRecoveryGroupCompatible } from './recoveryGroupPlatform'

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
