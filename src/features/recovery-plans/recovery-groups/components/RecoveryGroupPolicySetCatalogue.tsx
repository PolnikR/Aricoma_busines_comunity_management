import { useMemo } from 'react'
import { useSnapshotPolicies } from '@/features/recovery-plans/recovery-policies/snapshot/hooks/useSnapshotPolicies'
import { useRecoveryAppPolicies } from '@/features/recovery-plans/recovery-policies/application-recovery/hooks/useRecoveryAppPolicies'
import { useCleanRoomPolicies } from '@/features/recovery-plans/recovery-policies/clean-room/hooks/useCleanRoomPolicies'
import type { PolicySet } from '@/features/recovery-plans/policy-sets/model/policySetTypes'
import { RecoveryGroupPolicySetList } from './RecoveryGroupPolicySetList'
import { RecoveryGroupPolicySetDetails } from './RecoveryGroupPolicySetDetails'

interface RecoveryGroupPolicySetCatalogueProps {
  policySets: PolicySet[]
  selectedPolicySetId: string | null
  onSelect: (policySetId: string) => void
}

export function RecoveryGroupPolicySetCatalogue({
  policySets,
  selectedPolicySetId,
  onSelect,
}: RecoveryGroupPolicySetCatalogueProps) {
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
    <div className="mt-5 flex flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-sm lg:h-96 lg:flex-row">
      <div className="w-full min-h-96 lg:w-96 lg:min-h-0 shrink-0">
        <RecoveryGroupPolicySetList
          policySets={policySets}
          selectedPolicySetId={selectedPolicySetId}
          recoveryPoliciesById={recoveryPoliciesById}
          onSelect={onSelect}
        />
      </div>

      {selectedSet ? (
        <div className="max-h-96 min-w-0 overflow-auto border-t border-border lg:max-h-none lg:flex-1 lg:border-l lg:border-t-0">
          <RecoveryGroupPolicySetDetails
            policySet={selectedSet}
            snapshotPolicy={snapshotPoliciesById.get(selectedSet.snapshotPolicyId)}
            recoveryPolicy={recoveryPoliciesById.get(selectedSet.recoveryAppPolicyId)}
            cleanRoomPolicy={cleanRoomPoliciesById.get(selectedSet.cleanRoomPolicyId)}
            isLoading={snapshotQuery.isLoading || recoveryQuery.isLoading || cleanRoomQuery.isLoading}
            hasQueryError={Boolean(snapshotQuery.error ?? recoveryQuery.error ?? cleanRoomQuery.error)}
          />
        </div>
      ) : null}
    </div>
  )
}
