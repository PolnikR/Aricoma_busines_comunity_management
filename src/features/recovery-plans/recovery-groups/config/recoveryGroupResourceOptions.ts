import type {
  ProviderRecord,
  ProviderType,
} from '@/features/providers-connectors/providers/model/providerTypes'
import type {
  RecoveryGroupResourceType,
  RecoveryGroupSourceCategory,
  RecoveryGroupWorkloadType,
} from '../model/recoveryGroupTypes'

export interface RecoveryGroupResourceOption {
  providerType: ProviderType
  sourceCategory: RecoveryGroupSourceCategory
  workloadType: RecoveryGroupWorkloadType
  resourceType: RecoveryGroupResourceType
  titleKey: string
  descriptionKey: string
  metaKey: string
  brand: 'VMware' | 'IBM'
}

export const RECOVERY_GROUP_RESOURCE_OPTIONS = [
  {
    providerType: 'VMWARE',
    sourceCategory: 'backup_system_workload',
    workloadType: 'vmware_virtual_machines',
    resourceType: 'vm',
    titleKey: 'pages.recoveryGroupBuilder.type.workloads.vmware.title',
    descriptionKey: 'pages.recoveryGroupBuilder.type.workloads.vmware.description',
    metaKey: 'pages.recoveryGroupBuilder.type.resourceTypes.vm',
    brand: 'VMware',
  },
  {
    providerType: 'IBM_POWER',
    sourceCategory: 'backup_system_workload',
    workloadType: 'ibm_power_virtual_machines',
    resourceType: 'vm',
    titleKey: 'pages.recoveryGroupBuilder.type.workloads.ibmPower.title',
    descriptionKey: 'pages.recoveryGroupBuilder.type.workloads.ibmPower.description',
    metaKey: 'pages.recoveryGroupBuilder.type.resourceTypes.vm',
    brand: 'IBM',
  },
  {
    providerType: 'FLASHCOPY',
    sourceCategory: 'storage_system',
    workloadType: 'ibm_flashsystem',
    resourceType: 'volume',
    titleKey: 'pages.recoveryGroupBuilder.type.workloads.flashSystem.title',
    descriptionKey: 'pages.recoveryGroupBuilder.type.workloads.flashSystem.description',
    metaKey: 'pages.recoveryGroupBuilder.type.resourceTypes.volume',
    brand: 'IBM',
  },
] as const satisfies readonly RecoveryGroupResourceOption[]

export function getAvailableRecoveryGroupResourceOptions(
  providers: ProviderRecord[],
): RecoveryGroupResourceOption[] {
  const availableTypes = new Set(
    providers
      .filter(provider => provider.credentialStatus === 'ok' && provider.role !== 'target')
      .map(provider => provider.type),
  )

  return RECOVERY_GROUP_RESOURCE_OPTIONS.filter(option => availableTypes.has(option.providerType))
}

export function getRecoveryGroupResourceOption(
  workloadType: RecoveryGroupWorkloadType | null,
): RecoveryGroupResourceOption | undefined {
  return RECOVERY_GROUP_RESOURCE_OPTIONS.find(option => option.workloadType === workloadType)
}
