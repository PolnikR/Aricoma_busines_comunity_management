import { describe, expect, it } from 'vitest'
import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import { resolveRecoveryGroupDagPlatform } from './recoveryGroupDagTemplate'

const provider = (id: string, type: ProviderRecord['type']): ProviderRecord => ({
  id, type, name: id, description: '', role: 'source', ipAddress: '', credentialId: '', credentialStatus: 'ok',
})
const providers = [provider('compute', 'VMWARE'), provider('source', 'FLASHCOPY'), provider('target', 'HITACHI')]

describe('resolveRecoveryGroupDagPlatform', () => {
  it('uses the related volume provider for VMs, never the compute provider', () => {
    expect(resolveRecoveryGroupDagPlatform({ resourceType: 'vm', providerId: 'compute', relatedVolumeProviderId: 'source' }, providers)).toBe('flashcopy')
    expect(resolveRecoveryGroupDagPlatform({ resourceType: 'vm', providerId: 'source', relatedVolumeProviderId: 'target' }, providers)).toBe('hitachi')
  })
  it('uses the primary volume provider for volume groups', () => {
    expect(resolveRecoveryGroupDagPlatform({ resourceType: 'volume', providerId: 'source', relatedVolumeProviderId: 'target' }, providers)).toBe('flashcopy')
    expect(resolveRecoveryGroupDagPlatform({ resourceType: 'volume', providerId: 'target' }, providers)).toBe('hitachi')
  })
  it.each([null, 'removed', 'compute'])('does not invent a platform for %s', providerId => {
    expect(resolveRecoveryGroupDagPlatform({ resourceType: 'volume', providerId }, providers)).toBeUndefined()
  })
})
