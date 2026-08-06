import { EmptyState } from '@/shared/components/empty-state/EmptyState'
import { FetchErrorAlert } from '@/shared/components/fetch-error-alert/FetchErrorAlert'
import { Field, Select } from '@/shared/components/form/FormControls'
import { Toggle } from '@/shared/components/toggle/Toggle'
import { useTranslation } from '@/hooks/useTranslation'
import type { PlatformProviderRecord } from '@/features/platform-administration/platform-providers/model/platformProviderTypes'

interface RecoveryGroupOrchestrationStepProps {
  platformProviders: PlatformProviderRecord[]
  isLoading: boolean
  error: Error | null
  onRetry: () => void
  pushToOrchestrator: boolean
  selectedProviderId: string | null
  onPushToOrchestratorChange: (value: boolean) => void
  onProviderSelect: (providerId: string) => void
}

export function RecoveryGroupOrchestrationStep({
  platformProviders,
  isLoading,
  error,
  onRetry,
  pushToOrchestrator,
  selectedProviderId,
  onPushToOrchestratorChange,
  onProviderSelect,
}: RecoveryGroupOrchestrationStepProps) {
  const { t } = useTranslation()

  const deployAnswerKey = pushToOrchestrator
    ? 'pages.recoveryGroupBuilder.orchestration.deployOn'
    : 'pages.recoveryGroupBuilder.orchestration.deployOff'

  return (
    <div>
      <h2 className="text-base font-semibold text-text-primary">
        {t('pages.recoveryGroupBuilder.orchestration.title')}
      </h2>
      <p className="mt-1 text-sm text-text-muted">
        {t('pages.recoveryGroupBuilder.orchestration.description')}
      </p>

      <div className="mt-5 flex max-w-4xl items-start gap-3 rounded-lg border border-border bg-surface p-4">
        <Toggle
          checked={pushToOrchestrator}
          onChange={onPushToOrchestratorChange}
          label={t('pages.recoveryGroupBuilder.orchestration.deployLabel')}
        />
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-text-primary">
              {t('pages.recoveryGroupBuilder.orchestration.deployLabel')}
            </span>
            <span className="text-sm text-text-muted">{t(deployAnswerKey)}</span>
          </div>
          <p className="mt-1 text-xs text-text-muted">
            {t('pages.recoveryGroupBuilder.orchestration.deployHint')}
          </p>
        </div>
      </div>

      {error ? (
        <div className="mt-5 max-w-4xl">
          <FetchErrorAlert
            title={t('platformProviders.loadFailed')}
            retryLabel={t('buttons.retry')}
            onRetry={onRetry}
            variant="full"
          />
        </div>
      ) : !isLoading && platformProviders.length === 0 ? (
        <div className="mt-5 max-w-4xl">
          <EmptyState
            title={t('pages.recoveryGroupBuilder.orchestration.empty.title')}
            description={t('pages.recoveryGroupBuilder.orchestration.empty.description')}
          />
        </div>
      ) : (
        <div className="mt-5 max-w-4xl">
          <Field
            label={t('pages.recoveryGroupBuilder.orchestration.providerLabel')}
            htmlFor="recovery-group-orchestration-provider"
          >
            <Select
              id="recovery-group-orchestration-provider"
              value={selectedProviderId ?? ''}
              onChange={e => { onProviderSelect(e.target.value) }}
              disabled={isLoading}
              required
            >
              <option value="">
                {isLoading
                  ? t('platformProviders.loading')
                  : t('pages.recoveryGroupBuilder.orchestration.providerPlaceholder')}
              </option>
              {platformProviders.map(provider => (
                <option key={provider.id} value={provider.id}>
                  {provider.name} - {provider.type}
                </option>
              ))}
            </Select>
          </Field>
          <p className="mt-2 text-xs text-text-muted">
            {t('pages.recoveryGroupBuilder.orchestration.notRestorable')}
          </p>
        </div>
      )}
    </div>
  )
}
