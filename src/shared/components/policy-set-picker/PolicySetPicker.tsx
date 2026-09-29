import { useMemo } from 'react'
import { useGetPolicies } from '@/generated/query/snapshot-policies/snapshot-policies.gen'
import { selectSnapshotPolicies } from '@/features/recovery-plans/recovery-policies/snapshot/model/selectSnapshotPolicies'
import { useGetRecoveryAppPolicies } from '@/generated/query/recovery-app-policies/recovery-app-policies.gen'
import { selectRecoveryAppPolicies } from '@/features/recovery-plans/recovery-policies/application-recovery/model/selectRecoveryAppPolicies'
import { useGetCleanRoomPolicies } from '@/generated/query/clean-room-policies/clean-room-policies.gen'
import { selectCleanRoomPolicies } from '@/features/recovery-plans/recovery-policies/clean-room/model/selectCleanRoomPolicies'
import type { PolicySetRecordOutput } from '@/generated/query/zod'
import { PolicySetPickerList } from './PolicySetPickerList'
import { PolicySetPickerDetails } from './PolicySetPickerDetails'

interface PolicySetPickerProps {
  policySets: PolicySetRecordOutput[]
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
  const snapshotQuery = useGetPolicies({ query: { select: selectSnapshotPolicies } })
  const recoveryQuery = useGetRecoveryAppPolicies({ query: { select: selectRecoveryAppPolicies } })
  const cleanRoomQuery = useGetCleanRoomPolicies({ query: { select: selectCleanRoomPolicies } })
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
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-sm lg:flex-row">
      <div className="min-h-0 w-full flex-1 overflow-hidden lg:h-full lg:w-96 lg:flex-none">
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
            snapshotPolicy={snapshotPoliciesById.get(selectedSet.snapshot_policy_id ?? '')}
            recoveryPolicy={recoveryPoliciesById.get(selectedSet.recovery_app_policy_id ?? '')}
            cleanRoomPolicy={cleanRoomPoliciesById.get(selectedSet.clean_room_policy_id ?? '')}
            isLoading={snapshotQuery.isLoading || recoveryQuery.isLoading || cleanRoomQuery.isLoading}
            hasQueryError={Boolean(snapshotQuery.error ?? recoveryQuery.error ?? cleanRoomQuery.error)}
          />
        </div>
      ) : null}
    </div>
  )
}
