import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  RelationshipChain,
  RelationshipConnector,
  RelationshipGraph,
  RelationshipGroup,
  RelationshipLanes,
  RelationshipNode,
  RelationshipNote,
} from '@/shared/components/relationship-graph'
import { Pagination } from '@/shared/components/pagination/Pagination'
import { AlertTriangleIcon, CopyIcon, DiskIcon } from '@/shared/icons/Icons'
import { useTranslation } from '@/hooks/useTranslation'
import { countLabel } from '../helpers/countLabel'
import { formatMetroMirrorState, metroMirrorSideLabel, presentMetroMirrorMapping } from '../helpers/metroMirrorPresentation'
import type { InventoryVolumeOutput, MetroMirrorMappingPresentation, MetroMirrorStatusOutput, MetroMirrorTone } from '../helpers/metroMirrorPresentation'

const PAGE_SIZE = 5

const STATE_TEXT: Record<MetroMirrorTone, string> = {
  success: 'text-success-600 dark:text-success-500',
  info: 'text-blue-light-500',
  warning: 'text-warning-600 dark:text-orange-400',
  error: 'text-error-600 dark:text-error-500',
  neutral: 'text-text-secondary',
}

const auxEntity = (name: string) => `aux:${name}`

interface RecoveryGroupReplicationChainProps {
  metroMirror: MetroMirrorStatusOutput
  volumes: Record<string, InventoryVolumeOutput>
  // Auxiliary volume highlighted from the inventory list below, if any.
  activeAuxiliary: string | null
  // Auxiliary volume of the row the user hovers or focuses in the chain.
  onActiveAuxiliaryChange: (auxiliary: string | null) => void
  // Reveal the auxiliary volume in the inventory list.
  onReveal: (auxiliary: string) => void
}

