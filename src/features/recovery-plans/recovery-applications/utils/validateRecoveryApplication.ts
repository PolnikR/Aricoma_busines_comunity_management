import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import type { PlatformProviderRecord } from '@/features/platform-administration/platform-providers/model/platformProviderTypes'
import type { RecoveryApplicationFormState } from '../model/recoveryApplicationTypes'
import { isValidRecoveryApplicationFileName } from './recoveryApplicationFileName'
import { isEligibleSourceProvider, isEligiblePlatformProvider } from './eligibleProviders'

export interface ValidationError {
  field: 'fileName' | 'name' | 'description' | 'platform' | 'orchestrationProvider' | 'recoveryGroup'
  messageKey: string
}

export function validateRecoveryApplication(
  formState: RecoveryApplicationFormState,
  providers: ProviderRecord[],
  platformProviders: PlatformProviderRecord[],
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

  if (!formState.description.trim()) {
    return {
      field: 'description',
      messageKey: 'alerts.pleaseEnterDescription',
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

  const platformProviderIsAvailable = platformProviders.some(
    provider => isEligiblePlatformProvider(provider) && provider.id === formState.orchestrationProviderId,
  )
  if (!platformProviderIsAvailable) {
    return {
      field: 'orchestrationProvider',
      messageKey: 'recovery.application.validation.platformProviderRequired',
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
