import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import type { RecoveryGroup as AvailableRecoveryGroup } from '../../recovery-groups/model/recoveryGroupTypes'
import { cloneTier } from '../utils/recoveryApplicationFormMapper'
import { isRecoveryGroupSourceEligible } from '../utils/recoveryGroupPlatform'
import type { DraftRecoveryTier, LockedProviders, RecoveryApplicationFormState } from './recoveryApplicationTypes'

export type ApplicationMetadataPatch = Partial<Pick<RecoveryApplicationFormState,
  'fileName' | 'name' | 'description' | 'environment' | 'platform' | 'targetProviderId' | 'dagTemplateVersion' | 'notificationEmail'
>>

export interface DraftContext {
  readonly providers: ProviderRecord[]
  readonly groups: AvailableRecoveryGroup[]
  readonly lockedProviders: LockedProviders | null
}

export interface DraftTransition {
  readonly draft: RecoveryApplicationFormState
  readonly notifyDirty: boolean
}

export interface SourceChangeProposal {
  readonly metadata: Readonly<ApplicationMetadataPatch & { platform: string }>
}

export type SourceChangeDecision =
  | { readonly kind: 'unchanged'; readonly metadata: Readonly<ApplicationMetadataPatch>; readonly notifyDirty: boolean }
  | { readonly kind: 'applied'; readonly metadata: Readonly<ApplicationMetadataPatch>; readonly transition: DraftTransition }
  | { readonly kind: 'confirmationRequired'; readonly proposal: SourceChangeProposal }

function editableMetadata(update: ApplicationMetadataPatch, lockedProviders: LockedProviders | null): ApplicationMetadataPatch {
  return lockedProviders
    ? Object.fromEntries(Object.entries(update).filter(([key]) => key !== 'platform' && key !== 'targetProviderId' && key !== 'dagTemplateVersion'))
    : { ...update }
}

export function createApplicationDraft(initialData?: RecoveryApplicationFormState): RecoveryApplicationFormState {
  if (initialData) {
    return { ...initialData, tiers: new Map(Array.from(initialData.tiers, ([id, tier]) => [id, cloneTier(tier)])) }
  }
  return {
    fileName: '', policySetId: '', pushToOrchestrator: false, name: '', description: '',
    environment: 'dev', platform: '', orchestrationProviderId: '', targetProviderId: '', notificationEmail: null, dagTemplateVersion: null,
    tiers: new Map([['tier_id', { order: 1, description: 'tier_description' }]]),
  }
}

export function planApplicationMetadataChange(
  draft: RecoveryApplicationFormState,
  update: ApplicationMetadataPatch,
  context: Pick<DraftContext, 'providers' | 'lockedProviders'>,
): SourceChangeDecision {
  const metadata = editableMetadata(update, context.lockedProviders)
  const platform = metadata.platform
  const changesSource = platform !== undefined && platform !== draft.platform
  if (changesSource) {
    const previousType = context.providers.find(provider => provider.id === draft.platform)?.type
    const nextType = context.providers.find(provider => provider.id === platform)?.type
    const changesPlatform = previousType !== nextType
    if (changesPlatform) {
      metadata.targetProviderId = ''
      metadata.dagTemplateVersion = null
    }
    if ((changesPlatform && draft.dagTemplateVersion != null) || Array.from(draft.tiers.values()).some(tier => Boolean(tier.recovery_group))) {
      return { kind: 'confirmationRequired', proposal: { metadata: { ...metadata, platform } } }
    }
  }
  if (Object.entries(metadata).every(([key, value]) => draft[key as keyof ApplicationMetadataPatch] === value)) {
    return { kind: 'unchanged', metadata: { ...metadata }, notifyDirty: true }
  }
  return { kind: 'applied', metadata: { ...metadata }, transition: { draft: { ...draft, ...metadata }, notifyDirty: true } }
}

export function applyConfirmedSourceChange(
  draft: RecoveryApplicationFormState,
  proposal: SourceChangeProposal,
  lockedProviders: LockedProviders | null,
): DraftTransition {
  const metadata = editableMetadata(proposal.metadata, lockedProviders)
  const tiers = lockedProviders ? draft.tiers : new Map(Array.from(draft.tiers, ([id, tier]): [string, DraftRecoveryTier] => [id, { order: tier.order, description: tier.description }]))
  return { draft: { ...draft, ...metadata, tiers }, notifyDirty: true }
}

