import { describe, expect, it } from 'vitest'
import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import { getEligibleTargetProviders } from './eligibleProviders'

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
  provider('flash-target', 'FLASHCOPY', 'target'),
]

describe('getEligibleTargetProviders', () => {
  it('offers only target providers of the source type with available credentials', () => {
    expect(getEligibleTargetProviders(providers, 'VMWARE').map(item => item.id)).toEqual(['vmware-target'])
    expect(getEligibleTargetProviders(providers, 'IBM_POWER').map(item => item.id)).toEqual(['power-target'])
  })

  it('offers nothing without a source type', () => {
    expect(getEligibleTargetProviders(providers, undefined)).toEqual([])
  })
})
