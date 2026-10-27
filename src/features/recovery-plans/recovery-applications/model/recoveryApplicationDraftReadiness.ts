import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import type { PlatformProviderRecord } from '@/features/platform-administration/platform-providers/model/platformProviderTypes'
import type { LockedProviders, RecoveryApplicationFormState } from './recoveryApplicationTypes'
import type { ApplicationTemplateCatalog, ValidationError } from '../utils/validateRecoveryApplication'
import { storedProvidersProblem, validateRecoveryApplicationTemplate } from '../utils/validateRecoveryApplication'
import { getEligibleSourceProviders, getEligibleTargetProviders, isEligiblePlatformProvider } from '../utils/eligibleProviders'
import { isValidRecoveryApplicationFileName, isValidRecoveryApplicationName } from '../utils/recoveryApplicationFileName'

export interface DraftReadinessContext {
  readonly step: 1 | 2 | 3 | 4
  readonly providers: ProviderRecord[] | undefined
  readonly providersError: unknown
  readonly platformProviders: PlatformProviderRecord[]
  readonly areGroupsLoading: boolean
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
}

export function getRecoveryApplicationDraftReadiness(
  draft: RecoveryApplicationFormState, context: DraftReadinessContext,
): DraftReadiness {
  const { providers, providersError, platformProviders, areGroupsLoading, lockedProviders, step } = context
  const sourceProvider = getEligibleSourceProviders(providers ?? []).find(provider => provider.id === draft.platform)
  const detailsValid = Boolean(
    isValidRecoveryApplicationFileName(draft.fileName)
    && isValidRecoveryApplicationName(draft.name)
    && draft.description.trim()
    && (lockedProviders !== null || (sourceProvider
      && getEligibleTargetProviders(providers ?? [], sourceProvider.type)
        .some(provider => provider.id === draft.targetProviderId))),
  )
  const tiersValid = draft.tiers.size > 0
    && Array.from(draft.tiers.values()).every(tier => Boolean(tier.recovery_group))
  const policySetValid = Boolean(draft.policySetId.trim())
  const orchestrationValid = !draft.pushToOrchestrator
    || platformProviders.some(provider => provider.id === draft.orchestrationProviderId && isEligiblePlatformProvider(provider))
  const canContinue = step === 1 ? detailsValid : step === 2 ? tiersValid : policySetValid
  const providersLoaded = Boolean(providers) && !providersError
  const lockedProvidersError = lockedProviders && providersLoaded
    ? storedProvidersProblem(lockedProviders, providers ?? [])
    : null
  const canSave = detailsValid && tiersValid && policySetValid && orchestrationValid && !areGroupsLoading
    && !validateRecoveryApplicationTemplate(draft, context.templateCatalog)
    && (!lockedProviders || (providersLoaded && !lockedProvidersError))

  return { detailsValid, tiersValid, policySetValid, orchestrationValid, canContinue, canSave, providersLoaded, lockedProvidersError }
}
