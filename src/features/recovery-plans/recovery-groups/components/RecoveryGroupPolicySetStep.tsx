import { EmptyState } from '@/shared/components/empty-state/EmptyState'
import { SelectableCard } from '@/shared/components/selectable-card/SelectableCard'
import { useTranslation } from '@/hooks/useTranslation'
import type { PolicySet } from '@/features/recovery-plans/policy-sets/model/policySetTypes'

interface RecoveryGroupPolicySetStepProps {
  policySets: PolicySet[]
  isLoading: boolean
  selectedPolicySetId: string | null
  onSelect: (policySetId: string) => void
}

export function RecoveryGroupPolicySetStep({
  policySets,
  isLoading,
  selectedPolicySetId,
  onSelect,
}: RecoveryGroupPolicySetStepProps) {
  const { t } = useTranslation()

  return (
    <div>
      <div>
        <h2 className="text-base font-semibold text-text-primary">{t('pages.recoveryGroupBuilder.policySet.title')}</h2>
        <p className="mt-1 text-sm text-text-muted">{t('pages.recoveryGroupBuilder.policySet.description')}</p>
      </div>

      {isLoading ? (
        <p className="mt-5 text-sm text-text-muted" role="status">{t('pages.recoveryGroupBuilder.policySet.loading')}</p>
      ) : policySets.length === 0 ? (
        <div className="mt-5 max-w-4xl">
          <EmptyState
            title={t('pages.recoveryGroupBuilder.policySet.empty.title')}
            description={t('pages.recoveryGroupBuilder.policySet.empty.description')}
          />
        </div>
      ) : (
        <div className="mt-5 grid max-w-4xl gap-3 md:grid-cols-2 xl:grid-cols-3">
          {policySets.map(policySet => (
            <SelectableCard
              key={policySet.id}
              selected={policySet.id === selectedPolicySetId}
              title={policySet.name}
              description={policySet.description}
              meta={t('pages.recoveryGroupBuilder.policySet.policiesCount').replace('{count}', '1')}
              onClick={() => { onSelect(policySet.id) }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
