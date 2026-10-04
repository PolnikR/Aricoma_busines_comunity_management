import { useId, useMemo } from 'react'
import { SkeletonBlock } from '@/shared/components/data-table'
import { useTranslation } from '@/hooks/useTranslation'
import { providerTypeLabel } from '../helpers/providerTypeLabel'
import { resolveProviderTopology } from '../helpers/resolveProviderTopology'
import { buildRelationshipRows } from '../helpers/buildRelationshipRows'
import type { PartnerLink, RelationshipTarget } from '../helpers/buildRelationshipRows'
import type { ProviderRecord } from '../model/providerTypes'
import {
  MismatchPill,
  ProviderRelationshipCard,
  RelationshipConnector,
  UnavailableProviderCard,
} from './ProviderRelationshipParts'

interface ProviderRelationshipsContentProps {
  // The whole provider list: the rows show the full topology, not one provider.
  providers: readonly ProviderRecord[]
  isLoading: boolean
  isError: boolean
}

const ROW_COLUMNS = 'grid grid-cols-1 @min-[47.5rem]/relationships:grid-cols-[12.5rem_7rem_minmax(0,1fr)] @min-[47.5rem]/relationships:items-start'
const TARGET_COLUMNS = 'grid min-w-0 grid-cols-1 @min-[47.5rem]/relationships:items-center'
const listClass = 'divide-y divide-border rounded-xl border border-border'
const groupTitleClass = 'mb-1.5 text-[11px] font-semibold tracking-wider text-text-muted uppercase'

// Explains the provider relationship model and shows the current relationships,
// read left to right: compute → backing storage → storage ↔ partner ↔ storage.
export function ProviderRelationshipsContent({ providers, isLoading, isError }: ProviderRelationshipsContentProps) {
  const { t } = useTranslation()
  const rows = useMemo(() => buildRelationshipRows(resolveProviderTopology(providers)), [providers])
  const computeTitleId = useId()
  const otherTitleId = useId()

  return (
    <section className="@container/relationships">
      <h4 className="font-semibold text-text-primary">{t('providers.relationships.title')}</h4>
      <p>{t('providers.relationships.intro.compute')}</p>
      <p>{t('providers.relationships.intro.partner')}</p>
      <p className="text-text-muted">{t('providers.relationships.intro.source')}</p>
      <p className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-text-muted">
        <span>
          {t('providers.relationships.legend.compute')}{' '}
          <b className="font-semibold text-accent">→ {t('providers.relationships.backingStorage')} →</b>{' '}
          {t('providers.relationships.legend.storage')}
        </span>
        <span>
          {t('providers.relationships.legend.storage')}{' '}
          <b className="font-semibold text-warning-600 dark:text-orange-400">↔ {t('providers.relationships.partner')} ↔</b>{' '}
          {t('providers.relationships.legend.storage')}
        </span>
      </p>
      <div className="mt-3">
        {isLoading ? (
          <div className="space-y-2" aria-busy="true">
            <SkeletonBlock className="h-16 w-full rounded-xl" />
            <SkeletonBlock className="h-16 w-full rounded-xl" />
          </div>
        ) : isError ? (
          <p className="text-text-muted">{t('providers.relationships.loadError')}</p>
        ) : rows.computeRows.length === 0 && rows.otherStorageRows.length === 0 ? (
          <p className="text-text-muted">{t('providers.relationships.empty')}</p>
        ) : (
          <>
            {rows.computeRows.length > 0 ? (
              <>
                <h5 id={computeTitleId} className={groupTitleClass}>{t('providers.relationships.computeProviders')}</h5>
                <ul aria-labelledby={computeTitleId} className={listClass}>
                  {rows.computeRows.map(row => (
                    <li key={row.provider.id} className={`${ROW_COLUMNS} px-2.5 py-2`}>
                      <ProviderRelationshipCard provider={row.provider} />
                      {row.targets.length === 0 ? (
                        <p className={`pt-1 text-text-subtle italic @min-[47.5rem]/relationships:col-span-2 @min-[47.5rem]/relationships:self-center @min-[47.5rem]/relationships:pt-0 @min-[47.5rem]/relationships:pl-1`}>
                          {t('providers.relationships.noBacking')}
                        </p>
                      ) : (
                        <>
                          <RelationshipConnector kind="backing" />
                          <div className="flex min-w-0 flex-col gap-1.5">
                            {row.targets.map((target, index) => (
                              <BackingTarget key={`${target.relationship.targetId}-${String(index)}`} target={target} />
                            ))}
                          </div>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
            {rows.otherStorageRows.length > 0 ? (
              <>
                <h5 id={otherTitleId} className={`${groupTitleClass} mt-3`}>{t('providers.relationships.otherStorage')}</h5>
                <ul aria-labelledby={otherTitleId} className={listClass}>
                  {rows.otherStorageRows.map(row => (
                    <li key={`${row.provider.id}-${row.partner.otherId}`} className="px-2.5 py-2">
                      <div className={`${TARGET_COLUMNS} @min-[47.5rem]/relationships:grid-cols-[12.5rem_5.75rem_minmax(0,12.5rem)]`}>
                        <ProviderRelationshipCard provider={row.provider} />
                        <PartnerPart partner={row.partner} />
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </>
        )}
      </div>
    </section>
  )
}

function BackingTarget({ target }: { target: RelationshipTarget }) {
  const { t } = useTranslation()
  const { relationship, partner } = target

  if (!relationship.target) {
    return <div className={`${TARGET_COLUMNS} @min-[47.5rem]/relationships:grid-cols-[12.5rem]`}><UnavailableProviderCard id={relationship.targetId} /></div>
  }
  if (relationship.status === 'mismatch') {
    return (
      <div className={`${TARGET_COLUMNS} @min-[47.5rem]/relationships:grid-cols-[12.5rem_auto]`}>
        <ProviderRelationshipCard provider={relationship.target} />
        <span className={`flex items-center gap-1.5 pt-1 text-text-muted @min-[47.5rem]/relationships:pt-0 @min-[47.5rem]/relationships:pl-2`}>
          <MismatchPill />
          {t('providers.relationships.notStorage', { type: providerTypeLabel(relationship.target.type) })}
        </span>
      </div>
    )
  }
  if (!partner) {
    return <div className={`${TARGET_COLUMNS} @min-[47.5rem]/relationships:grid-cols-[12.5rem]`}><ProviderRelationshipCard provider={relationship.target} /></div>
  }
  return (
    <div className={`${TARGET_COLUMNS} @min-[47.5rem]/relationships:grid-cols-[12.5rem_5.75rem_minmax(0,12.5rem)]`}>
      <ProviderRelationshipCard provider={relationship.target} />
      <PartnerPart partner={partner} />
    </div>
  )
}

// Always connector + full card, so every row reads on its own.
function PartnerPart({ partner }: { partner: PartnerLink }) {
  return (
    <>
      <RelationshipConnector kind="partner" direction={partner.direction} mismatch={partner.relationship.status === 'mismatch'} />
      {partner.other ? <ProviderRelationshipCard provider={partner.other} /> : <UnavailableProviderCard id={partner.otherId} />}
    </>
  )
}
