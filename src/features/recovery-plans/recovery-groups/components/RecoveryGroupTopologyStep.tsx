import { useTranslation } from '@/hooks/useTranslation'
import { Field, Input, Select } from '@/shared/components/form/FormControls'
import { Alert } from '@/shared/components/alert/Alert'
import { FetchErrorAlert } from '@/shared/components/fetch-error-alert/FetchErrorAlert'
import { ListSkeleton } from '@/shared/components/list-skeleton/ListSkeleton'
import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import type { DraftEvent } from '../model/recoveryGroupDraftLifecycle'
import type { RecoveryGroupDraft } from '../model/recoveryGroupTypes'
import { getRecoveryGroupTopologyError } from '../utils/recoveryGroupTopology'
import { KeyedHelpPopover } from '@/shared/components/help-popover/KeyedHelpPopover'
import { useState } from 'react'

interface RecoveryGroupTopologyStepProps {
  draft: Pick<RecoveryGroupDraft, 'topology' | 'relatedVolumeProviderId' | 'metroMirrorMode' | 'consistencyGroupId' | 'targetPool'>
  targetPools?: { data?: { name: string; freeCapacity: string }[] | undefined; isLoading: boolean; isFetching: boolean; error: Error | null; refetch: () => unknown }
  automaticMissingPools?: string[]
  providers: ProviderRecord[]
  isLoading: boolean
  error: Error | null
  onRetry: () => void
  onChange: (event: Extract<DraftEvent, { type: 'sourceChanged' | 'topologyChanged' | 'metroModeChanged' | 'targetPoolChanged' }>) => void
  allowLegacyLocal?: boolean
  // Metro Mirror mode is chosen only on create; edit keeps the persisted mode.
  isEditing?: boolean
}

