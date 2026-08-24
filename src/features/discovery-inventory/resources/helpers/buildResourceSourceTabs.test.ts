import { describe, expect, it } from 'vitest'
import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import { buildResourceSourceTabs, buildResourceTargetTabs } from './buildResourceSourceTabs'

const labels = {
  vmware: 'VMware VMs',
  flashsystem: 'FlashSystem Volumes',
  'ibm-power': 'IBM Power Partitions',
} as const

function provider(id: string, name: string, type: ProviderRecord['type'], role: ProviderRecord['role'] = 'source'): ProviderRecord {
  return {
    id,
    name,
    description: '',
    type,
    ipAddress: '10.0.0.1',
    port: 22,
    credentialId: null,
    role,
    credentialStatus: 'none',
  }
}

describe('buildResourceSourceTabs', () => {
  it('keeps one fallback tab for each resource type without providers', () => {
    expect(buildResourceSourceTabs([], labels)).toEqual([
      { value: 'vmware:none', resourceTab: 'vmware', providerId: null, label: labels.vmware },
      { value: 'flashsystem:none', resourceTab: 'flashsystem', providerId: null, label: labels.flashsystem },
      { value: 'ibm-power:none', resourceTab: 'ibm-power', providerId: null, label: labels['ibm-power'] },
    ])
  })

  it('creates one short tab for a single provider of each type', () => {
    expect(buildResourceSourceTabs([
      provider('power-01', 'Power HMC', 'IBM_POWER'),
      provider('vm-01', 'Production vCenter', 'VMWARE'),
      provider('flash-01', 'FlashSystem', 'FLASHCOPY'),
    ], labels)).toEqual([
      { value: 'vmware:vm-01', resourceTab: 'vmware', providerId: 'vm-01', label: labels.vmware },
      { value: 'flashsystem:flash-01', resourceTab: 'flashsystem', providerId: 'flash-01', label: labels.flashsystem },
      { value: 'ibm-power:power-01', resourceTab: 'ibm-power', providerId: 'power-01', label: labels['ibm-power'] },
    ])
  })

  it('keeps ten same-type providers distinct and deterministically sorted', () => {
    const providers = Array.from({ length: 10 }, (_, index) => provider(
      `vm-${String(index + 1).padStart(2, '0')}`,
      `vCenter ${String(index + 1).padStart(2, '0')}`,
      'VMWARE',
    ))

    const vmwareTabs = buildResourceSourceTabs(providers, labels)
      .filter(tab => tab.resourceTab === 'vmware')

    expect(vmwareTabs).toHaveLength(10)
    expect(vmwareTabs[0]).toMatchObject({ value: 'vmware:vm-01', label: 'VMware VMs · vCenter 01' })
    expect(vmwareTabs[9]).toMatchObject({ value: 'vmware:vm-10', label: 'VMware VMs · vCenter 10' })
  })

  it('does not expose target providers as discovery sources', () => {
    const tabs = buildResourceSourceTabs([
      provider('target-01', 'Target vCenter', 'VMWARE', 'target'),
    ], labels)

    expect(tabs.find(tab => tab.resourceTab === 'vmware')).toMatchObject({
      value: 'vmware:none',
      providerId: null,
    })
  })
})

describe('buildResourceTargetTabs', () => {
  it('returns target-only providers as target tabs', () => {
    expect(buildResourceTargetTabs([
      provider('target-01', 'Target vCenter', 'VMWARE', 'target'),
      provider('flash-target-01', 'Target Flash', 'FLASHCOPY', 'target'),
      provider('power-target-01', 'Target Power', 'IBM_POWER', 'target'),
    ], labels)).toEqual([
      { value: 'vmware:target-01', resourceTab: 'vmware', providerId: 'target-01', label: labels.vmware },
      { value: 'flashsystem:flash-target-01', resourceTab: 'flashsystem', providerId: 'flash-target-01', label: labels.flashsystem },
      { value: 'ibm-power:power-target-01', resourceTab: 'ibm-power', providerId: 'power-target-01', label: labels['ibm-power'] },
    ])
  })

  it('excludes source providers from target tabs', () => {
    const tabs = buildResourceTargetTabs([
      provider('source-01', 'Source vCenter', 'VMWARE', 'source'),
    ], labels)

    expect(tabs.find(tab => tab.resourceTab === 'vmware')).toMatchObject({
      value: 'vmware:none',
      providerId: null,
    })
  })

  it('excludes missing-role providers from target tabs', () => {
    const tabs = buildResourceTargetTabs([
      provider('legacy-01', 'Legacy vCenter', 'VMWARE'),
    ], labels)

    expect(tabs.find(tab => tab.resourceTab === 'vmware')).toMatchObject({
      value: 'vmware:none',
      providerId: null,
    })
  })
})
