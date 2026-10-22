import { usePolicyCatalog } from '@/features/recovery-plans/recovery-policies/catalog/hooks/usePolicyCatalog'
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
  const catalog = usePolicyCatalog()
  const selectedSet = policySets.find(policySet => policySet.id === selectedPolicySetId) ?? null

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-sm lg:flex-row">
      <div className="min-h-0 w-full flex-1 overflow-hidden lg:h-full lg:w-96 lg:flex-none">
        <PolicySetPickerList
          policySets={policySets}
          selectedPolicySetId={selectedPolicySetId}
          resolveRecoveryPolicy={id => catalog.resolve('recoveryApp', id)}
          onSelect={onSelect}
        />
      </div>

      {selectedSet ? (
        <div className="min-h-0 min-w-0 flex-1 overflow-auto border-t border-border lg:border-l lg:border-t-0">
          <PolicySetPickerDetails
            policySet={selectedSet}
            references={catalog.resolvePolicySet(selectedSet)}
            sources={catalog.sources}
            onRetry={catalog.retry}
          />
        </div>
      ) : null}
    </div>
  )
}
