import { useMemo } from 'react'
import type { ReactNode } from 'react'
import {
  RelationshipChain,
  RelationshipConnector,
  RelationshipGraph,
  RelationshipGroup,
  RelationshipNode,
  RelationshipNote,
} from '@/shared/components/relationship-graph'
import { CopyIcon, CpuIcon, DiskIcon, ServerIcon } from '@/shared/icons/Icons'
import { useTranslation } from '@/hooks/useTranslation'
import { providerTypeLabel } from '@/features/providers-connectors/providers/helpers/providerTypeLabel'
import type { StorageVolume } from '../model/vmStorageVolumesTypes'
import type { ProviderEnd, WorkloadEdge, WorkloadRelationships } from '../helpers/workloadRelationships'

type Translate = ReturnType<typeof useTranslation>['t']

const SR_KEYS: Record<WorkloadEdge['relation'], { out: string; in: string }> = {
  discovers: { out: 'resources.relationships.sr.discovers', in: 'resources.relationships.sr.discoveredFrom' },
  backing: { out: 'resources.relationships.sr.backedBy', in: 'resources.relationships.sr.backs' },
  flashCopy: { out: 'resources.relationships.sr.hasFlashCopy', in: 'resources.relationships.sr.flashCopyOf' },
}

// Screen-reader sentence listing every drawn relationship of one entity.
function describe(entityId: string, edges: readonly WorkloadEdge[], names: ReadonlyMap<string, string>, t: Translate) {
  const parts = edges.flatMap(edge => {
    if (edge.from !== entityId && edge.to !== entityId) return []
    const outgoing = edge.from === entityId
    return [`${t(SR_KEYS[edge.relation][outgoing ? 'out' : 'in'])} ${names.get(outgoing ? edge.to : edge.from) ?? ''}`]
  })
  return parts.length > 0 ? parts.join(', ') : t('resources.relationships.sr.none')
}

const providerName = (end: ProviderEnd) => end.provider?.name ?? (end.providerId || '-')
const volumeName = (volume: StorageVolume) => volume.volumeName || volume.name || volume.id

interface WorkloadRelationshipGraphProps {
  relationships: WorkloadRelationships<{ name: string }>
  // Facts under the workload name, e.g. power state and disk count.
  workloadMeta: ReactNode
  // Label of the workload → volume edge, naming how the volume was resolved.
  backingLabel: string
  // How a volume is identified for this workload type (NAA for VMware, Volume ID/UID for IBM Power).
  volumeIdentity: (volume: StorageVolume) => { meta: ReactNode; monoId: string }
  isLoading: boolean
  isError: boolean
  emptyText: string
  // How the backing volumes were resolved and what the lookup does not report.
  resolutionNote: string
}

// Contextual relationships of one compute workload (VM or LPAR): where it was
// discovered and which storage volumes back it, with their FlashCopy mappings.
export function WorkloadRelationshipGraph({
  relationships, workloadMeta, backingLabel, volumeIdentity, isLoading, isError, emptyText, resolutionNote,
}: WorkloadRelationshipGraphProps) {
  const { t } = useTranslation()
  const { computeProvider, workload, groups, edges } = relationships
  const names = useMemo(() => new Map<string, string>([
    [computeProvider.entityId, providerName(computeProvider)],
    [workload.entityId, workload.name],
    ...groups.flatMap(group => group.rows.flatMap(row => [
      [row.entityId, volumeName(row.volume)] as [string, string],
      ...(row.flashCopy ? [[row.flashCopy.entityId, t('resources.relationships.flashCopy.name')] as [string, string]] : []),
    ])),
  ]), [computeProvider, workload, groups, t])
  const description = (entityId: string) => describe(entityId, edges, names, t)

  const workloadNode = (
    <RelationshipNode entityId={workload.entityId} icon={CpuIcon} tone="compute" name={workload.name} meta={workloadMeta} description={description(workload.entityId)} />
  )

  const backingState = isLoading
    ? t('resources.backingStorage.loading')
    : isError ? t('resources.common.loadFailed') : groups.length === 0 ? emptyText : null

  return (
    <section>
      <h4 className="font-semibold text-text-primary">{t('resources.relationships.title')}</h4>
      <div className="mt-2">
        <RelationshipGraph edges={edges}>
          <RelationshipGroup title={t('resources.relationships.discoveredFrom')}>
            <RelationshipChain>
              <RelationshipNode
                entityId={computeProvider.entityId}
                icon={ServerIcon}
                tone="compute"
                name={providerName(computeProvider)}
                meta={computeProvider.provider ? <span>{providerTypeLabel(computeProvider.provider.type)}</span> : null}
                monoId={computeProvider.providerId}
                description={description(computeProvider.entityId)}
              />
              <RelationshipConnector from={computeProvider.entityId} to={workload.entityId} kind="neutral" label={t('resources.relationships.edge.discovers')} />
              {workloadNode}
            </RelationshipChain>
          </RelationshipGroup>
          {backingState !== null ? (
            <RelationshipGroup title={t('resources.relationships.backingStorage')}>
              <RelationshipChain>
                {workloadNode}
                <RelationshipNote span={4}>{backingState}</RelationshipNote>
              </RelationshipChain>
            </RelationshipGroup>
          ) : groups.map(group => (
            <RelationshipGroup key={group.storage.entityId} title={t('resources.relationships.backingOn', { provider: providerName(group.storage) })}>
              {group.rows.map(row => {
                const identity = volumeIdentity(row.volume)
                return (
                  <RelationshipChain key={row.entityId}>
                    {workloadNode}
                    <RelationshipConnector from={workload.entityId} to={row.entityId} kind="backing" label={backingLabel} />
                    <RelationshipNode
                      entityId={row.entityId}
                      icon={DiskIcon}
                      tone="storage"
                      name={volumeName(row.volume)}
                      meta={<>{identity.meta}<span>{[row.volume.capacity, row.volume.status].filter(Boolean).join(' · ')}</span></>}
                      monoId={identity.monoId}
                      description={description(row.entityId)}
                    />
                    {row.flashCopy ? (
                      <>
                        <RelationshipConnector from={row.entityId} to={row.flashCopy.entityId} kind="neutral" label={t('resources.relationships.edge.flashCopy')} />
                        <RelationshipNode
                          entityId={row.flashCopy.entityId}
                          icon={CopyIcon}
                          tone="protection"
                          name={t('resources.relationships.flashCopy.name')}
                          meta={<span>{t('resources.relationships.flashCopy.snapshots', { count: row.flashCopy.snapshotCount })}</span>}
                          description={description(row.flashCopy.entityId)}
                        >
                          <ul className="mt-1 space-y-0.5 text-[11px] text-text-muted">
                            {row.flashCopy.targets.map((name, index) => <li key={`t-${String(index)}`} className="truncate">→ {name}</li>)}
                            {row.flashCopy.sources.map((name, index) => <li key={`s-${String(index)}`} className="truncate">← {name}</li>)}
                          </ul>
                        </RelationshipNode>
                      </>
                    ) : (
                      <RelationshipNote span={2}>{t('resources.backingStorage.noMappings')}</RelationshipNote>
                    )}
                  </RelationshipChain>
                )
              })}
            </RelationshipGroup>
          ))}
        </RelationshipGraph>
      </div>
      <p className="mt-2 text-text-muted">{resolutionNote}</p>
    </section>
  )
}
