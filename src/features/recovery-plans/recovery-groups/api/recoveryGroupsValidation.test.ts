import { describe, expect, it } from 'vitest'
import type { RecoveryGroupDraft } from '../model/recoveryGroupTypes'
import { validateRecoveryGroupDraft } from './recoveryGroupsValidation'

const vmDraft: RecoveryGroupDraft = {
  id: 'vm-group',
  name: 'VM group',
  description: 'VM recovery',
  sourceCategory: 'backup_system_workload',
  workloadType: 'vmware_virtual_machines',
  resourceType: 'vm',
  providerId: 'vmware-01',
  policySetId: 'policy-01',
  resources: ['vm-01'],
  relatedVolumeProviderId: null,
  relatedVolumes: [],
  orchestrationProviderId: 'airflow-01',
  pushToOrchestrator: false,
}

describe('validateRecoveryGroupDraft topology', () => {
  it('treats an omitted legacy topology as Local with optional storage', () => {
    expect(validateRecoveryGroupDraft(vmDraft)).toMatchObject({
      topology: 'local',
      metroMirrorMode: null,
      consistencyGroupId: null,
      auxiliaryNamesByVolume: {},
      relatedVolumeProviderId: null,
    })
  })

  it('rejects an explicit unselected topology', () => {
    expect(() => validateRecoveryGroupDraft({ ...vmDraft, topology: null })).toThrow()
  })

  it('normalizes managed mode with Local topology to no Metro mode', () => {
    expect(validateRecoveryGroupDraft({ ...vmDraft, topology: 'local', metroMirrorMode: 'managed' })).toMatchObject({
      topology: 'local',
      metroMirrorMode: null,
      consistencyGroupId: null,
      auxiliaryNamesByVolume: {},
    })
  })

  it.each(['vm', 'volume'] as const)('accepts managed %s groups without consistency group or auxiliary names', resourceType => {
    const managed: RecoveryGroupDraft = resourceType === 'vm'
      ? { ...vmDraft, topology: 'metro_mirror', metroMirrorMode: 'managed', relatedVolumeProviderId: 'source-01', relatedVolumes: ['VOL-01'] }
      : {
          ...vmDraft,
          sourceCategory: 'storage_system',
          workloadType: 'ibm_flashsystem',
          resourceType: 'volume',
          providerId: 'source-01',
          resources: ['VOL-01'],
          topology: 'metro_mirror',
          metroMirrorMode: 'managed',
        }
    const expected = { topology: 'metro_mirror', metroMirrorMode: 'managed', consistencyGroupId: null, auxiliaryNamesByVolume: {} }
    expect(validateRecoveryGroupDraft(managed)).toMatchObject(expected)
    expect(validateRecoveryGroupDraft({ ...managed, consistencyGroupId: '', auxiliaryNamesByVolume: {} })).toMatchObject(expected)
  })

  it('drops persisted backend-generated values from a managed draft', () => {
    expect(validateRecoveryGroupDraft({
      ...vmDraft,
      topology: 'metro_mirror',
      metroMirrorMode: 'managed',
      relatedVolumeProviderId: 'source-01',
      relatedVolumes: ['VOL-01'],
      consistencyGroupId: '55',
      auxiliaryNamesByVolume: { 'VOL-01': 'auxe6d1bdad_VOL-01' },
    })).toMatchObject({ metroMirrorMode: 'managed', consistencyGroupId: null, auxiliaryNamesByVolume: {} })
  })

  it('still requires a source provider and a source volume for managed mode', () => {
    const managed = { ...vmDraft, topology: 'metro_mirror' as const, metroMirrorMode: 'managed' as const }
    expect(() => validateRecoveryGroupDraft(managed)).toThrow()
    expect(() => validateRecoveryGroupDraft({ ...managed, relatedVolumeProviderId: 'source-01' })).toThrow()
    expect(() => validateRecoveryGroupDraft({ ...managed, relatedVolumes: ['VOL-01'] })).toThrow()
  })

  it('clears stale Metro data when Local is selected', () => {
    expect(validateRecoveryGroupDraft({
      ...vmDraft,
      topology: 'local',
      metroMirrorMode: 'existing',
      consistencyGroupId: 'old',
      auxiliaryNamesByVolume: { 'VOL-01': 'old-aux' },
    })).toMatchObject({
      topology: 'local',
      metroMirrorMode: null,
      consistencyGroupId: null,
      auxiliaryNamesByVolume: {},
    })
  })

  it('requires a source volume, source provider, mode, CG ID and each auxiliary', () => {
    const metro = { ...vmDraft, topology: 'metro_mirror' as const, metroMirrorMode: 'existing' as const }
    expect(() => validateRecoveryGroupDraft(metro)).toThrow()
    expect(() => validateRecoveryGroupDraft({ ...metro, consistencyGroupId: '001' })).toThrow()
    expect(() => validateRecoveryGroupDraft({ ...metro, consistencyGroupId: '001', relatedVolumeProviderId: 'source-01', relatedVolumes: ['VOL-01'] })).toThrow()
    expect(() => validateRecoveryGroupDraft({ ...metro, consistencyGroupId: '  ', relatedVolumeProviderId: 'source-01', relatedVolumes: ['VOL-01'], auxiliaryNamesByVolume: { 'VOL-01': 'AUX-01' } })).toThrow()
    expect(() => validateRecoveryGroupDraft({ ...metro, consistencyGroupId: '001', relatedVolumeProviderId: 'source-01', relatedVolumes: ['VOL-01'], auxiliaryNamesByVolume: { 'VOL-01': '  ' } })).toThrow()
    expect(() => validateRecoveryGroupDraft({ ...metro, metroMirrorMode: null, consistencyGroupId: '001', relatedVolumeProviderId: 'source-01', relatedVolumes: ['VOL-01'], auxiliaryNamesByVolume: { 'VOL-01': 'AUX-01' } })).toThrow()
  })

  it('trims source names before duplicate detection and keeps auxiliary mapping', () => {
    const metro = {
      ...vmDraft,
      topology: 'metro_mirror' as const,
      metroMirrorMode: 'existing' as const,
      consistencyGroupId: ' 001 ',
      relatedVolumeProviderId: ' source-01 ',
      relatedVolumes: [' VOL-01 '],
      auxiliaryNamesByVolume: { ' VOL-01 ': ' AUX-01 ' },
    }
    expect(validateRecoveryGroupDraft(metro)).toMatchObject({
      consistencyGroupId: '001',
      relatedVolumeProviderId: 'source-01',
      relatedVolumes: ['VOL-01'],
      auxiliaryNamesByVolume: { 'VOL-01': 'AUX-01' },
    })
    expect(() => validateRecoveryGroupDraft({ ...metro, relatedVolumes: [' VOL-01 ', 'VOL-01'] })).toThrow()
  })

  it('validates volume-only Metro groups against resources', () => {
    const volumeDraft: RecoveryGroupDraft = {
      ...vmDraft,
      sourceCategory: 'storage_system',
      workloadType: 'ibm_flashsystem',
      resourceType: 'volume',
      providerId: 'source-01',
      resources: [' VOL-01 '],
      topology: 'metro_mirror',
      metroMirrorMode: 'existing',
      consistencyGroupId: 'CG-7',
      auxiliaryNamesByVolume: { ' VOL-01 ': ' AUX-01 ' },
    }
    expect(validateRecoveryGroupDraft(volumeDraft)).toMatchObject({
      resources: ['VOL-01'],
      auxiliaryNamesByVolume: { 'VOL-01': 'AUX-01' },
    })
    expect(() => validateRecoveryGroupDraft({ ...volumeDraft, consistencyGroupId: '' })).toThrow()
    expect(() => validateRecoveryGroupDraft({ ...volumeDraft, auxiliaryNamesByVolume: {} })).toThrow()
    expect(() => validateRecoveryGroupDraft({ ...volumeDraft, resources: [' VOL-01 ', 'VOL-01'] })).toThrow()
  })
})
