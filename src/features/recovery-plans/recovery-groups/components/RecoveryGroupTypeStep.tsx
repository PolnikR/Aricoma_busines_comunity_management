import { EmptyState } from '@/shared/components/empty-state/EmptyState'
import { FetchErrorAlert } from '@/shared/components/fetch-error-alert/FetchErrorAlert'
import { ListSkeleton } from '@/shared/components/list-skeleton/ListSkeleton'
import { SelectableCard } from '@/shared/components/selectable-card/SelectableCard'
import { Tabs } from '@/shared/components/tabs/Tabs'
import { useTranslation } from '@/hooks/useTranslation'
import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import { getAvailableRecoveryGroupResourceOptions } from '../config/recoveryGroupResourceOptions'
import type {
  RecoveryGroupResourceType,
  RecoveryGroupSourceCategory,
  RecoveryGroupWorkloadType,
} from '../model/recoveryGroupTypes'

interface RecoveryGroupTypeStepProps {
  providers: ProviderRecord[]
  isLoadingProviders: boolean
  providerError: Error | null
  onRetryProviders: () => void
  sourceCategory: RecoveryGroupSourceCategory | null
  selected: RecoveryGroupWorkloadType | null
  readOnly?: boolean
  onCategoryChange: (sourceCategory: RecoveryGroupSourceCategory) => void
  onSelect: (
    sourceCategory: RecoveryGroupSourceCategory,
    workloadType: RecoveryGroupWorkloadType,
    resourceType: RecoveryGroupResourceType,
  ) => void
}

export function RecoveryGroupTypeStep({
  providers,
  isLoadingProviders,
  providerError,
  onRetryProviders,
  sourceCategory,
  selected,
  readOnly = false,
  onCategoryChange,
  onSelect,
}: RecoveryGroupTypeStepProps) {
  const { t } = useTranslation()
  const availableOptions = getAvailableRecoveryGroupResourceOptions(providers)
  const visibleCategory = sourceCategory
    ?? availableOptions[0]?.sourceCategory
    ?? 'backup_system_workload'
  const workloads = availableOptions
    .filter(option => option.sourceCategory === visibleCategory)
  const tabs = [
    {
      value: 'backup_system_workload' as const,
      label: t('pages.recoveryGroupBuilder.type.categories.backupWorkload'),
    },
    {
      value: 'storage_system' as const,
      label: t('pages.recoveryGroupBuilder.type.categories.storageSystem'),
    },
  ]

  return (
    <div>
      <h2 className="text-base font-semibold text-[#17233d]">
        {t('pages.recoveryGroupBuilder.type.title')}
      </h2>
      <p className="mt-1 text-sm text-[#71819a]">
        {t('pages.recoveryGroupBuilder.type.description')}
      </p>
      <p className="mt-3 text-sm text-[#52627b]">
        <span className="font-semibold">
          {t('pages.recoveryGroupBuilder.type.noteLabel')}
        </span>{' '}
        {t('pages.recoveryGroupBuilder.type.note')}
      </p>
      <Tabs
        items={tabs}
        value={visibleCategory}
        onChange={value => {
          if (!readOnly) onCategoryChange(value)
        }}
        ariaLabel={t('pages.recoveryGroupBuilder.type.categories.ariaLabel')}
        className="mt-5 px-0"
      />

      {isLoadingProviders ? (
        <div className="mt-4 max-w-4xl">
          <ListSkeleton ariaLabel={t('pages.recoveryGroupBuilder.type.loading')} />
        </div>
      ) : providerError ? (
        <div className="mt-4 max-w-4xl">
          <FetchErrorAlert
            title={t('pages.recoveryGroupBuilder.type.loadError')}
            retryLabel={t('buttons.retry')}
            onRetry={onRetryProviders}
            variant="full"
          />
        </div>
      ) : workloads.length === 0 ? (
        <div className="mt-4 max-w-4xl">
          <EmptyState
            title={t('pages.recoveryGroupBuilder.type.noAvailable.title')}
            description={t('pages.recoveryGroupBuilder.type.noAvailable.description')}
          />
        </div>
      ) : (
        <div
          role="tabpanel"
          className="mt-4 grid max-w-4xl gap-3 pb-8 md:grid-cols-2 xl:grid-cols-3"
        >
          {workloads.map(workload => (
            <SelectableCard
              key={workload.workloadType}
              selected={workload.workloadType === selected}
              title={t(workload.titleKey)}
              description={t(workload.descriptionKey)}
              meta={t(workload.metaKey)}
              icon={<span className="text-sm font-bold tracking-tight">{workload.brand}</span>}
              disabled={readOnly}
              onClick={() => {
                onSelect(visibleCategory, workload.workloadType, workload.resourceType)
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
