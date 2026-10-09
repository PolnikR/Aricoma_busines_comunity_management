import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import type { PlatformProviderRecord } from '@/features/platform-administration/platform-providers/model/platformProviderTypes'
import type { LockedProviders, RecoveryApplicationFormState } from '../model/recoveryApplicationTypes'
import { isValidRecoveryApplicationFileName, isValidRecoveryApplicationName } from './recoveryApplicationFileName'
import type { RecoveryGroup } from '../../recovery-groups/model/recoveryGroupTypes'
import { getEligibleTargetProviders, isEligibleSourceProvider } from './eligibleProviders'
import { isRecoveryGroupCompatible } from './recoveryGroupPlatform'

export interface ValidationError {
  field: 'fileName' | 'name' | 'description' | 'policySet' | 'platform' | 'targetProvider' | 'recoveryGroup'
  messageKey: string
  params?: Record<string, string>
}

// The backend's LPAR_NAME_RE (recovery/recovery.py): each LPAR name becomes part
// of the DAG's task ids, so an invalid one would only fail on Airflow.
const LPAR_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,46}$/

// Why the stored providers of a saved application cannot be submitted, if so.
export function storedProvidersProblem(locked: LockedProviders): ValidationError | null {
  if (!locked.sourceProviderId || !locked.targetProviderId) {
    return { field: 'platform', messageKey: 'recovery.application.validation.legacyProviders' }
  }
  return null
}

export function validateRecoveryApplication(
  formState: RecoveryApplicationFormState,
  providers: ProviderRecord[],
  platformProviders: PlatformProviderRecord[] = [],
  { lockedProviders = null, groups }: {
    lockedProviders?: LockedProviders | null
    // The current recovery groups; the sidebar filter alone does not cover
    // groups stored on a saved application.
    groups?: Pick<RecoveryGroup, 'id' | 'sourceCategory' | 'workloadType'>[]
  } = {},
): ValidationError | null {
  if (!isValidRecoveryApplicationFileName(formState.fileName)) {
    return {
      field: 'fileName',
      messageKey: 'recovery.application.validation.fileNameRequired',
    }
  }

  if (!formState.name.trim()) {
    return {
      field: 'name',
      messageKey: 'alerts.pleaseEnterName',
    }
  }

  if (!isValidRecoveryApplicationName(formState.name)) {
    return {
      field: 'name',
      messageKey: 'recovery.application.validation.nameInvalid',
    }
  }

  if (!formState.description.trim()) {
    return {
      field: 'description',
      messageKey: 'alerts.pleaseEnterDescription',
    }
  }

  if (!formState.policySetId.trim()) {
    return {
      field: 'policySet',
      messageKey: 'recovery.application.validation.policySetRequired',
    }
  }

  const lockedProblem = lockedProviders ? storedProvidersProblem(lockedProviders) : null
  if (lockedProblem) return lockedProblem

  // Locked providers are sent as stored; they need not be available any more.
  const sourceProvider = lockedProviders ? null : providers.find(
    provider => isEligibleSourceProvider(provider) && provider.id === formState.platform,
  )
  if (!lockedProviders && !sourceProvider) {
    return {
      field: 'platform',
      messageKey: 'recovery.application.validation.platformRequired',
    }
  }

  const targetProviderIsAvailable = lockedProviders !== null || getEligibleTargetProviders(providers, sourceProvider?.type)
    .some(provider => provider.id === formState.targetProviderId)
  if (!targetProviderIsAvailable) {
    return {
      field: 'targetProvider',
      messageKey: 'recovery.application.validation.targetProviderRequired',
    }
  }

  if (formState.pushToOrchestrator) {
    const orchestrationProviderIsAvailable = platformProviders.some(
      provider => provider.id === formState.orchestrationProviderId,
    )
    if (!orchestrationProviderIsAvailable) {
      return {
        field: 'platform',
        messageKey: 'recovery.application.validation.platformProviderRequired',
      }
    }
  }

  if (Array.from(formState.tiers.values()).some(tier => !tier.recovery_group)) {
    return {
      field: 'recoveryGroup',
      messageKey: 'recovery.application.validation.recoveryGroupRequired',
    }
  }

  const platform = lockedProviders?.platform ?? sourceProvider?.type
  for (const [tierId, tier] of formState.tiers) {
    const group = tier.recovery_group
    if (!group || !groups) continue
    const current = groups.find(candidate => candidate.id === group.id)
    if (!current) {
      return {
        field: 'recoveryGroup',
        messageKey: 'recovery.application.validation.recoveryGroupMissing',
        params: { tier: tierId, group: group.name },
      }
    }
    if (!isRecoveryGroupCompatible(current, platform)) {
      return {
        field: 'recoveryGroup',
        messageKey: 'recovery.application.validation.recoveryGroupPlatformMismatch',
        params: { tier: tierId, group: group.name },
      }
    }
    if (platform?.toUpperCase() === 'IBM_POWER') {
      const invalid = group.vms.find(vm => !LPAR_NAME_RE.test(vm.name))
      if (invalid) {
        return {
          field: 'recoveryGroup',
          messageKey: 'recovery.application.validation.lparNameInvalid',
          params: { tier: tierId, name: invalid.name },
        }
      }
    }
  }

  return null
}
