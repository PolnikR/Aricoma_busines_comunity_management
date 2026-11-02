import { describe, expect, it } from 'vitest'
import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import { RecoveryGroupRecord } from '@/generated/query/zod'
import { mapRecoveryGroupApiRecord, toRecoveryGroupReadRecord } from '../../recovery-groups/helpers/mapRecoveryGroups'
import { isRecoveryGroupSourceCompatible, isRecoveryGroupSourceEligible } from './recoveryGroupPlatform'

// The backend uses provider_id_vm for the compute source and provider_id_volume
// for storage. Metro Mirror changes the snapshot location, not the compute source.
const platforms = [
  { platform: 'VMWARE', sourceId: 'vcenter-source', otherId: 'vcenter-other', workloadType: 'vmware_virtual_machines' },
  { platform: 'IBM_POWER', sourceId: 'hmc-source', otherId: 'hmc-other', workloadType: 'ibm_power_virtual_machines' },
] as const

const topologies = [
  { topology: 'local', mode: null },
  { topology: 'metro_mirror', mode: 'managed' },
  { topology: 'metro_mirror', mode: 'existing' },
] as const

function provider(id: string, type: ProviderRecord['type']): ProviderRecord {
  return {
    id, type, name: id, description: '', role: 'source',
    ipAddress: '127.0.0.1', credentialId: 'test', credentialStatus: 'ok',
  }
}

describe('Recovery Application source eligibility across Recovery Group topologies', () => {
  it.each(platforms.flatMap(platform => topologies.map(topology => ({ ...platform, ...topology }))))(
    '$platform / $topology / $mode uses the VM/LPAR source, not the snapshot array',
    ({ platform, sourceId, otherId, topology, mode, workloadType }) => {
      const providers: ProviderRecord[] = [
        provider(sourceId, platform),
        provider(otherId, platform),
        { ...provider('flash-source', 'FLASHCOPY'), partnerProviderId: 'flash-auxiliary' },
        { ...provider('flash-auxiliary', 'FLASHCOPY'), partnerProviderId: 'flash-source' },
      ]
      const record = RecoveryGroupRecord.parse({
        id: 'app-group',
        name: 'Recovery Group',
        provider_id_vm: sourceId,
        provider_id_volume: 'flash-source',
        topology,
        ...(mode ? { metro_mirror: {
          mode,
          ...(mode === 'existing' ? { consistency_group_id: '001' } : {}),
        } } : {}),
        vms: [{ name: 'db' }],
        volumes: [{ name: 'VOL', ...(mode === 'existing' ? { auxiliary_name: 'AUX-VOL' } : {}) }],
        orchestration: { pushed: true, run_id: 'group-run', provider_id: 'airflow' },
      })
      const group = mapRecoveryGroupApiRecord(toRecoveryGroupReadRecord(record), providers)

      expect(group.providerId).toBe(sourceId)
      expect(group.workloadType).toBe(workloadType)
      expect(group.relatedVolumeProviderId).toBe('flash-source')
      expect(group.targetVolumeProviderId).toBe(topology === 'metro_mirror' ? 'flash-auxiliary' : null)
      expect(group.topology).toBe(topology)
      expect(group.metroMirrorMode).toBe(mode)

      // Sidebar eligibility, assignment and Save must all use the same predicate.
      expect(isRecoveryGroupSourceCompatible(group, platform, sourceId)).toBe(true)
      expect(isRecoveryGroupSourceEligible(group, platform, sourceId)).toBe(true)
      expect(isRecoveryGroupSourceEligible(group, platform, otherId)).toBe(false)
      expect(isRecoveryGroupSourceEligible(group, platform, 'flash-source')).toBe(false)
      expect(isRecoveryGroupSourceEligible(group, platform, 'flash-auxiliary')).toBe(false)

      // A published group attached to a different compute source must be hidden.
      const wrongSource = { ...group, providerId: otherId }
      expect(isRecoveryGroupSourceEligible(wrongSource, platform, sourceId)).toBe(false)
      expect(isRecoveryGroupSourceEligible(wrongSource, platform, otherId)).toBe(true)
      expect(isRecoveryGroupSourceEligible({ ...group, pushToOrchestrator: false }, platform, sourceId)).toBe(false)
      expect(isRecoveryGroupSourceEligible({ ...group, airflowRunId: '' }, platform, sourceId)).toBe(false)
    },
  )
})