// Master volume → Metro Mirror → auxiliary volume → FlashCopy → snapshots, one row per
// mapping, built on the shared relationship graph. Row state and primary are printed only
// where they differ from the consistency group shown above.
export function RecoveryGroupReplicationChain({ metroMirror, volumes, activeAuxiliary, onActiveAuxiliaryChange, onReveal }: RecoveryGroupReplicationChainProps) {
  const { t, language } = useTranslation()
  const [page, setPage] = useState(1)
  const group = metroMirror.consistency_group
  const mappings = metroMirror.mappings
  const pageCount = Math.max(1, Math.ceil(mappings.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const start = (currentPage - 1) * PAGE_SIZE

  const rows = useMemo(() => mappings.slice(start, start + PAGE_SIZE).map((mapping, index) => {
    const auxiliary = mapping.auxiliary_volume ?? null
    const volume = auxiliary !== null ? volumes[auxiliary] : undefined
    return {
      mapping,
      presentation: presentMetroMirrorMapping(mapping, group),
      master: mapping.master_volume ?? '—',
      auxiliary,
      volume,
      snapshots: volume?.relations.filter(relation => relation.role === 'source').length ?? 0,
      ids: {
        master: `master:${String(start + index)}`,
        auxiliary: auxiliary !== null ? auxEntity(auxiliary) : `aux-missing:${String(start + index)}`,
        snapshots: `snapshots:${String(start + index)}`,
      },
    }
  }), [mappings, start, volumes, group])

  const edges = useMemo(() => rows.flatMap(row => [
    { from: row.ids.master, to: row.ids.auxiliary },
    ...(row.volume?.found && row.snapshots > 0 ? [{ from: row.ids.auxiliary, to: row.ids.snapshots }] : []),
  ]), [rows])
  const auxiliaryByEntity = useMemo(() => new Map(rows.flatMap(row => row.auxiliary === null
    ? []
    : [row.ids.master, row.ids.auxiliary, row.ids.snapshots].map(id => [id, row.auxiliary] as const))), [rows])

  if (!group && mappings.length === 0) {
    return <p className="rounded-xl border border-dashed border-border px-4 py-3 text-sm text-text-muted">{t('recoveryInventory.metroMirror.empty')}</p>
  }
  if (mappings.length === 0) return <p className="text-sm text-text-muted">{t('recoveryInventory.metroMirror.noMappings')}</p>

  const roleInStack = (text: string) => <span className="@min-[40rem]/relationship-graph:hidden">{text}</span>
  const valueText = (presentation: MetroMirrorMappingPresentation) => presentation.value.kind === 'percent'
    ? `${String(presentation.value.progress)} %`
    : t(presentation.value.kind === 'inSync' ? 'recoveryInventory.metroMirror.inSync' : 'recoveryInventory.metroMirror.notReported')
  const stateText = (state: string | null) => state ? formatMetroMirrorState(state) : t('recoveryInventory.metroMirror.unknownState')

  const connectorFor = (row: (typeof rows)[number]) => {
    const { presentation } = row
    const value = (
      <span className={presentation.value.kind === 'percent' ? 'tabular-nums text-text-primary' : presentation.value.kind === 'inSync' ? STATE_TEXT.success : 'font-medium text-text-subtle'}>
        {valueText(presentation)}
      </span>
    )
    const notes: ReactNode[] = []
    if (presentation.localState) notes.push(<span key="state" className={STATE_TEXT[presentation.tone]}>{stateText(presentation.localState.state)}</span>)
    if (presentation.primaryException) {
      notes.push(<span key="primary" className="text-warning-600 dark:text-orange-400">{t('recoveryInventory.metroMirror.primaryException', { side: metroMirrorSideLabel(presentation.primaryException, t) })}</span>)
    }
    const srLabel = [
      t(presentation.direction === 'backward' ? 'recoveryInventory.chain.sr.backward' : 'recoveryInventory.chain.sr.forward'),
      stateText(row.mapping.state ?? null),
      valueText(presentation),
      ...(presentation.primaryException ? [t('recoveryInventory.metroMirror.primaryException', { side: metroMirrorSideLabel(presentation.primaryException, t) })] : []),
    ].join(', ')
    return (
      <RelationshipConnector
        from={row.ids.master}
        to={row.ids.auxiliary}
        kind={presentation.tone === 'error' ? 'problem' : 'replication'}
        direction={presentation.direction}
        label={t('recoveryInventory.chain.metroMirror')}
        value={value}
        note={notes.length > 0 ? notes.flatMap((note, index) => index === 0 ? [note] : [<span key={`dot-${String(index)}`} className="text-text-subtle"> · </span>, note]) : undefined}
        progress={presentation.value.kind === 'percent' ? presentation.value.progress : undefined}
        lineStyle={presentation.dashed ? 'dashed' : 'solid'}
        srLabel={srLabel}
      />
    )
  }

  const tailFor = (row: (typeof rows)[number]) => {
    if (row.auxiliary === null || !row.volume) return <RelationshipNote span={2}>{t('recoveryInventory.chain.noInventoryData')}</RelationshipNote>
    if (!row.volume.found) return <RelationshipNote span={2}>{t('recoveryInventory.chain.noFlashCopyData')}</RelationshipNote>
    const auxiliary = row.auxiliary
    const connector = <RelationshipConnector from={row.ids.auxiliary} to={row.ids.snapshots} kind="protection" label={t('recoveryInventory.chain.flashCopy')} srLabel={t('recoveryInventory.chain.sr.flashCopy')} />
    if (row.snapshots === 0) return <>{connector}<RelationshipNote>{t('recoveryInventory.chain.noSnapshots')}</RelationshipNote></>
    return (
      <>
        {connector}
        <RelationshipNode
          entityId={row.ids.snapshots}
          icon={CopyIcon}
          tone="protection"
          name={countLabel(t, language, 'recoveryInventory.chain.snapshots', row.snapshots)}
          description={t('recoveryInventory.chain.sr.snapshots', { name: auxiliary })}
          onActivate={() => { onReveal(auxiliary) }}
          activateLabel={t('recoveryInventory.chain.showSnapshots', { name: auxiliary })}
        />
      </>
    )
  }

  return (
    <RelationshipGraph
      edges={edges}
      density="compact"
      dimming="soft"
      highlightScope="component"
      activeEntityId={activeAuxiliary !== null ? auxEntity(activeAuxiliary) : null}
      onActiveEntityChange={(entityId) => { onActiveAuxiliaryChange(entityId !== null ? auxiliaryByEntity.get(entityId) ?? null : null) }}
    >
      <RelationshipGroup
        title={t('recoveryInventory.chain.title')}
        header={<RelationshipLanes layout="leading" labels={[t('recoveryInventory.chain.lanes.master'), null, t('recoveryInventory.chain.lanes.auxiliary'), null, t('recoveryInventory.chain.lanes.snapshots')]} />}
        footer={pageCount > 1 ? (
          <Pagination
            page={currentPage}
            pageCount={pageCount}
            ariaLabel={t('recoveryInventory.chain.pages')}
            previousPageLabel={t('pagination.previousPage')}
            nextPageLabel={t('pagination.nextPage')}
            pageOfLabel={t('pagination.pageOf')}
            pageLabel={t('pagination.page')}
            onPageChange={setPage}
          />
        ) : undefined}
      >
        {rows.map((row) => {
          const auxiliary = row.auxiliary
          const problem = !row.volume ? t('recoveryInventory.chain.notInInventory') : !row.volume.found ? t('recoveryInventory.chain.notFoundOnProvider') : null
          return (
            <RelationshipChain key={row.ids.master} layout="leading">
              <RelationshipNode
                entityId={row.ids.master}
                icon={DiskIcon}
                tone="storage"
                name={row.master}
                nameLines={2}
                meta={roleInStack(t('recoveryInventory.chain.lanes.master'))}
                description={t('recoveryInventory.chain.sr.master', { name: auxiliary ?? '—' })}
              />
              {connectorFor(row)}
              <RelationshipNode
                entityId={row.ids.auxiliary}
                icon={problem ? AlertTriangleIcon : DiskIcon}
                tone={problem ? 'problem' : 'storage'}
                name={auxiliary ?? '—'}
                nameLines={2}
                meta={problem ? <span className="text-error-600 dark:text-error-500">{problem}</span> : roleInStack(t('recoveryInventory.chain.lanes.auxiliary'))}
                description={t('recoveryInventory.chain.sr.auxiliary', { name: row.master })}
                onActivate={row.volume && auxiliary !== null ? () => { onReveal(auxiliary) } : undefined}
                activateLabel={auxiliary !== null ? t('recoveryInventory.chain.showVolume', { name: auxiliary }) : undefined}
              />
              {tailFor(row)}
            </RelationshipChain>
          )
        })}
      </RelationshipGroup>
    </RelationshipGraph>
  )
}
