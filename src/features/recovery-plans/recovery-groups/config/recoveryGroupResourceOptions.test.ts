import { describe, expect, it } from 'vitest'
import type {
  ProviderCredentialStatus,
  ProviderRecord,
  ProviderType,
} from '@/features/providers-connectors/providers/model/providerTypes'
import { getAvailableRecoveryGroupResourceOptions } from './recoveryGroupResourceOptions'

function provider(
  id: string,
  type: ProviderType,
  credentialStatus: ProviderCredentialStatus = 'ok',
): ProviderRecord {
  return {
    id,
    name: id,
    description: `${id} description`,
    type,
    ipAddress: '10.0.0.1',
    credentialId: credentialStatus === 'ok' ? `${id}-credential` : null,
    credentialStatus,
  }
}

describe('getAvailableRecoveryGroupResourceOptions', () => {
  it('returns one resource option for each healthy provider type', () => {
    const options = getAvailableRecoveryGroupResourceOptions([
      provider('vmware-1', 'VMWARE'),
      provider('vmware-2', 'VMWARE'),
      provider('power-1', 'IBM_POWER'),
      provider('flash-1', 'FLASHCOPY'),
    ])

    expect(options.map(option => option.workloadType)).toEqual([
      'vmware_virtual_machines',
      'ibm_power_virtual_machines',
      'ibm_flashsystem',
    ])
  })

  it('does not expose resource options backed only by unavailable credentials', () => {
    const options = getAvailableRecoveryGroupResourceOptions([
      provider('vmware-missing', 'VMWARE', 'missing'),
      provider('power-none', 'IBM_POWER', 'none'),
      provider('flash-1', 'FLASHCOPY'),
    ])

    expect(options.map(option => option.workloadType)).toEqual(['ibm_flashsystem'])
  })
})
