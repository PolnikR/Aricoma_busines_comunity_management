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
  return workloadType === 'vmware_virtual_machines'
    ? 'pages.recoveryGroupBuilder.type.workloads.vmware.title'
    : 'pages.recoveryGroupBuilder.type.workloads.flashSystem.title'
}

export function getResourceTypeLabelKey(resourceType: RecoveryGroupResourceType): string {
  return resourceType === 'vm'
    ? 'pages.recoveryGroupBuilder.type.resourceTypes.vm'
    : 'pages.recoveryGroupBuilder.type.resourceTypes.volume'
}
