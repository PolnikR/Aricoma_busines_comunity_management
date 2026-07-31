import { EmptyState } from '@/shared/components/empty-state/EmptyState'
import { SelectableCard } from '@/shared/components/selectable-card/SelectableCard'
import { useTranslation } from '@/hooks/useTranslation'
import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import { getRecoveryGroupResourceOption } from '../config/recoveryGroupResourceOptions'
import type { RecoveryGroupWorkloadType } from '../model/recoveryGroupTypes'

interface RecoveryGroupProviderStepProps {
  workloadType: RecoveryGroupWorkloadType
  providers: ProviderRecord[]
  selectedProviderId: string | null
  onSelect: (providerId: string) => void
}

export function RecoveryGroupProviderStep({
  workloadType,
  providers,
  selectedProviderId,
  onSelect,
}: RecoveryGroupProviderStepProps) {
  const { t } = useTranslation()
  const option = getRecoveryGroupResourceOption(workloadType)
  const matchingProviders = option
    ? providers.filter(provider => (
        provider.type === option.providerType
        && provider.credentialStatus === 'ok'
      ))
    : []

  return (
    <div>
      <h2 className="text-base font-semibold text-[#17233d]">
        {t('pages.recoveryGroupBuilder.provider.title')}
      </h2>
      <p className="mt-1 text-sm text-[#71819a]">
        {t('pages.recoveryGroupBuilder.provider.description')}
      </p>

      {matchingProviders.length === 0 ? (
        <div className="mt-5 max-w-4xl">
          <EmptyState
            title={t('pages.recoveryGroupBuilder.provider.empty.title')}
            description={t('pages.recoveryGroupBuilder.provider.empty.description')}
          />
        </div>
      ) : (
        <div className="mt-5 grid max-w-4xl gap-3 md:grid-cols-2 xl:grid-cols-3">
          {matchingProviders.map(provider => (
            <SelectableCard
              key={provider.id}
              selected={provider.id === selectedProviderId}
              title={provider.name}
              description={provider.description}
              meta={`${provider.type} · ${provider.ipAddress}`}
              icon={<span className="text-sm font-bold tracking-tight">{option?.brand}</span>}
              onClick={() => { onSelect(provider.id) }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
