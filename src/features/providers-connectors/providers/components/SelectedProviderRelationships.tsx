import { useMemo } from 'react'
import { Badge } from '@/shared/components/badge/Badge'
import { SkeletonBlock } from '@/shared/components/data-table'
import {
  RelationshipChain,
  RelationshipConnector,
  RelationshipGraph,
  RelationshipGroup,
  RelationshipNode,
  RelationshipNote,
} from '@/shared/components/relationship-graph'
import { AlertTriangleIcon, ServerIcon, StorageIcon } from '@/shared/icons/Icons'
import { useTranslation } from '@/hooks/useTranslation'
import { buildSelectedProviderRelationships } from '../helpers/buildSelectedProviderRelationships'
import type { DrawnEdge, PartnerLane, RelationshipEnd } from '../helpers/buildSelectedProviderRelationships'
import { providerTypeLabel } from '../helpers/providerTypeLabel'
import { isComputeProviderType } from '../model/providerCategory'
import type { ProviderRecord } from '../model/providerTypes'

type Translate = ReturnType<typeof useTranslation>['t']

interface SelectedProviderRelationshipsProps {
  // The whole provider list; relationships are resolved against it.
  allProviders: readonly ProviderRecord[]
  selectedProviderId: string
  isLoading: boolean
  isError: boolean
}

function endName(end: RelationshipEnd) {
  return end.kind === 'provider' ? end.provider.name : end.providerId
}

// Screen-reader sentence listing every drawn relationship of one entity.
function describe(entityId: string, edges: readonly DrawnEdge[], names: ReadonlyMap<string, string>, t: Translate) {
  const parts = edges.flatMap(edge => {
    if (edge.from !== entityId && edge.to !== entityId) return []
    const outgoing = edge.from === entityId
    const other = names.get(outgoing ? edge.to : edge.from) ?? ''
    if (edge.kind === 'problem') return [`${t(`providers.relationships.sr.${edge.relation}Problem`)} ${other}`]
    if (edge.relation === 'backing') return [`${t(outgoing ? 'providers.relationships.sr.backing' : 'providers.relationships.sr.backs')} ${other}`]
    if (edge.direction === 'both') return [`${t('providers.relationships.sr.mutualPartner')} ${other}`]
    const declaredByThis = (edge.direction === 'forward') === outgoing
    return [`${t(declaredByThis ? 'providers.relationships.sr.partnerOf' : 'providers.relationships.sr.partneredBy')} ${other}`]
  })
  return parts.length > 0 ? parts.join(', ') : t('providers.relationships.sr.none')
}

function connectorLabel(edge: DrawnEdge, t: Translate) {
  if (edge.status !== 'resolved') return t(edge.status === 'unresolved' ? 'providers.relationships.unavailable' : 'providers.relationships.mismatch')
  return t(edge.relation === 'backing' ? 'providers.relationships.backingStorage' : 'providers.relationships.partner')
}

// The selected provider's direct relationships, drawn as left-to-right chains:
// compute → backing storage → storage ↔ partner. Unrelated providers are not shown.
export function SelectedProviderRelationships({ allProviders, selectedProviderId, isLoading, isError }: SelectedProviderRelationshipsProps) {
  const { t } = useTranslation()
  const relationships = useMemo(
    () => buildSelectedProviderRelationships(allProviders, selectedProviderId),
    [allProviders, selectedProviderId],
  )

  const body = (() => {
    if (isLoading) {
      return (
        <div className="space-y-2" aria-busy="true">
          <SkeletonBlock className="h-16 w-full rounded-xl" />
          <SkeletonBlock className="h-16 w-full rounded-xl" />
        </div>
      )
    }
    if (isError) return <p className="text-text-muted">{t('providers.relationships.loadError')}</p>
    if (relationships.kind === 'missing') return <p className="text-text-muted">{t('providers.relationships.missing')}</p>
    return <RelationshipChains relationships={relationships} />
  })()

  return (
    <section>
      <h4 className="font-semibold text-text-primary">{t('providers.relationships.title')}</h4>
      <p>{t('providers.relationships.intro.compute')}</p>
      <p>{t('providers.relationships.intro.partner')}</p>
      <p className="text-text-muted">{t('providers.relationships.intro.source')}</p>
      <div className="mt-3">{body}</div>
    </section>
  )
}

type Resolved = Exclude<ReturnType<typeof buildSelectedProviderRelationships>, { kind: 'missing' }>

