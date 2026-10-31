import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import type { PlatformProviderRecord } from '@/features/platform-administration/platform-providers/model/platformProviderTypes'
import type { LockedProviders, RecoveryApplicationFormState } from '../model/recoveryApplicationTypes'
import { isValidRecoveryApplicationFileName, isValidRecoveryApplicationName } from './recoveryApplicationFileName'
import type { RecoveryGroup } from '../../recovery-groups/model/recoveryGroupTypes'
import { getEligibleTargetProviders, isEligiblePlatformProvider, isEligibleSourceProvider } from './eligibleProviders'
import { isRecoveryGroupCompatible, isRecoveryGroupSourceCompatible, isRecoveryGroupSourceEligible } from './recoveryGroupPlatform'
import { isValidRecoveryApplicationEmail } from './recoveryApplicationEmail'
import { findRecoveryApplicationDagProblem } from './recoveryApplicationDagValidation'
import type { DagTemplateVersion } from '@/generated/query/zod'

export interface ValidationError {
  field: 'notificationEmail' | 'workloads' | 'fileName' | 'name' | 'description' | 'policySet' | 'platform' | 'targetProvider' | 'recoveryGroup' | 'dagTemplateVersion'
  messageKey: string
  params?: Record<string, string>
  templateDependent?: boolean
}

export interface ApplicationTemplateCatalog {
  templates: DagTemplateVersion[]
  verified: boolean
}

export function validateRecoveryApplicationTemplate(
  draft: RecoveryApplicationFormState, catalog?: ApplicationTemplateCatalog,
): ValidationError | null {
  const version = draft.dagTemplateVersion ?? null
  const verified = catalog?.verified && catalog.templates.filter(template => template.default).length === 1
  if (!verified) {
    return !draft.pushToOrchestrator && version === null ? null : {
      field: 'dagTemplateVersion', messageKey: 'recovery.application.lifecycle.templateUnverified',
    }
  }
  if (version !== null && !catalog.templates.some(template => template.version === version)) {
    return { field: 'dagTemplateVersion', messageKey: 'recovery.application.lifecycle.templateUnknown', params: { version } }
  }
  return null
}

// The backend's LPAR_NAME_RE (recovery/recovery.py): each LPAR name becomes part
// of the DAG's task ids, so an invalid one would only fail on Airflow.
const LPAR_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,46}$/

// Why the stored providers of a saved application cannot be submitted, if so.
// Mirrors the backend's validate_app_providers: both providers must exist and
// have the platform's type; VMware also needs source role=source and target
// role=target, IBM Power has no role check (one HMC may serve both sides).
// Pass the providers only once they loaded: a failed fetch is no verdict.
export function storedProvidersProblem(locked: LockedProviders, providers: ProviderRecord[]): ValidationError | null {
  if (!locked.sourceProviderId || !locked.targetProviderId) {
    return { field: 'platform', messageKey: 'recovery.application.validation.legacyProviders' }
  }
  const isPower = locked.platform.toUpperCase() === 'IBM_POWER'
  const sides = [
    { side: 'source', id: locked.sourceProviderId },
    { side: 'target', id: locked.targetProviderId },
  ] as const
  for (const { side, id } of sides) {
    const provider = providers.find(candidate => candidate.id === id)
    if (!provider) {
      return { field: 'platform', messageKey: `recovery.application.validation.${side}ProviderMissing`, params: { id } }
    }
    const fitsType = provider.type === (isPower ? 'IBM_POWER' : 'VMWARE')
    const fitsRole = isPower || (side === 'source' ? provider.role !== 'target' : provider.role === 'target')
    if (!fitsType || !fitsRole) {
      return { field: 'platform', messageKey: `recovery.application.validation.${side}ProviderIncompatible`, params: { id } }
    }
  }
  return null
}

export type ApplicationValidationGroup = Pick<RecoveryGroup, 'id' | 'providerId' | 'sourceCategory' | 'workloadType' | 'pushToOrchestrator' | 'airflowRunId'> & { readonly resources: readonly string[] }

export interface ApplicationValidationOptions {
  lockedProviders?: LockedProviders | null
  templateCatalog?: ApplicationTemplateCatalog
  groups: readonly ApplicationValidationGroup[]
}

