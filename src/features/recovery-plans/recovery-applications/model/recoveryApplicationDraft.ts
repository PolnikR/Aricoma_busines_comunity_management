import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import type { RecoveryGroup as AvailableRecoveryGroup } from '../../recovery-groups/model/recoveryGroupTypes'
import { cloneTier } from '../utils/recoveryApplicationFormMapper'
import type { DraftRecoveryTier, LockedProviders, RecoveryApplicationFormState } from './recoveryApplicationTypes'

export type ApplicationMetadataPatch = Partial<Pick<RecoveryApplicationFormState,
  'fileName' | 'name' | 'description' | 'environment' | 'platform' | 'targetProviderId'
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
  | { readonly kind: 'unchanged'; readonly notifyDirty: boolean }
  | { readonly kind: 'applied'; readonly transition: DraftTransition }
  | { readonly kind: 'confirmationRequired'; readonly proposal: SourceChangeProposal }

function editableMetadata(update: ApplicationMetadataPatch, lockedProviders: LockedProviders | null): ApplicationMetadataPatch {
  return lockedProviders
    ? Object.fromEntries(Object.entries(update).filter(([key]) => key !== 'platform' && key !== 'targetProviderId'))
    : { ...update }
}

export function createApplicationDraft(initialData?: RecoveryApplicationFormState): RecoveryApplicationFormState {
  if (initialData) {
    return { ...initialData, tiers: new Map(Array.from(initialData.tiers, ([id, tier]) => [id, cloneTier(tier)])) }
  }
  return {
    fileName: '', policySetId: '', pushToOrchestrator: false, name: '', description: '',
    environment: 'dev', platform: '', orchestrationProviderId: '', targetProviderId: '', notificationEmail: null,
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
    if (previousType !== nextType) metadata.targetProviderId = ''
    if (Array.from(draft.tiers.values()).some(tier => Boolean(tier.recovery_group))) {
      return { kind: 'confirmationRequired', proposal: { metadata: { ...metadata, platform } } }
    }
  }
  if (Object.entries(metadata).every(([key, value]) => draft[key as keyof ApplicationMetadataPatch] === value)) {
    return { kind: 'unchanged', notifyDirty: true }
  }
  return { kind: 'applied', transition: { draft: { ...draft, ...metadata }, notifyDirty: true } }
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
