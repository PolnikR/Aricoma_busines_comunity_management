import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import type {
  DraftRecoveryTier,
  LockedProviders,
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
    targetProviderId: data.target_provider_id ?? '',
    notificationEmail: data.notificationEmail ?? null,
    tiers: new Map(
      Object.entries(data.tiers).map(([id, tier]) => [id, cloneTier(tier)]),
    ),
  }
}

// Every saved application is locked, including a legacy record without
// provider ids; its old connection names are not mapped to providers.
export function lockedProvidersOf(application: RecoveryApplicationListItem): LockedProviders {
  const { platform, source_provider_id: sourceProviderId, target_provider_id: targetProviderId } = application.data.application
  // An empty id is as missing as an absent one.
  const storedId = (id: string | null | undefined) => (id === undefined || id === null || id === '' ? null : id)
  return { platform, sourceProviderId: storedId(sourceProviderId), targetProviderId: storedId(targetProviderId) }
}

// formState.platform holds the selected provider id; the wire contract wants
// that provider's type as platform and its id as source_provider_id, next to
// target_provider_id. Save is gated on both providers being available, so a
// missing one means that gate was bypassed.
function toWireProviders(
  formState: RecoveryApplicationFormState,
  providers: ProviderRecord[],
  locked: LockedProviders | null,
): Pick<RecoveryApplicationData['application'], 'platform' | 'source_provider_id' | 'target_provider_id'> {
  // Locked values are sent as stored, even if a provider is gone meanwhile.
  if (locked) {
    if (!locked.sourceProviderId || !locked.targetProviderId) {
      throw new Error('The application has no stored source or target provider')
    }
    return { platform: locked.platform, source_provider_id: locked.sourceProviderId, target_provider_id: locked.targetProviderId }
  }
  const sourceProvider = providers.find(provider => provider.id === formState.platform)
  if (!sourceProvider) {
    throw new Error(`Source provider "${formState.platform}" is not available`)
  }
  const targetProvider = providers.find(provider => provider.id === formState.targetProviderId)
  if (!targetProvider) {
    throw new Error(`Target provider "${formState.targetProviderId}" is not available`)
  }
  return { platform: sourceProvider.type, source_provider_id: sourceProvider.id, target_provider_id: targetProvider.id }
}

export function toRecoveryApplicationData(
  formState: RecoveryApplicationFormState,
  providers: ProviderRecord[],
  locked: LockedProviders | null = null,
): RecoveryApplicationData {
  return {
    id: formState.fileName,
    policy_set_id: formState.policySetId,
    application: {
      name: formState.name,
      description: formState.description,
      environment: formState.environment,
      ...toWireProviders(formState, providers, locked),
      notificationEmail: formState.notificationEmail,
      tiers: Object.fromEntries(
        Array.from(formState.tiers.entries()).map(([id, tier]) => [id, toSubmittableTier(id, tier)]),
      ),
    },
  }
}
