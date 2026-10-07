import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import type {
  DraftRecoveryTier,
  RecoveryApplicationData,
  RecoveryApplicationFormState,
  RecoveryApplicationListItem,
  RecoveryTier,
} from '../model/recoveryApplicationTypes'
import { toRecoveryApplicationFileName } from './recoveryApplicationFileName'
import { sourceProviderIdOf } from './sourceProvider'

function toFormEnvironment(environment: string): string {
  return environment
}

export function cloneTier(tier: DraftRecoveryTier): DraftRecoveryTier {
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

// Submission tiers must carry a recovery group. The builder's Save button is
// already gated on every tier having one (see RecoveryAppBuilder's
// canSaveApplication check), so a missing group here means that gate was
// bypassed — fail loudly rather than send an invalid payload.
function toSubmittableTier(id: string, tier: DraftRecoveryTier): RecoveryTier {
  if (!tier.recovery_group) {
    throw new Error(`Tier "${id}" has no recovery group attached`)
  }
  return { ...cloneTier(tier), recovery_group: tier.recovery_group }
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
    platform: sourceProviderIdOf(data),
    orchestrationProviderId: application.orchestrationProviderId ?? '',
    sourceConnection: data.source_connection ?? '',
    targetConnection: data.target_connection ?? '',
    tiers: new Map(
      Object.entries(data.tiers).map(([id, tier]) => [id, cloneTier(tier)]),
    ),
  }
}

// formState.platform holds the selected provider id; the wire contract wants
// that provider's type as platform and its id as source_provider_id. Save is
// gated on the provider being available, so a missing one means that gate was
// bypassed.
export function toRecoveryApplicationData(
  formState: RecoveryApplicationFormState,
  providers: ProviderRecord[],
): RecoveryApplicationData {
  const sourceProvider = providers.find(provider => provider.id === formState.platform)
  if (!sourceProvider) {
    throw new Error(`Source provider "${formState.platform}" is not available`)
  }

  return {
    id: formState.fileName,
    policy_set_id: formState.policySetId,
    application: {
      name: formState.name,
      description: formState.description,
      environment: formState.environment,
      platform: sourceProvider.type,
      source_provider_id: sourceProvider.id,
      source_connection: formState.sourceConnection,
      target_connection: formState.targetConnection,
      tiers: Object.fromEntries(
        Array.from(formState.tiers.entries()).map(([id, tier]) => [id, toSubmittableTier(id, tier)]),
      ),
    },
  }
}
