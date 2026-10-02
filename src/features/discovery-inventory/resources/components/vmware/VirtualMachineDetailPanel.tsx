import type { VirtualMachine } from '../../types/virtualMachineTypes'
import { CpuIcon, MemoryIcon } from '@/shared/icons/Icons'
import { formatStartTime } from '@/shared/utils/dateFormat'
import { useTranslation } from '@/hooks/useTranslation'
import { KeyedHelpPopover } from '@/shared/components/help-popover/KeyedHelpPopover'
import { useVdisksByVm } from '../../hooks/useVmStorageVolumes'
import type { StorageVolumeMapping } from '../../model/vmStorageVolumesTypes'
import { VirtualMachineStatusBadge } from './VirtualMachineStatusBadge'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/shared/components/table/Table'
import {
  DataTable,
  DataTableRequestState,
  SkeletonBlock,
  DetailDrawer,
  DetailDrawerSection,
  DetailRow,
  DetailStat,
  type ColumnDef,
} from '@/shared/components/data-table'
import { createVmwareDetailFields } from '../../config/vmwareDetailFields'

function truncateFilePath(path: string): string {
  if (path.length <= 50) return path
  const lastSlash = path.lastIndexOf('/')
  const lastBracket = path.lastIndexOf(']')
  const splitPoint = Math.max(lastSlash, lastBracket)
  if (splitPoint === -1 || splitPoint > path.length - 10) return path
  const start = path.slice(0, 25)
  const end = path.slice(splitPoint + 1)
  return `${start}...${end}`
}

interface VirtualMachineDetailPanelProps {
  virtualMachine: VirtualMachine | null
  open: boolean
  onClose: () => void
}

