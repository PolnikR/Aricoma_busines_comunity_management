import { describe, expect, it } from 'vitest'
import type {
  ProviderCredentialStatus,
  ProviderRecord,
  ProviderType,
} from '@/features/providers-connectors/providers/model/providerTypes'
import { getAvailableRecoveryGroupResourceOptions, getSelectableRecoveryGroupProviders } from './recoveryGroupResourceOptions'

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
    role: 'source',
    ipAddress: '10.0.0.1',
    credentialId: credentialStatus === 'ok' ? `${id}-credential` : null,
    credentialStatus,
  }
}

describe('getSelectableRecoveryGroupProviders', () => {
  const providers = [
    provider('power-source', 'IBM_POWER'),
    { ...provider('power-target-1', 'IBM_POWER'), role: 'target' as const },
    { ...provider('power-target-2', 'IBM_POWER'), role: 'target' as const },
  ]

  it('offers only source providers when creating a group', () => {
    expect(getSelectableRecoveryGroupProviders(providers).map(item => item.id)).toEqual(['power-source'])
  })

  it('retains only the saved target-role provider as a legacy edit selection', () => {
    expect(getSelectableRecoveryGroupProviders(providers, 'power-target-1').map(item => item.id)).toEqual(['power-source', 'power-target-1'])
  })
})

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