export function RecoveryGroupTopologyStep({ draft, providers, isLoading, error, onRetry, onChange, allowLegacyLocal = false, isEditing = false, targetPools, automaticMissingPools = [] }: RecoveryGroupTopologyStepProps) {
  const { t } = useTranslation()
  const key = (suffix: string) => `pages.recoveryGroupBuilder.topology.${suffix}`
  const source = providers.find(provider => provider.id === draft.relatedVolumeProviderId)
  const target = providers.find(provider => provider.id === source?.partnerProviderId)
  const sources = providers.filter(provider => provider.type === 'FLASHCOPY' && provider.credentialStatus === 'ok')
  const problem = getRecoveryGroupTopologyError(draft, providers, allowLegacyLocal)
  const managed = draft.metroMirrorMode === 'managed'
  const remote = draft.topology === 'metro_mirror'
  const lockedManaged = isEditing && managed
  const [poolReset, setPoolReset] = useState(false)
  const poolOptions = targetPools?.data ?? []
  const savedPoolMissing = Boolean(draft.targetPool && !poolOptions.some(pool => pool.name === draft.targetPool))

  return (
    <div className="min-w-0 space-y-4">
      <div><h2 className="text-base font-semibold text-text-primary">{t(key('title'))}</h2>
        <p className="mt-1 text-sm text-text-muted">{t(key('description'))}</p></div>
      {error ? <FetchErrorAlert title={t(key('loadError'))} onRetry={onRetry} retryLabel={t('buttons.retry')} /> : null}
      {isLoading ? <ListSkeleton rowCount={2} ariaLabel={t(key('loading'))} /> : null}
      <div className="block">
        <div className="mb-1.5 flex items-center gap-1.5 [&>span]:h-4 [&>span]:items-center">
          <label htmlFor="group-topology" className="text-xs font-medium text-text-secondary">{t(key('mode'))}</label>
          <KeyedHelpPopover helpKey="recoveryGroups.fieldHelp.topology" sections={[]} />
        </div>
        <Select id="group-topology" value={draft.topology ?? ''} disabled={lockedManaged} onChange={event => {
          const topology = event.target.value === 'metro_mirror' ? 'metro_mirror' : 'local'
          onChange({ type: 'topologyChanged', topology })
        }}>
          <option value="" disabled>{t(key('choose'))}</option>
          <option value="local">{t(key('local'))}</option>
          <option value="metro_mirror">{t(key('metroMirror'))}</option>
        </Select>
      </div>
      <div className={`grid min-w-0 gap-4 ${remote ? 'sm:grid-cols-2' : ''}`}>
        <Field label={t(key('source'))} htmlFor="topology-source">
          <Select id="topology-source" value={draft.relatedVolumeProviderId ?? ''} disabled={isLoading || Boolean(error) || lockedManaged}
            onChange={event => {
              setPoolReset(Boolean(draft.targetPool && event.target.value !== draft.relatedVolumeProviderId))
              onChange({ type: 'sourceChanged', sourceId: event.target.value || null })
            }}>
            <option value="">{t(key('choose'))}</option>
            {draft.relatedVolumeProviderId && !sources.some(provider => provider.id === draft.relatedVolumeProviderId)
              ? <option value={draft.relatedVolumeProviderId} disabled>{source?.name ?? draft.relatedVolumeProviderId}</option> : null}
            {sources.map(provider => <option key={provider.id} value={provider.id}>{provider.name}</option>)}
          </Select>
        </Field>
        {remote ? <Field label={t(key('target'))} htmlFor="topology-target">
          <Input id="topology-target" value={target?.name ?? ''} readOnly placeholder={t(key('targetPlaceholder'))} />
        </Field> : null}
      </div>
      {remote ? <div className="grid min-w-0 gap-4 sm:grid-cols-2">
        <Field label={t(key('metroMode'))} htmlFor="metro-mode">
          <Select id="metro-mode" value={draft.metroMirrorMode ?? 'existing'} disabled={isEditing}
            onChange={event => {
              onChange({ type: 'metroModeChanged', mode: event.target.value === 'managed' ? 'managed' : 'existing' })
            }}>
            <option value="existing">{t(key('existing'))}</option>
            <option value="managed">{t(key('managed'))}</option>
          </Select>
        </Field>
      </div> : null}
      {remote && managed ? <p className="text-xs text-text-muted">{t(key('managedHint'))}</p> : null}
      {remote && managed ? <div className="space-y-2">
        <div className="mb-1.5 flex items-center gap-1.5 [&>span]:h-4 [&>span]:items-center">
          <label htmlFor="target-pool" className="text-xs font-medium text-text-secondary">{t('recoveryGroups.targetPool')}</label>
          <KeyedHelpPopover helpKey="recoveryGroups.fieldHelp.targetPool" sections={[]} />
        </div>
        <Select id="target-pool" value={draft.targetPool ?? ''} disabled={Boolean(problem)} onChange={event => {
          onChange({ type: 'targetPoolChanged', value: event.target.value || null })
        }}>
          <option value="">{t('recoveryGroups.poolAutomatic')}</option>
          {savedPoolMissing ? <option value={draft.targetPool ?? ''}>{draft.targetPool} — {t('recoveryGroups.poolUnverified')}</option> : null}
          {poolOptions.map(pool => <option key={pool.name} value={pool.name}>{pool.name} ({pool.freeCapacity})</option>)}
        </Select>
        {poolReset ? <p role="status" className="text-xs text-text-muted">{t('recoveryGroups.poolReset')}</p> : null}
        {targetPools?.isFetching ? <p role="status" className="text-xs text-text-muted">{t('recoveryGroups.poolLoading')}</p> : null}
        {targetPools?.error ? <FetchErrorAlert title={t('recoveryGroups.poolUnavailable')} onRetry={() => { void targetPools.refetch() }} retryLabel={t('buttons.retry')} /> : null}
        {!targetPools?.isFetching && !targetPools?.error && targetPools?.data && poolOptions.length === 0 ? <p className="text-xs text-text-muted">{t('recoveryGroups.poolEmpty')}</p> : null}
        {savedPoolMissing && targetPools?.data && !targetPools.isFetching && !targetPools.error ? <p role="status" className="text-xs text-amber-600">{t('recoveryGroups.poolMissing')}</p> : null}
        {!draft.targetPool && automaticMissingPools.length > 0 ? <p role="status" className="text-xs text-amber-600">{t('recoveryGroups.poolAutomaticMissing')}: {automaticMissingPools.join(', ')}</p> : null}
      </div> : null}
      {problem && draft.topology && !isLoading && !error ? <Alert variant="warning" title={t(key(`errors.${problem}`))} /> : null}
    </div>
  )
}
