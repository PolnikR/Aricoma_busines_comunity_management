import { useTranslation } from '@/hooks/useTranslation'
import { Field, Input, Select } from '@/shared/components/form/FormControls'
import { Alert } from '@/shared/components/alert/Alert'
import { FetchErrorAlert } from '@/shared/components/fetch-error-alert/FetchErrorAlert'
import { ListSkeleton } from '@/shared/components/list-skeleton/ListSkeleton'
import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import type { RecoveryGroupDraft } from '../model/recoveryGroupTypes'
import { getRecoveryGroupTopologyError } from '../utils/recoveryGroupTopology'

interface RecoveryGroupTopologyStepProps {
  draft: Pick<RecoveryGroupDraft, 'topology' | 'relatedVolumeProviderId' | 'metroMirrorMode' | 'consistencyGroupId'>
  providers: ProviderRecord[]
  isLoading: boolean
  error: Error | null
  onRetry: () => void
  onChange: (update: Partial<RecoveryGroupDraft>) => void
  allowLegacyLocal?: boolean
  // Metro Mirror mode is chosen only on create; edit keeps the persisted mode.
  isEditing?: boolean
}

export function RecoveryGroupTopologyStep({ draft, providers, isLoading, error, onRetry, onChange, allowLegacyLocal = false, isEditing = false }: RecoveryGroupTopologyStepProps) {
  const { t } = useTranslation()
  const key = (suffix: string) => `pages.recoveryGroupBuilder.topology.${suffix}`
  const source = providers.find(provider => provider.id === draft.relatedVolumeProviderId)
  const target = providers.find(provider => provider.id === source?.partnerProviderId)
  const sources = providers.filter(provider => provider.type === 'FLASHCOPY' && provider.credentialStatus === 'ok')
  const problem = getRecoveryGroupTopologyError(draft, providers, allowLegacyLocal)
  const managed = draft.metroMirrorMode === 'managed'
  const remote = draft.topology === 'metro_mirror'
  const lockedManaged = isEditing && managed

  return (
    <div className="min-w-0 space-y-4">
      <div><h2 className="text-base font-semibold text-text-primary">{t(key('title'))}</h2>
        <p className="mt-1 text-sm text-text-muted">{t(key('description'))}</p></div>
      {error ? <FetchErrorAlert title={t(key('loadError'))} onRetry={onRetry} retryLabel={t('buttons.retry')} /> : null}
      {isLoading ? <ListSkeleton rowCount={2} ariaLabel={t(key('loading'))} /> : null}
      <Field label={t(key('mode'))} htmlFor="group-topology">
        <Select id="group-topology" value={draft.topology ?? ''} disabled={lockedManaged} onChange={event => {
          const topology = event.target.value === 'metro_mirror' ? 'metro_mirror' : 'local'
          onChange({ topology, metroMirrorMode: topology === 'metro_mirror' ? 'existing' : null, consistencyGroupId: '', auxiliaryNamesByVolume: {} })
        }}>
          <option value="" disabled>{t(key('choose'))}</option>
          <option value="local">{t(key('local'))}</option>
          <option value="metro_mirror">{t(key('metroMirror'))}</option>
        </Select>
      </Field>
      <div className={`grid min-w-0 gap-4 ${remote ? 'sm:grid-cols-2' : ''}`}>
        <Field label={t(key('source'))} htmlFor="topology-source">
          <Select id="topology-source" value={draft.relatedVolumeProviderId ?? ''} disabled={isLoading || Boolean(error) || lockedManaged}
            onChange={event => { onChange({ relatedVolumeProviderId: event.target.value || null }) }}>
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
              onChange({ metroMirrorMode: event.target.value === 'managed' ? 'managed' : 'existing', consistencyGroupId: '', auxiliaryNamesByVolume: {} })
            }}>
            <option value="existing">{t(key('existing'))}</option>
            <option value="managed">{t(key('managed'))}</option>
          </Select>
        </Field>
      </div> : null}
      {remote && managed ? <p className="text-xs text-text-muted">{t(key('managedHint'))}</p> : null}
      {problem && draft.topology && !isLoading && !error ? <Alert variant="warning" title={t(key(`errors.${problem}`))} /> : null}
    </div>
  )
}
