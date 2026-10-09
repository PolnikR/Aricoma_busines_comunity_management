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
