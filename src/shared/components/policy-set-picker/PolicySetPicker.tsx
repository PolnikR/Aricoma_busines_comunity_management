import { useMemo } from 'react'
import { useSnapshotPolicies } from '@/features/recovery-plans/recovery-policies/snapshot/hooks/useSnapshotPolicies'
import { useRecoveryAppPolicies } from '@/features/recovery-plans/recovery-policies/application-recovery/hooks/useRecoveryAppPolicies'
import { useCleanRoomPolicies } from '@/features/recovery-plans/recovery-policies/clean-room/hooks/useCleanRoomPolicies'
import type { PolicySet } from '@/features/recovery-plans/policy-sets/model/policySetTypes'
import { PolicySetPickerList } from './PolicySetPickerList'
import { PolicySetPickerDetails } from './PolicySetPickerDetails'

interface PolicySetPickerProps {
  policySets: PolicySet[]
  selectedPolicySetId: string | null
  onSelect: (policySetId: string) => void
}

// Shared search-list-plus-detail picker over PolicySet records, reused by any
// wizard step that needs to attach a policy set (recovery groups, recovery
// applications, ...). Resolves the selected set's snapshot/recovery/clean-room
// policies itself so callers only need to pass the list and selection state.
export function PolicySetPicker({
  policySets,
  selectedPolicySetId,
  onSelect,
}: PolicySetPickerProps) {
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
    <div className="flex h-full min-h-[480px] flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-sm lg:flex-row">
      <div className="min-h-64 w-full shrink-0 overflow-hidden lg:h-full lg:min-h-0 lg:w-96">
        <PolicySetPickerList
          policySets={policySets}
          selectedPolicySetId={selectedPolicySetId}
          recoveryPoliciesById={recoveryPoliciesById}
          onSelect={onSelect}
        />
      </div>

      {selectedSet ? (
        <div className="min-h-0 min-w-0 flex-1 overflow-auto border-t border-border lg:border-l lg:border-t-0">
          <PolicySetPickerDetails
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
