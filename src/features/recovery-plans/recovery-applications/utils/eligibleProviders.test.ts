import { describe, expect, it } from 'vitest'
import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import { getEligibleSourceProviders, getEligibleTargetProviders } from './eligibleProviders'

function provider(
  id: string,
  type: ProviderRecord['type'],
  role: 'source' | 'target',
  credentialStatus: ProviderRecord['credentialStatus'] = 'ok',
): ProviderRecord {
  return { id, name: id, description: '', type, role, ipAddress: '10.0.0.1', credentialId: 'creds', credentialStatus }
}

const providers = [
  provider('vmware-source', 'VMWARE', 'source'),
  provider('vmware-target', 'VMWARE', 'target'),
  provider('vmware-target-missing-creds', 'VMWARE', 'target', 'missing'),
  provider('power-source', 'IBM_POWER', 'source'),
  provider('power-target', 'IBM_POWER', 'target'),
  provider('power-target-missing-creds', 'IBM_POWER', 'target', 'missing'),
  provider('flash-target', 'FLASHCOPY', 'target'),
]

describe('getEligibleSourceProviders', () => {
  it('offers VMware source providers and IBM Power providers of any role, with available credentials', () => {
    expect(getEligibleSourceProviders(providers).map(item => item.id)).toEqual(['vmware-source', 'power-source', 'power-target'])
  })
})

describe('getEligibleTargetProviders', () => {
  it('offers only VMware target providers for a VMware source', () => {
    expect(getEligibleTargetProviders(providers, 'VMWARE').map(item => item.id)).toEqual(['vmware-target'])
  })

  it('offers IBM Power providers of any role for an IBM Power source, so one HMC can serve both sides', () => {
    expect(getEligibleTargetProviders(providers, 'IBM_POWER').map(item => item.id)).toEqual(['power-source', 'power-target'])
  })

  it('offers nothing without a source type', () => {
    expect(getEligibleTargetProviders(providers, undefined)).toEqual([])
  })
})
