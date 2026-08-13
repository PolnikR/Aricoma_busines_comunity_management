import type {
  RecoveryApplicationData,
  RecoveryApplicationFormState,
  RecoveryApplicationListItem,
  RecoveryTier,
} from '../model/recoveryApplicationTypes'
import { toRecoveryApplicationFileName } from './recoveryApplicationFileName'

function toFormEnvironment(environment: string): string {
  return environment
}

export function cloneTier(tier: RecoveryTier): RecoveryTier {
  if (!tier.recovery_group) {
    return { ...tier }
  }

  return {
    ...tier,
    recovery_group: {
      ...tier.recovery_group,
      vms: tier.recovery_group.vms.map((vm) => ({ ...vm })),
      ...(tier.recovery_group.volumes
        ? { volumes: tier.recovery_group.volumes.map((vol) => ({ ...vol })) }
        : {}),
    },
  }
}

export function toRecoveryApplicationFormState(
  application: RecoveryApplicationListItem,
): RecoveryApplicationFormState {
  const data = application.data.application

  return {
    fileName: toRecoveryApplicationFileName(application.id),
    policySetId: application.policySetId ?? '',
    pushToOrchestrator: application.pushToOrchestrator ?? false,
    name: data.name,
    description: data.description ?? '',
    environment: toFormEnvironment(data.environment),
    platform: data.platform,
    orchestrationProviderId: '',
    sourceConnection: data.source_connection ?? '',
    targetConnection: data.target_connection ?? '',
    tiers: new Map(
      Object.entries(data.tiers).map(([id, tier]) => [id, cloneTier(tier)]),
    ),
  }
}

export function toRecoveryApplicationData(
  formState: RecoveryApplicationFormState,
): RecoveryApplicationData {
  return {
    id: formState.fileName,
    policy_set_id: formState.policySetId,
    application: {
      name: formState.name,
      description: formState.description,
      environment: formState.environment,
      platform: formState.platform,
      source_connection: formState.sourceConnection,
      target_connection: formState.targetConnection,
      tiers: Object.fromEntries(
        Array.from(formState.tiers.entries()).map(([id, tier]) => [id, cloneTier(tier)]),
      ),
    },
  }
}
