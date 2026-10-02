import { useMemo } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { resolveProviderTopology } from '../helpers/resolveProviderTopology'
import type { ProviderRecord } from '../model/providerTypes'

interface BackingStorageValueProps {
  providerId: string
  // Full provider list: backing storage ids are resolved against it by id.
  providers: readonly ProviderRecord[]
}

// Detail value for a compute provider's backing storage. Unknown ids and
// references that break the contract stay visible instead of being hidden.
export function BackingStorageValue({ providerId, providers }: BackingStorageValueProps) {
  const { t } = useTranslation()
  const relationships = useMemo(
    () => resolveProviderTopology(providers).backingStorage.filter(relationship => relationship.sourceId === providerId),
    [providers, providerId],
  )

  if (relationships.length === 0) return <>{t('details.backingStorageNone')}</>

  return (
    <ul className="space-y-0.5">
      {relationships.map((relationship, index) => (
        <li key={`${relationship.targetId}-${String(index)}`}>
          {relationship.target
            ? `${relationship.target.name} (${relationship.targetId})`
            : `${relationship.targetId} (${t('details.backingStorageUnavailable')})`}
          {relationship.status === 'mismatch' ? ` · ${t('details.relationshipMismatch')}` : null}
        </li>
      ))}
    </ul>
  )
}
