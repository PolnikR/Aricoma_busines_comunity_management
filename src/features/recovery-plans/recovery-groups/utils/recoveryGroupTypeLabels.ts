import type {
  RecoveryGroupResourceType,
  RecoveryGroupSourceCategory,
  RecoveryGroupWorkloadType,
} from '../model/recoveryGroupTypes'

export function getSourceCategoryLabelKey(category: RecoveryGroupSourceCategory): string {
  return category === 'backup_system_workload'
    ? 'pages.recoveryGroupBuilder.type.categories.backupWorkload'
    : 'pages.recoveryGroupBuilder.type.categories.storageSystem'
}

export function getWorkloadTypeLabelKey(workloadType: RecoveryGroupWorkloadType): string {
  switch (workloadType) {
    case 'vmware_virtual_machines':
      return 'pages.recoveryGroupBuilder.type.workloads.vmware.title'
    case 'ibm_power_virtual_machines':
      return 'pages.recoveryGroupBuilder.type.workloads.ibmPower.title'
    case 'ibm_flashsystem':
      return 'pages.recoveryGroupBuilder.type.workloads.flashSystem.title'
  }
}

export function getResourceTypeLabelKey(resourceType: RecoveryGroupResourceType): string {
  return resourceType === 'vm'
    ? 'pages.recoveryGroupBuilder.type.resourceTypes.vm'
    : 'pages.recoveryGroupBuilder.type.resourceTypes.volume'
}