export function assignRecoveryGroup(
  draft: RecoveryApplicationFormState, tierId: string, groupId: string, context: DraftContext,
): DraftTransition {
  const platform = context.lockedProviders?.platform ?? context.providers.find(provider => provider.id === draft.platform)?.type
  const group = context.groups.find(group => group.id === groupId)
  const sourceProviderId = context.lockedProviders ? context.lockedProviders.sourceProviderId : draft.platform
  if (!group || !isRecoveryGroupSourceEligible(group, platform, sourceProviderId)) return { draft, notifyDirty: false }
  const tier = draft.tiers.get(tierId)
  if (!tier) return { draft, notifyDirty: true }
  const tiers = new Map(draft.tiers)
  tiers.set(tierId, {
    ...tier,
    recovery_group: {
      id: group.id, name: group.name, description: group.description,
      vms: group.resources.map((name, index) => ({ name, order: index + 1, ...group.vmMetadataByName?.[name] })),
    },
  })
  return { draft: { ...draft, tiers }, notifyDirty: true }
}

export function removeRecoveryGroup(draft: RecoveryApplicationFormState, tierId: string): DraftTransition {
  const tier = draft.tiers.get(tierId)
  if (!tier?.recovery_group) return { draft, notifyDirty: true }
  const tiers = new Map(draft.tiers)
  tiers.set(tierId, { order: tier.order, description: tier.description })
  return { draft: { ...draft, tiers }, notifyDirty: true }
}

export function selectRecoveryVm(
  draft: RecoveryApplicationFormState, tierId: string, vmName: string, selected: boolean, context: DraftContext,
): DraftTransition {
  const tier = draft.tiers.get(tierId)
  if (!tier?.recovery_group) return { draft, notifyDirty: true }
  const alreadySelected = tier.recovery_group.vms.some(vm => vm.name === vmName)
  if (alreadySelected === selected) return { draft, notifyDirty: true }
  const platform = context.lockedProviders?.platform ?? context.providers.find(provider => provider.id === draft.platform)?.type
  const sourceProviderId = context.lockedProviders ? context.lockedProviders.sourceProviderId : draft.platform
  const group = context.groups.find(group => group.id === tier.recovery_group?.id && isRecoveryGroupSourceEligible(group, platform, sourceProviderId))
  if (selected && !group?.resources.includes(vmName)) return { draft, notifyDirty: false }
  const nextVms = selected
    ? [...tier.recovery_group.vms, { name: vmName, ...group?.vmMetadataByName?.[vmName] }]
    : tier.recovery_group.vms.filter(vm => vm.name !== vmName)
  const tiers = new Map(draft.tiers)
  tiers.set(tierId, { ...tier, recovery_group: { ...tier.recovery_group, vms: nextVms.map((vm, index) => ({ ...vm, order: index + 1 })) } })
  return { draft: { ...draft, tiers }, notifyDirty: true }
}

export function addApplicationTier(
  draft: RecoveryApplicationFormState, tierId: string, tier: DraftRecoveryTier,
): DraftTransition {
  return { draft: { ...draft, tiers: new Map(draft.tiers).set(tierId, cloneTier(tier)) }, notifyDirty: true }
}

export function editApplicationTier(
  draft: RecoveryApplicationFormState, tierId: string, newTierId: string, updates: { tierDescription: string },
): DraftTransition {
  const tier = draft.tiers.get(tierId)
  if (!tier) return { draft, notifyDirty: true }
  const tiers = new Map(draft.tiers)
  if (newTierId !== tierId) tiers.delete(tierId)
  tiers.set(newTierId, { ...tier, description: updates.tierDescription })
  return { draft: { ...draft, tiers }, notifyDirty: true }
}

export function deleteApplicationTier(draft: RecoveryApplicationFormState, tierId: string): DraftTransition {
  const tiers = new Map(draft.tiers)
  tiers.delete(tierId)
  return { draft: { ...draft, tiers }, notifyDirty: true }
}

export function applyApplicationTierOrder(
  draft: RecoveryApplicationFormState, reorderedTiers: Record<string, DraftRecoveryTier>,
): DraftTransition {
  return { draft: { ...draft, tiers: new Map(Object.entries(reorderedTiers)) }, notifyDirty: true }
}