export function validateRecoveryApplicationDetails(
  formState: RecoveryApplicationFormState, providers: ProviderRecord[], lockedProviders: LockedProviders | null = null,
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

  if (!isValidRecoveryApplicationEmail(formState.notificationEmail)) {
    return { field: 'notificationEmail', messageKey: 'forms.notificationEmailInvalid' }
  }

  const lockedProblem = lockedProviders ? storedProvidersProblem(lockedProviders, providers) : null
  if (lockedProblem) return lockedProblem

  // Locked providers are sent as stored once storedProvidersProblem accepts them.
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

  return null
}

export function validateRecoveryApplicationTiers(
  formState: RecoveryApplicationFormState,
  platform: string | undefined,
  sourceProviderId: string | null,
  groups: readonly ApplicationValidationGroup[],
  templateCatalog?: ApplicationTemplateCatalog,
): ValidationError | null {
  if (formState.tiers.size === 0) {
    return { field: 'recoveryGroup', messageKey: 'recovery.application.validation.tiersRequired' }
  }
  const groupsById = new Map(groups.map(group => [group.id, group]))
  for (const [tierId, tier] of formState.tiers) {
    const group = tier.recovery_group
    if (!group) return { field: 'recoveryGroup', messageKey: 'recovery.application.validation.recoveryGroupRequired', params: { tier: tierId } }
    const params = { tier: tierId, group: group.name }
    const current = groupsById.get(group.id)
    if (!current) return { field: 'recoveryGroup', messageKey: 'recovery.application.validation.recoveryGroupMissing', params }
    if (!isRecoveryGroupCompatible(current, platform)) {
      return { field: 'recoveryGroup', messageKey: 'recovery.application.validation.recoveryGroupPlatformMismatch', params }
    }
    if (!current.providerId) return { field: 'recoveryGroup', messageKey: 'recovery.application.validation.recoveryGroupSourceMissing', params }
    if (!isRecoveryGroupSourceCompatible(current, platform, sourceProviderId)) {
      return { field: 'recoveryGroup', messageKey: 'recovery.application.validation.recoveryGroupSourceMismatch', params: { ...params, expected: sourceProviderId ?? '', actual: current.providerId } }
    }
    if (!isRecoveryGroupSourceEligible(current, platform, sourceProviderId)) {
      return { field: 'recoveryGroup', messageKey: 'recovery.application.validation.recoveryGroupNotPublished', params }
    }
    const resources = new Set(current.resources)
    for (const vm of group.vms) {
      if (!resources.has(vm.name)) return { field: 'workloads', messageKey: 'recovery.application.validation.workloadMissing', params: { ...params, name: vm.name } }
      if (platform?.toUpperCase() === 'IBM_POWER' && !LPAR_NAME_RE.test(vm.name)) {
        return { field: 'recoveryGroup', messageKey: 'recovery.application.validation.lparNameInvalid', params: { tier: tierId, name: vm.name } }
      }
    }
  }
  const dagProblem = findRecoveryApplicationDagProblem(formState, platform, templateCatalog)
  if (dagProblem) return {
    field: dagProblem.kind === 'tierTaskGroupCollision' ? 'recoveryGroup' : 'workloads',
    templateDependent: true,
    messageKey: `recovery.application.validation.${dagProblem.kind}`,
    params: dagProblem.params,
  }
  return null
}

export function validateRecoveryApplication(
  formState: RecoveryApplicationFormState,
  providers: ProviderRecord[],
  platformProviders: PlatformProviderRecord[],
  { lockedProviders = null, groups, templateCatalog }: ApplicationValidationOptions,
): ValidationError | null {
  const detailsProblem = validateRecoveryApplicationDetails(formState, providers, lockedProviders)
  if (detailsProblem) return detailsProblem
  const sourceProvider = providers.find(provider => provider.id === formState.platform)
  const tierProblem = validateRecoveryApplicationTiers(formState, lockedProviders?.platform ?? sourceProvider?.type,
    lockedProviders ? lockedProviders.sourceProviderId : formState.platform, groups, templateCatalog)
  if (tierProblem) return tierProblem
  if (!formState.policySetId.trim()) return { field: 'policySet', messageKey: 'recovery.application.validation.policySetRequired' }
  const templateProblem = validateRecoveryApplicationTemplate(formState, templateCatalog)
  if (templateProblem) return templateProblem
  if (formState.pushToOrchestrator && !platformProviders.some(provider => provider.id === formState.orchestrationProviderId && isEligiblePlatformProvider(provider))) {
    return { field: 'platform', messageKey: 'recovery.application.validation.platformProviderRequired' }
  }
  return null
}
