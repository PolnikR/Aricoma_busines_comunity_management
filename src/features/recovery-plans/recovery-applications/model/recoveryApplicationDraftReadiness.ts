import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import type { PlatformProviderRecord } from '@/features/platform-administration/platform-providers/model/platformProviderTypes'
import type { LockedProviders, RecoveryApplicationFormState } from './recoveryApplicationTypes'
import type { ApplicationTemplateCatalog, ApplicationValidationGroup, ValidationError } from '../utils/validateRecoveryApplication'
import { storedProvidersProblem, validateRecoveryApplication, validateRecoveryApplicationDetails, validateRecoveryApplicationTiers } from '../utils/validateRecoveryApplication'
import { isEligiblePlatformProvider } from '../utils/eligibleProviders'

export interface DraftReadinessContext {
  readonly step: 1 | 2 | 3 | 4
  readonly providers: ProviderRecord[] | undefined
  readonly providersError: unknown
  readonly platformProviders: PlatformProviderRecord[]
  readonly areGroupsLoading: boolean
  readonly groups: readonly ApplicationValidationGroup[]
  readonly groupsError: unknown
  readonly lockedProviders: LockedProviders | null
  readonly templateCatalog?: ApplicationTemplateCatalog
}

export interface DraftReadiness {
  readonly detailsValid: boolean
  readonly tiersValid: boolean
  readonly policySetValid: boolean
  readonly orchestrationValid: boolean
  readonly canContinue: boolean
  readonly canSave: boolean
  readonly providersLoaded: boolean
  readonly lockedProvidersError: ValidationError | null
  readonly detailsError: ValidationError | null
  readonly tiersError: ValidationError | null
  readonly validationError: ValidationError | null
}

export function getRecoveryApplicationDraftReadiness(
  draft: RecoveryApplicationFormState, context: DraftReadinessContext,
): DraftReadiness {
  const { providers, providersError, platformProviders, areGroupsLoading, groups, groupsError, lockedProviders, step } = context
  const providersLoaded = Boolean(providers) && !providersError
  const unverified: ValidationError = { field: 'recoveryGroup', messageKey: 'recovery.application.validation.referencesUnverified' }
  const lockedProvidersError = lockedProviders && providersLoaded ? storedProvidersProblem(lockedProviders, providers ?? []) : null
  const detailsError = providersLoaded ? validateRecoveryApplicationDetails(draft, providers ?? [], lockedProviders) : unverified
  const platform = lockedProviders?.platform ?? providers?.find(provider => provider.id === draft.platform)?.type
  const sourceProviderId = lockedProviders ? lockedProviders.sourceProviderId : draft.platform
  const referencesVerified = providersLoaded && !areGroupsLoading && !groupsError
  const tiersError = referencesVerified ? validateRecoveryApplicationTiers(draft, platform, sourceProviderId, groups) : unverified
  const detailsValid = !detailsError
  const tiersValid = !tiersError
  const policySetValid = Boolean(draft.policySetId.trim())
  const orchestrationValid = !draft.pushToOrchestrator
    || platformProviders.some(provider => provider.id === draft.orchestrationProviderId && isEligiblePlatformProvider(provider))
  const canContinue = step === 1 ? detailsValid : step === 2 ? tiersValid : policySetValid
  const validationError = !referencesVerified ? unverified : validateRecoveryApplication(draft, providers ?? [], platformProviders, {
    lockedProviders, groups, ...(context.templateCatalog ? { templateCatalog: context.templateCatalog } : {}),
  })
  return { detailsValid, tiersValid, policySetValid, orchestrationValid, canContinue, canSave: !validationError,
    providersLoaded, lockedProvidersError, detailsError, tiersError, validationError }
}