function RelationshipChains({ relationships }: { relationships: Resolved }) {
  const { t } = useTranslation()
  const { selected, edges } = relationships
  const names = useMemo(() => {
    const ends: RelationshipEnd[] = relationships.kind === 'compute'
      ? [selected, ...relationships.backing.flatMap(row => [row.storage, ...row.partners.map(lane => lane.other)]), ...relationships.partners.map(lane => lane.other)]
      : [selected, ...relationships.consumers.map(row => row.consumer), ...relationships.partners.map(lane => lane.other)]
    return new Map(ends.map(item => [item.entityId, endName(item)]))
  }, [relationships, selected])

  const node = (item: RelationshipEnd, isSelected = false) => (
    <EndNode item={item} isSelected={isSelected} description={describe(item.entityId, edges, names, t)} />
  )
  const connector = (edge: DrawnEdge) => (
    <RelationshipConnector
      from={edge.from}
      to={edge.to}
      kind={edge.kind}
      direction={edge.direction}
      label={connectorLabel(edge, t)}
    />
  )
  const partnerTail = (lane: PartnerLane) => <>{connector(lane.edge)}{node(lane.other)}</>

  if (relationships.kind === 'compute') {
    const rows = relationships.backing.flatMap(row => (row.partners.length > 0 ? row.partners : [null]).map((lane, index) => (
      <RelationshipChain key={`${row.edge.to}-${String(index)}`}>
        {node(selected, true)}
        {connector(row.edge)}
        {node(row.storage)}
        {lane ? partnerTail(lane) : null}
      </RelationshipChain>
    )))
    const ownPartners = relationships.partners.map(lane => (
      <RelationshipChain key={`partner-${lane.edge.to}`}>
        {node(selected, true)}
        {partnerTail(lane)}
      </RelationshipChain>
    ))
    return (
      <RelationshipGraph edges={edges}>
        <RelationshipGroup title={t('providers.relationships.chain.compute')}>
          {rows.length + ownPartners.length > 0 ? <>{rows}{ownPartners}</> : (
            <RelationshipChain>
              {node(selected, true)}
              <RelationshipNote span={4}>{t('providers.relationships.noBackingRelationships')}</RelationshipNote>
            </RelationshipChain>
          )}
        </RelationshipGroup>
      </RelationshipGraph>
    )
  }

  const { consumers, partners, partnerSupported } = relationships
  // Selected storage always sits in the middle column, so the rows line up.
  const tails = partners.length > 0 ? partners : [null]
  const tail = (lane: PartnerLane | null) => {
    if (lane) return partnerTail(lane)
    return partnerSupported ? <RelationshipNote span={2}>{t('providers.relationships.noPartner')}</RelationshipNote> : null
  }
  const rows = (consumers.length > 0 ? consumers : [null]).flatMap(row => tails.map((lane, index) => (
    <RelationshipChain key={`${row?.edge.from ?? 'none'}-${String(index)}`}>
      {row ? <>{node(row.consumer)}{connector(row.edge)}</> : <><RelationshipNote>{t('providers.relationships.notUsedAsBacking')}</RelationshipNote><span aria-hidden="true" /></>}
      {node(selected, true)}
      {tail(lane)}
    </RelationshipChain>
  )))
  return (
    <RelationshipGraph edges={edges}>
      <RelationshipGroup title={t('providers.relationships.chain.storage')}>{rows}</RelationshipGroup>
    </RelationshipGraph>
  )
}

function EndNode({ item, isSelected, description }: { item: RelationshipEnd; isSelected: boolean; description: string }) {
  const { t } = useTranslation()
  if (item.kind === 'problem') {
    const hint = item.status === 'unresolved' || !item.provider
      ? t('providers.relationships.unavailableHint')
      : t('providers.relationships.wrongType', { type: providerTypeLabel(item.provider.type) })
    return (
      <RelationshipNode
        entityId={item.entityId}
        icon={AlertTriangleIcon}
        tone="problem"
        name={item.providerId}
        description={description}
        meta={<>
          <Badge color="error" size="sm">{t(item.status === 'unresolved' ? 'providers.relationships.unavailable' : 'providers.relationships.mismatch')}</Badge>
          <span>{hint}</span>
        </>}
      />
    )
  }
  const { provider } = item
  const compute = isComputeProviderType(provider.type)
  return (
    <RelationshipNode
      entityId={item.entityId}
      icon={compute ? ServerIcon : StorageIcon}
      tone={compute ? 'compute' : 'storage'}
      name={provider.name}
      monoId={provider.id}
      description={description}
      meta={<>
        <span>{providerTypeLabel(provider.type)}</span>
        <Badge color={provider.role === 'target' ? 'warning' : 'success'} size="sm">{t(`forms.role.${provider.role}`)}</Badge>
        {isSelected ? <Badge color="light" size="sm">{t('providers.relationships.selected')}</Badge> : null}
      </>}
    />
  )
}