export function VirtualMachineDetailPanel({
  virtualMachine,
  open,
  onClose,
}: VirtualMachineDetailPanelProps) {
  const { t } = useTranslation()
  // The backend resolves backing storage from the VM and compute provider.
  const {
    data: vdisks,
    isLoading: vdisksLoading,
    isError: vdisksError,
    isFetching: vdisksFetching,
    refetch: refetchVdisks,
  } = useVdisksByVm(
    virtualMachine?.name ?? '',
    virtualMachine?.providerId,
  )
  const snapshotVolumes = vdisks?.volumes ?? []
  const snapshotMappings = snapshotVolumes.flatMap(volume => volume.snapshots.sourceMappings)
  const snapshotCounts = snapshotVolumes.reduce(
    (counts, volume) => ({
      source: counts.source + volume.snapshots.sourceMappings.length,
      target: counts.target + volume.snapshots.targetMappings.length,
    }),
    { source: 0, target: 0 },
  )

  const headerCell = 'whitespace-nowrap px-2 @min-[80rem]/vm-detail:px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-text-subtle'
  const cell = 'px-2 @min-[80rem]/vm-detail:px-3 py-2.5 text-[12px] @min-[80rem]/vm-detail:text-[13px] text-text-secondary align-top'
  const num = `${cell} text-right tabular-nums`
  const overviewFields = createVmwareDetailFields(t)
  const snapshotColumns: ColumnDef<StorageVolumeMapping>[] = [
    {
      id: 'source',
      header: t('details.snapshotSource'),
      cell: mapping => (
        <span className="block max-w-45 truncate" title={mapping.sourceVdiskName}>
          {mapping.sourceVdiskName}
        </span>
      ),
    },
    {
      id: 'target',
      header: t('details.snapshotTarget'),
      cell: mapping => (
        <span className="block max-w-45 truncate" title={mapping.targetVdiskName}>
          {mapping.targetVdiskName}
        </span>
      ),
    },
    { id: 'status', header: t('details.snapshotStatus'), cell: mapping => mapping.status },
    {
      id: 'progress',
      header: t('details.snapshotProgress'),
      cell: mapping => `${mapping.cleanProgress}%`,
      align: 'right',
    },
    {
      id: 'created',
      header: t('details.snapshotCreated'),
      cell: mapping => formatStartTime(mapping.startTime),
    },
  ]

  return (
    <DetailDrawer
      open={open}
      onClose={onClose}
      resizable
      title={virtualMachine?.name ?? ''}
      meta={virtualMachine ? [
        t('pages.virtualMachines.detail.entity'),
        <VirtualMachineStatusBadge key="power" value={virtualMachine.powerState} kind="power" />,
        <VirtualMachineStatusBadge key="connection" value={virtualMachine.connectionState} kind="connection" />,
        <VirtualMachineStatusBadge key="tools" value={virtualMachine.toolsStatus} kind="tools" />,
      ] : []}
      subtitle={virtualMachine ? (
        <span className="font-mono" title={`${virtualMachine.hostname} / ${virtualMachine.ipAddress}`}>
          {virtualMachine.hostname || '-'} / {virtualMachine.ipAddress || '-'}
        </span>
      ) : null}
      headerActions={<KeyedHelpPopover helpKey="pages.virtualMachines.help" sections={['status', 'disks', 'backing']} />}
      ariaLabel={t('drawer.vmDetail')}
      closeLabel={t('drawer.closeVm')}
      resizeLabel={t('drawer.resize')}
    >
      {virtualMachine ? (
        // Keyed by VM so each newly opened VM starts with the default sections.
        <div key={virtualMachine.id} className="@container/vm-detail">
              <DetailDrawerSection title={t('drawer.tabs.overview')} defaultOpen flush>
                  <div className="grid grid-cols-2 border-b border-border">
                    <div className="border-r border-border">
                      <DetailStat
                        icon={<CpuIcon className="size-5" />}
                        value={virtualMachine.vcpu}
                        label={t('pages.virtualMachines.detail.vcpu')}
                      />
                    </div>
                    <DetailStat
                      icon={<MemoryIcon className="size-5" />}
                      value={`${String(virtualMachine.memoryGb)} GB`}
                      label={t('pages.virtualMachines.detail.memory')}
                    />
                  </div>

                  <div className="border-b border-border bg-surface-subtle px-5 py-3">
                    <p className="mb-1 text-xs font-semibold uppercase text-text-muted">{t('pages.virtualMachines.detail.tags')}</p>
                    {virtualMachine.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {virtualMachine.tags.map((tag) => (
                          <span key={tag} className="inline-flex items-center rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">{tag}</span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-text-muted">-</p>
                    )}
                  </div>

                  <dl className="px-5 py-2">
                    {overviewFields.map((field) => (
                      <DetailRow
                        key={field.id}
                        label={field.label}
                        value={field.value(virtualMachine)}
                        secondary={field.secondary?.(virtualMachine)}
                      />
                    ))}
                  </dl>
              </DetailDrawerSection>

              <DetailDrawerSection
                title={t('drawer.tabs.disks')}
                summary={t('pages.virtualMachines.detail.diskCount', { count: virtualMachine.vdisks.length })}
                flush
              >
                <div className="custom-scrollbar overflow-x-auto cursor-grab active:cursor-grabbing">
                  {virtualMachine.vdisks.length > 0 ? (
                    <Table className="min-w-full">
                      <TableHeader className="sticky top-0 border-b border-border bg-surface-subtle">
                        <TableRow>
                          <TableCell isHeader className={headerCell}>{t('details.label')}</TableCell>
                          <TableCell isHeader className={headerCell}>{t('details.capacity')}</TableCell>
                          <TableCell isHeader className={headerCell}>{t('details.datastore')}</TableCell>
                          <TableCell isHeader className={headerCell}>{t('details.file')}</TableCell>
                          <TableCell isHeader className={headerCell}>{t('details.thinProv')}</TableCell>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y divide-border">
                        {virtualMachine.vdisks.map((disk) => (
                          <TableRow key={disk.id} className="bg-surface hover:bg-accent-soft">
                            <TableCell className={cell}>
                              <span className="block max-w-45 truncate" title={disk.label}>{disk.label}</span>
                            </TableCell>
                            <TableCell className={num}>{disk.capacityGb} GB</TableCell>
                            <TableCell className={cell}>{disk.datastore}</TableCell>
                            <TableCell className={`${cell} max-w-64`}>
                              <span className="block truncate cursor-help" title={disk.filePath}>
                                {truncateFilePath(disk.filePath)}
                              </span>
                            </TableCell>
                            <TableCell className={`${cell} whitespace-nowrap text-right`}>{disk.thinProvisioned ? t('pages.virtualMachines.detail.yes') : t('pages.virtualMachines.detail.no')}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="p-4 text-[12px] @min-[80rem]/vm-detail:text-[13px] text-text-subtle">{t('pages.virtualMachines.detail.noDisks')}</p>
                  )}
                </div>
              </DetailDrawerSection>

              <DetailDrawerSection title={t('drawer.tabs.snapshots')} flush>
                <div className="flex flex-col">
                  <DataTableRequestState
                      error={vdisksError ? {
                        title: t('resources.common.loadFailed'),
                        retryLabel: t('buttons.retry'),
                        isRetrying: vdisksFetching,
                        onRetry: () => { void refetchVdisks() },
                      } : null}
                    >
                      <>
                        <div className="border-b border-border px-4 py-3">
                          <div className="flex gap-2">
                            <span className="inline-flex items-center rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent">
                              {vdisksLoading ? <SkeletonBlock className="mr-1 inline-block h-3 w-5" /> : snapshotCounts.source} {t('details.sourceMappings')}
                            </span>
                            <span className="inline-flex items-center rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent">
                              {vdisksLoading ? <SkeletonBlock className="mr-1 inline-block h-3 w-5" /> : snapshotCounts.target} {t('details.targetMappings')}
                            </span>
                          </div>
                        </div>
                        <DataTable<StorageVolumeMapping>
                          columns={snapshotColumns}
                          rows={snapshotMappings}
                          isLoading={vdisksLoading}
                          loadingRowCount={4}
                          rowKey={(mapping, index) => `${mapping.id}-${String(index)}`}
                          minWidthClassName="min-w-180"
                          emptyContent={t('pages.virtualMachines.detail.noSnapshots')}
                          ariaLabel={vdisksLoading ? t('pages.virtualMachines.detail.loadingSnapshots') : t('pages.virtualMachines.detail.snapshotsTable')}
                          headerCellClassName={headerCell}
                          cellClassName={cell}
                        />
                      </>
                  </DataTableRequestState>
                </div>
              </DetailDrawerSection>
        </div>
      ) : null}
    </DetailDrawer>
  )
}
