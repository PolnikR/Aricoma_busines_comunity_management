import { describe, expect, it } from 'vitest'
import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import type { PlatformProviderRecord } from '@/features/platform-administration/platform-providers/model/platformProviderTypes'
import { getEligiblePlatformProviders, getEligibleSourceProviders, getEligibleTargetProviders } from './eligibleProviders'

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

describe('getEligiblePlatformProviders', () => {
  it('allows only AIRFLOW providers with valid credentials', () => {
    const platforms = [
      { id: 'airflow-01', type: 'AIRFLOW', credentialStatus: 'ok' },
      { id: 'airflow-unavailable', type: 'AIRFLOW', credentialStatus: 'missing' },
      { id: 'keycloak-01', type: 'KEYCLOAK', credentialStatus: 'ok' },
      { id: 'smtp-01', type: 'SMTP', credentialStatus: 'ok' },
      { id: 'backend-01', type: 'BACKEND', credentialStatus: 'ok' },
    ] as PlatformProviderRecord[]

    expect(getEligiblePlatformProviders(platforms).map(item => item.id)).toEqual(['airflow-01'])
  })
})

describe('getEligibleSourceProviders', () => {
  it('offers only source-role VMware and IBM Power providers with available credentials', () => {
    expect(getEligibleSourceProviders(providers).map(item => item.id)).toEqual(['vmware-source', 'power-source'])
  })
})

describe('getEligibleTargetProviders', () => {
  it('offers only VMware target providers for a VMware source', () => {
    expect(getEligibleTargetProviders(providers, 'VMWARE').map(item => item.id)).toEqual(['vmware-target'])
  })

  it('offers only target-role IBM Power providers, excluding source and missing credentials', () => {
    expect(getEligibleTargetProviders(providers, 'IBM_POWER').map(item => item.id)).toEqual(['power-target'])
  })

  it('offers nothing without a source type', () => {
    expect(getEligibleTargetProviders(providers, undefined)).toEqual([])
  })
})
