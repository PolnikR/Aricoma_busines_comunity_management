import { useMemo } from 'react'
import { SelectableCard } from '@/shared/components/selectable-card/SelectableCard'
import { useTranslation } from '@/hooks/useTranslation'
import { useSnapshotPolicies } from '@/features/recovery-plans/recovery-policies/snapshot/hooks/useSnapshotPolicies'
import { useRecoveryAppPolicies } from '@/features/recovery-plans/recovery-policies/application-recovery/hooks/useRecoveryAppPolicies'
import { useCleanRoomPolicies } from '@/features/recovery-plans/recovery-policies/clean-room/hooks/useCleanRoomPolicies'
import type { PolicySet } from '@/features/recovery-plans/policy-sets/model/policySetTypes'
import { RecoveryGroupPolicySetDetails } from './RecoveryGroupPolicySetDetails'

interface RecoveryGroupPolicySetCatalogueProps {
  policySets: PolicySet[]
  selectedPolicySetId: string | null
  onSelect: (policySetId: string) => void
}

function PolicyReference({ label, value }: { label: string; value: string }) {
  return (
    <span className="grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-3 border-t border-border/70 py-1.5 first:border-t-0">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-text-subtle">{label}</span>
      <span className="truncate text-right text-xs font-medium text-text-secondary" title={value}>{value}</span>
    </span>
  )
}

export function RecoveryGroupPolicySetCatalogue({
  policySets,
  selectedPolicySetId,
  onSelect,
}: RecoveryGroupPolicySetCatalogueProps) {
  const { t } = useTranslation()
  const snapshotQuery = useSnapshotPolicies()
  const recoveryQuery = useRecoveryAppPolicies()
  const cleanRoomQuery = useCleanRoomPolicies()
  const selectedSet = policySets.find(policySet => policySet.id === selectedPolicySetId) ?? null
  const snapshotPoliciesById = useMemo(
    () => new Map((snapshotQuery.data ?? []).map(policy => [policy.id, policy])),
    [snapshotQuery.data],
  )
  const recoveryPoliciesById = useMemo(
    () => new Map((recoveryQuery.data ?? []).map(policy => [policy.id, policy])),
    [recoveryQuery.data],
  )
  const cleanRoomPoliciesById = useMemo(
    () => new Map((cleanRoomQuery.data ?? []).map(policy => [policy.id, policy])),
    [cleanRoomQuery.data],
  )

  return (
    <>
      <div className="mt-5 grid max-w-6xl gap-3 md:grid-cols-2 xl:grid-cols-3">
        {policySets.map(policySet => (
          <SelectableCard
            key={policySet.id}
            selected={policySet.id === selectedPolicySetId}
            title={policySet.name}
            description={policySet.description}
            className="min-h-48"
            supportingContent={(
              <span className="block border-t border-border/70 pt-1">
                <PolicyReference label={t('policySets.form.snapshotPolicy')} value={snapshotPoliciesById.get(policySet.snapshotPolicyId)?.name ?? policySet.snapshotPolicyId} />
                <PolicyReference label={t('policySets.form.recoveryAppPolicy')} value={recoveryPoliciesById.get(policySet.recoveryAppPolicyId)?.name ?? policySet.recoveryAppPolicyId} />
                <PolicyReference label={t('policySets.form.cleanRoomPolicy')} value={cleanRoomPoliciesById.get(policySet.cleanRoomPolicyId)?.name ?? policySet.cleanRoomPolicyId} />
              </span>
            )}
            onClick={() => { onSelect(policySet.id) }}
          />
        ))}
      </div>

      {selectedSet ? (
        <RecoveryGroupPolicySetDetails
          policySet={selectedSet}
          snapshotPolicy={snapshotPoliciesById.get(selectedSet.snapshotPolicyId)}
          recoveryPolicy={recoveryPoliciesById.get(selectedSet.recoveryAppPolicyId)}
          cleanRoomPolicy={cleanRoomPoliciesById.get(selectedSet.cleanRoomPolicyId)}
          isLoading={snapshotQuery.isLoading || recoveryQuery.isLoading || cleanRoomQuery.isLoading}
          hasQueryError={Boolean(snapshotQuery.error ?? recoveryQuery.error ?? cleanRoomQuery.error)}
        />
      ) : null}
    </>
  )
}
