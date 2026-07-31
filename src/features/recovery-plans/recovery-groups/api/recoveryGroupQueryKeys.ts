import type { RecoveryGroupWorkloadType } from '../model/recoveryGroupTypes'

export const recoveryGroupKeys = {
  all: ['recovery-groups'] as const,
  list: () => [...recoveryGroupKeys.all, 'list'] as const,
  resourceOptions: (
    workloadType: RecoveryGroupWorkloadType | null,
    providerId: string | null,
  ) => [...recoveryGroupKeys.all, 'resource-options', workloadType, providerId] as const,
}
