import { Fragment, useMemo } from 'react'
import type { ReactNode } from 'react'
import {
  RelationshipChain,
  RelationshipConnector,
  RelationshipGraph,
  RelationshipGroup,
  RelationshipNode,
  RelationshipNote,
} from '@/shared/components/relationship-graph'
import { AlertTriangleIcon, CopyIcon, DiskIcon, GridIcon, LayersIcon, ServerIcon, StorageIcon } from '@/shared/icons/Icons'
import { useTranslation } from '@/hooks/useTranslation'
import { providerTypeLabel } from '@/features/providers-connectors/providers/helpers/providerTypeLabel'
import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import type { PartnerLane } from '@/features/providers-connectors/providers/helpers/buildSelectedProviderRelationships'
import { buildFlashVolumeRelationships } from '../../helpers/buildFlashVolumeRelationships'
import type { FlashVolumeEdge } from '../../helpers/buildFlashVolumeRelationships'
import type { FlashSystemVolumeResource } from '../../model/discoveryTypes'

type Translate = ReturnType<typeof useTranslation>['t']

const SR_KEYS: Record<FlashVolumeEdge['relation'], { out: string; in: string }> = {
  contains: { out: 'resources.relationships.sr.contains', in: 'resources.relationships.sr.containedIn' },
  mappedTo: { out: 'resources.relationships.sr.mappedTo', in: 'resources.relationships.sr.mapsVolume' },
  memberOf: { out: 'resources.relationships.sr.memberOf', in: 'resources.relationships.sr.hasMember' },
  flashCopy: { out: 'resources.relationships.sr.hasFlashCopy', in: 'resources.relationships.sr.flashCopyOf' },
  remoteCopy: { out: 'resources.relationships.sr.hasRemoteCopy', in: 'resources.relationships.sr.remoteCopyOf' },
  partner: { out: 'resources.relationships.sr.partner', in: 'resources.relationships.sr.partner' },
}

function describe(entityId: string, edges: readonly FlashVolumeEdge[], names: ReadonlyMap<string, string>, t: Translate) {
  const parts = edges.flatMap(edge => {
    if (edge.from !== entityId && edge.to !== entityId) return []
    const outgoing = edge.from === entityId
    return [`${t(SR_KEYS[edge.relation][outgoing ? 'out' : 'in'])} ${names.get(outgoing ? edge.to : edge.from) ?? ''}`]
  })
  return parts.length > 0 ? parts.join(', ') : t('resources.relationships.sr.none')
}

const joined = (...values: string[]) => values.filter(Boolean).join(' · ')

interface FlashVolumeRelationshipHelpProps {
  volume: FlashSystemVolumeResource
  // The whole provider list, to name the FlashSystem and its configured partner.
  allProviders: readonly ProviderRecord[]
}

