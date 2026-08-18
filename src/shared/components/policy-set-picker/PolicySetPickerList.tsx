import { useMemo, useState } from 'react'
import { Input } from '@/shared/components/form/FormControls'
import { useTranslation } from '@/hooks/useTranslation'
import type { PolicySet } from '@/features/recovery-plans/policy-sets/model/policySetTypes'

interface PolicySetPickerListProps {
  policySets: PolicySet[]
  selectedPolicySetId: string | null
  recoveryPoliciesById: Map<string, { name: string }>
  onSelect: (policySetId: string) => void
}

export function PolicySetPickerList({
  policySets,
  selectedPolicySetId,
  recoveryPoliciesById,
  onSelect,
}: PolicySetPickerListProps) {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')

  const filteredSets = useMemo(() => {
    const term = search.toLowerCase()
    return policySets.filter(set => {
      const matchesName = set.name.toLowerCase().includes(term)
      const matchesDescription = set.description.toLowerCase().includes(term)
      const recoveryPolicyName = recoveryPoliciesById.get(set.recoveryAppPolicyId)?.name ?? ''
      const matchesPolicy = recoveryPolicyName.toLowerCase().includes(term)
      return matchesName || matchesDescription || matchesPolicy
    })
  }, [policySets, search, recoveryPoliciesById])

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden border-r border-border bg-surface">
      <div className="shrink-0 border-b border-border p-4">
        <Input
          type="search"
          aria-label={t('policySets.searchLabel')}
          placeholder={t('policySets.searchPlaceholder')}
          value={search}
          onChange={(event) => { setSearch(event.target.value) }}
          className="text-sm"
        />
      </div>

      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto">
        {filteredSets.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-center text-sm text-text-muted">
            {search ? t('policySets.noMatches') : ''}
          </div>
        ) : (
          <div className="divide-y divide-border-soft">
            {filteredSets.map(policySet => {
              const isSelected = policySet.id === selectedPolicySetId
              const recoveryPolicyName = recoveryPoliciesById.get(policySet.recoveryAppPolicyId)?.name ?? policySet.recoveryAppPolicyId
              return (
                <button
                  key={policySet.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => { onSelect(policySet.id) }}
                  className={`w-full px-4 py-3 text-left transition-colors ${
                    isSelected
                      ? 'border-l-3 border-l-accent bg-accent-soft'
                      : 'hover:bg-surface-muted'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-border">
                      {isSelected && <div className="h-2 w-2 rounded-full bg-accent" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-text-primary">{policySet.name}</div>
                      <div className="mt-0.5 text-xs text-text-muted">{recoveryPolicyName}</div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
