import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import type { PlatformProviderRecord } from '@/features/platform-administration/platform-providers/model/platformProviderTypes'
import type { RecoveryApplicationFormState } from '../model/recoveryApplicationTypes'
import { isValidRecoveryApplicationFileName, isValidRecoveryApplicationName } from './recoveryApplicationFileName'
import { isEligibleSourceProvider } from './eligibleProviders'

export interface ValidationError {
  field: 'fileName' | 'name' | 'description' | 'policySet' | 'platform' | 'recoveryGroup'
  messageKey: string
}

export function validateRecoveryApplication(
  formState: RecoveryApplicationFormState,
  providers: ProviderRecord[],
  platformProviders: PlatformProviderRecord[] = [],
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

  const platformIsAvailable = providers.some(
    provider => isEligibleSourceProvider(provider) && provider.id === formState.platform,
  )
  if (!platformIsAvailable) {
    return {
      field: 'platform',
      messageKey: 'recovery.application.validation.platformRequired',
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

  return null
}
