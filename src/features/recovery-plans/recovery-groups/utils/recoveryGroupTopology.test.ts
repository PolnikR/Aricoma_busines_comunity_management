import { describe, expect, it } from 'vitest'
import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import { getRecoveryGroupTopologyError } from './recoveryGroupTopology'

const source: ProviderRecord = { id: 'source', name: 'Source', type: 'FLASHCOPY', credentialStatus: 'ok', role: 'source', partnerProviderId: 'target' }
const target: ProviderRecord = { ...source, id: 'target', name: 'Target', role: 'target' }
const local = { topology: 'local' as const, relatedVolumeProviderId: 'source' }
const metro = { ...local, topology: 'metro_mirror' as const, metroMirrorMode: 'existing' as const, consistencyGroupId: '001' }

describe('getRecoveryGroupTopologyError', () => {
  it('accepts Local and Existing with a valid target-role partner', () => {
    expect(getRecoveryGroupTopologyError(local, [source])).toBeNull()
    expect(getRecoveryGroupTopologyError(metro, [source, target])).toBeNull()
  })
  it('requires a Source except when editing a legacy Local without volumes', () => {
    expect(getRecoveryGroupTopologyError({ topology: 'local' }, [])).toBe('sourceRequired')
    expect(getRecoveryGroupTopologyError({ topology: 'local' }, [], true)).toBeNull()
    expect(getRecoveryGroupTopologyError({ topology: null }, [], true)).toBe('required')
  })
  it.each([
    [{ ...source, credentialStatus: 'invalid' }, target],
    [{ ...source, type: 'VMWARE' }, target],
    [source, { ...target, credentialStatus: 'none' }],
    [source, { ...target, type: 'VMWARE' }],
    [{ ...source, partnerProviderId: 'source' }, target],
    [{ ...source, partnerProviderId: null }, target],
    [source],
  ])('rejects unusable source or partner: %j', (...providers) => {
    expect(getRecoveryGroupTopologyError(metro, providers as ProviderRecord[])).not.toBeNull()
  })
  it('accepts managed mode with a valid partner and defers consistency group validation to storage', () => {
    expect(getRecoveryGroupTopologyError({ ...metro, metroMirrorMode: 'managed', consistencyGroupId: null }, [source, target])).toBeNull()
    expect(getRecoveryGroupTopologyError({ ...metro, consistencyGroupId: ' ' }, [source, target])).toBeNull()
  })
  it.each([
    [{ ...source, credentialStatus: 'invalid' }, target],
    [source, { ...target, type: 'VMWARE' }],
    [{ ...source, partnerProviderId: 'source' }, target],
    [{ ...source, partnerProviderId: null }, target],
    [source],
  ])('rejects managed mode with an unusable source or partner: %j', (...providers) => {
    expect(getRecoveryGroupTopologyError({ ...metro, metroMirrorMode: 'managed' }, providers as ProviderRecord[])).not.toBeNull()
  })
  it('requires a Metro Mirror mode', () => {
    expect(getRecoveryGroupTopologyError({ ...metro, metroMirrorMode: null }, [source, target])).toBe('modeRequired')
  })
})
