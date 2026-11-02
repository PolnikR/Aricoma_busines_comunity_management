import type { RecoveryGroup, RecoveryGroupWorkloadType } from '../../recovery-groups/model/recoveryGroupTypes'

// A recovery app recovers VMs of its own platform only. The platform is the
// source provider TYPE (compared case-insensitively, like the backend); a group
// whose provider could not be resolved (workloadType null) never matches.
const WORKLOAD_TYPE_BY_PLATFORM: Record<string, RecoveryGroupWorkloadType> = {
  VMWARE: 'vmware_virtual_machines',
  IBM_POWER: 'ibm_power_virtual_machines',
}

export function isRecoveryGroupCompatible(
  group: Pick<RecoveryGroup, 'sourceCategory' | 'workloadType'>,
  platform: string | undefined,
): boolean {
  const workloadType = platform ? WORKLOAD_TYPE_BY_PLATFORM[platform.toUpperCase()] : undefined
  return group.sourceCategory === 'backup_system_workload'
    && workloadType !== undefined
    && group.workloadType === workloadType
}

// A retained run id alone does not mean the group is still published after rollback.
export function isRecoveryGroupEligible(
  group: Pick<RecoveryGroup, 'sourceCategory' | 'workloadType' | 'pushToOrchestrator' | 'airflowRunId'>,
  platform: string | undefined,
): boolean {
  return isRecoveryGroupCompatible(group, platform)
    && group.pushToOrchestrator === true
    && typeof group.airflowRunId === 'string'
    && group.airflowRunId.trim().length > 0
}

export function isRecoveryGroupSourceCompatible(
  group: Pick<RecoveryGroup, 'sourceCategory' | 'workloadType' | 'providerId'>,
  platform: string | undefined,
  sourceProviderId: string | null | undefined,
): boolean {
  return Boolean(sourceProviderId) && group.providerId === sourceProviderId && isRecoveryGroupCompatible(group, platform)
}

export function isRecoveryGroupSourceEligible(
  group: Pick<RecoveryGroup, 'sourceCategory' | 'workloadType' | 'providerId' | 'pushToOrchestrator' | 'airflowRunId'>,
  platform: string | undefined,
  sourceProviderId: string | null | undefined,
): boolean {
  return isRecoveryGroupSourceCompatible(group, platform, sourceProviderId) && isRecoveryGroupEligible(group, platform)
}
