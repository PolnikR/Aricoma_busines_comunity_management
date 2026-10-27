import { EmptyState } from '@/shared/components/empty-state/EmptyState'
import { PolicySetPicker } from '@/shared/components/policy-set-picker/PolicySetPicker'
import { useTranslation } from '@/hooks/useTranslation'
import type { PolicySetRecord } from '@/generated/query/zod'
import { KeyedHelpPopover } from '@/shared/components/help-popover/KeyedHelpPopover'

interface RecoveryGroupPolicySetStepProps {
  policySets: PolicySetRecord[]
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
    <div className="flex h-full min-h-0 flex-col">
      <div>
        <div className="flex items-center gap-1.5"><h2 className="text-base font-semibold text-text-primary">{t('pages.recoveryGroupBuilder.policySet.title')}</h2>
          <KeyedHelpPopover helpKey="recoveryGroups.fieldHelp.policySet" sections={[]} /></div>
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
        <div className="mt-5 min-h-0 flex-1">
          <PolicySetPicker
            policySets={policySets}
            selectedPolicySetId={selectedPolicySetId}
            onSelect={onSelect}
          />
        </div>
      )}
    </div>
  )
}