// Contextual relationships of one FlashSystem volume, only from data the volume
// reports: placement, host mappings, consistency groups, FlashCopy and Remote Copy.
// The provider-level partner is shown apart, as configuration, not replication.
export function FlashVolumeRelationshipHelp({ volume, allProviders }: FlashVolumeRelationshipHelpProps) {
  const { t } = useTranslation()
  const model = useMemo(() => buildFlashVolumeRelationships(volume, allProviders), [volume, allProviders])
  const { provider, pool, hosts, consistencyGroups, flashCopy, remoteCopy, partners, edges } = model
  const providerName = provider.provider?.name ?? provider.providerId

  const names = useMemo(() => new Map<string, string>([
    [provider.entityId, providerName],
    [model.volume.entityId, model.volume.name],
    ...(pool ? [[pool.entityId, pool.name] as [string, string]] : []),
    ...hosts.map(host => [host.entityId, host.name] as [string, string]),
    ...consistencyGroups.map(group => [group.entityId, group.name] as [string, string]),
    ...(flashCopy ? [[flashCopy.entityId, t('resources.relationships.flashCopy.name')] as [string, string]] : []),
    ...(remoteCopy ? [[remoteCopy.entityId, remoteCopy.rcName || remoteCopy.rcId] as [string, string]] : []),
    ...partners.map(lane => [lane.other.entityId, lane.other.kind === 'provider' ? lane.other.provider.name : lane.other.providerId] as [string, string]),
  ]), [model, provider, providerName, pool, hosts, consistencyGroups, flashCopy, remoteCopy, partners, t])
  const description = (entityId: string) => describe(entityId, edges, names, t)

  const providerNode = (
    <RelationshipNode
      entityId={provider.entityId}
      icon={StorageIcon}
      tone="storage"
      name={providerName}
      meta={provider.provider ? <span>{providerTypeLabel(provider.provider.type)}</span> : null}
      monoId={provider.providerId}
      description={description(provider.entityId)}
    />
  )
  const volumeNode = (
    <RelationshipNode
      entityId={model.volume.entityId}
      icon={DiskIcon}
      tone="storage"
      name={model.volume.name}
      meta={<span>{joined(t('resources.relationships.volumeId', { id: model.volume.volumeId }), model.volume.capacity, model.volume.status)}</span>}
      monoId={model.volume.uid}
      description={description(model.volume.entityId)}
    />
  )
  const edge = (from: string, to: string, labelKey: string) => (
    <RelationshipConnector from={from} to={to} kind="neutral" label={t(labelKey)} />
  )
  // Parts are in a fixed order, so their position is a stable key.
  const chain = (key: string, ...parts: ReactNode[]) => (
    <RelationshipChain key={key}>{parts.map((part, index) => <Fragment key={index}>{part}</Fragment>)}</RelationshipChain>
  )

  return (
    <section>
      <h4 className="font-semibold text-text-primary">{t('resources.relationships.title')}</h4>
      <div className="mt-2">
        <RelationshipGraph edges={edges}>
          <RelationshipGroup title={t('resources.relationships.flash.placement')}>
            {pool ? chain('placement',
              providerNode,
              edge(provider.entityId, pool.entityId, 'resources.relationships.edge.contains'),
              <RelationshipNode entityId={pool.entityId} icon={LayersIcon} tone="infrastructure" name={pool.name} meta={pool.capacity ? <span>{pool.capacity}</span> : null} description={description(pool.entityId)} />,
              edge(pool.entityId, model.volume.entityId, 'resources.relationships.edge.contains'),
              volumeNode,
            ) : chain('placement',
              providerNode,
              edge(provider.entityId, model.volume.entityId, 'resources.relationships.edge.contains'),
              volumeNode,
            )}
          </RelationshipGroup>
          <RelationshipGroup title={t('resources.relationships.flash.hosts')}>
            {hosts.length > 0 ? hosts.map(host => chain(host.entityId,
              volumeNode,
              edge(model.volume.entityId, host.entityId, 'resources.relationships.edge.mappedTo'),
              <RelationshipNode entityId={host.entityId} icon={ServerIcon} tone="infrastructure" name={host.name} meta={<span>{joined(host.clusterName, t('resources.relationships.flash.scsiId', { id: host.scsiId }))}</span>} description={description(host.entityId)} />,
            )) : chain('no-hosts', volumeNode, <RelationshipNote span={4}>{t('resources.relationships.flash.noHosts')}</RelationshipNote>)}
          </RelationshipGroup>
          {consistencyGroups.length > 0 ? (
            <RelationshipGroup title={t('resources.relationships.flash.consistencyGroups')}>
              {consistencyGroups.map(group => chain(group.entityId,
                volumeNode,
                edge(model.volume.entityId, group.entityId, 'resources.relationships.edge.memberOf'),
                <RelationshipNode entityId={group.entityId} icon={GridIcon} tone="protection" name={group.name} meta={group.status ? <span>{group.status}</span> : null} description={description(group.entityId)} />,
              ))}
            </RelationshipGroup>
          ) : null}
          <RelationshipGroup title={t('resources.relationships.flash.copies')}>
            {flashCopy ? chain(flashCopy.entityId,
              volumeNode,
              edge(model.volume.entityId, flashCopy.entityId, 'resources.relationships.edge.flashCopy'),
              <RelationshipNode entityId={flashCopy.entityId} icon={CopyIcon} tone="protection" name={t('resources.relationships.flashCopy.name')} meta={<span>{joined(t('resources.relationships.flash.mappings', { count: flashCopy.mapCount }), flashCopy.fcName)}</span>} monoId={flashCopy.fcId} description={description(flashCopy.entityId)} />,
            ) : null}
            {remoteCopy ? chain(remoteCopy.entityId,
              volumeNode,
              edge(model.volume.entityId, remoteCopy.entityId, 'resources.relationships.edge.remoteCopy'),
              <RelationshipNode entityId={remoteCopy.entityId} icon={CopyIcon} tone="protection" name={remoteCopy.rcName || t('resources.relationships.flash.remoteCopy')} meta={<span>{t('resources.relationships.flash.remoteCopyTarget')}</span>} monoId={remoteCopy.rcId} description={description(remoteCopy.entityId)} />,
            ) : null}
            {!flashCopy && !remoteCopy ? chain('no-copies', volumeNode, <RelationshipNote span={4}>{t('resources.relationships.flash.noCopies')}</RelationshipNote>) : null}
          </RelationshipGroup>
          {partners.length > 0 ? (
            <RelationshipGroup title={t('resources.relationships.flash.partnership')}>
              {partners.map(lane => <PartnerRow key={lane.other.entityId} lane={lane} providerNode={providerNode} description={description} />)}
            </RelationshipGroup>
          ) : null}
        </RelationshipGraph>
      </div>
      {partners.length > 0 ? <p className="mt-2 text-text-muted">{t('resources.relationships.flash.partnerNote')}</p> : null}
    </section>
  )
}

function PartnerRow({ lane, providerNode, description }: { lane: PartnerLane; providerNode: ReactNode; description: (entityId: string) => string }) {
  const { t } = useTranslation()
  const { other, edge } = lane
  return (
    <RelationshipChain>
      {providerNode}
      <RelationshipConnector from={edge.from} to={edge.to} kind={edge.kind} direction={edge.direction} label={t('resources.relationships.edge.partner')} />
      {other.kind === 'provider' ? (
        <RelationshipNode entityId={other.entityId} icon={StorageIcon} tone="storage" name={other.provider.name} monoId={other.provider.id} description={description(other.entityId)} />
      ) : (
        <RelationshipNode entityId={other.entityId} icon={AlertTriangleIcon} tone="problem" name={other.providerId} meta={<span>{t(other.status === 'unresolved' ? 'providers.relationships.unavailable' : 'providers.relationships.mismatch')}</span>} description={description(other.entityId)} />
      )}
    </RelationshipChain>
  )
}
