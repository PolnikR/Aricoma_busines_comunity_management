import { resolveVmwareProviderFilter } from '@/features/discovery-inventory/resources/helpers/vmwareProviderFilter'
import type { RecoveryGroupProviderScope, RecoveryGroupWorkloadType } from '../model/recoveryGroupTypes'

export type RecoveryGroupSearchMode = 'client' | 'server'

/**
 * Where the resource search runs. A fixed VMware provider scope already bounds the
 * server result, so the user searches inside it locally; without a scope the VMware
 * name search narrows the server request instead. Other inventories have no name
 * search endpoint. An unknown scope (`undefined`) loads nothing yet, so it stays local.
 */
export function getRecoveryGroupSearchMode(
  workloadType: RecoveryGroupWorkloadType | null,
  providerScope: RecoveryGroupProviderScope | null | undefined,
): RecoveryGroupSearchMode {
  if (workloadType !== 'vmware_virtual_machines' || providerScope === undefined) return 'client'
  return resolveVmwareProviderFilter(providerScope).isFixed ? 'client' : 'server'
}
