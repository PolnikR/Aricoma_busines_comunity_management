import type {
  RecoveryApplicationData,
  RecoveryApplicationFormState,
  RecoveryApplicationListItem,
  RecoveryTier,
} from '../model/recoveryApplicationTypes'
import { toRecoveryApplicationFileName } from './recoveryApplicationFileName'

const KNOWN_ENVIRONMENTS = new Set(['dev', 'staging', 'prod'])

function toFormEnvironment(environment: string): 'dev' | 'staging' | 'prod' {
  return KNOWN_ENVIRONMENTS.has(environment) ? environment as 'dev' | 'staging' | 'prod' : 'dev'
}

function cloneTier(tier: RecoveryTier): RecoveryTier {
  return {
    ...tier,
    ...(tier.recovery_group ? {
      recovery_group: {
        ...tier.recovery_group,
        vms: tier.recovery_group.vms.map((vm) => ({ ...vm })),
      },
    } : {}),
  }
}

export function toRecoveryApplicationFormState(
  application: RecoveryApplicationListItem,
): RecoveryApplicationFormState {
  const data = application.data.application

  return {
    fileName: toRecoveryApplicationFileName(application.id),
    name: data.name,
    description: data.description ?? '',
    environment: toFormEnvironment(data.environment),
    platform: data.platform,
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
