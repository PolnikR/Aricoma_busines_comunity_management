import { useState } from 'react'
import type { VirtualMachine } from '../../types'
import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import { CpuIcon, MemoryIcon } from '@/shared/icons/Icons'
import { formatStartTime } from '@/shared/utils/dateFormat'
import { useTranslation } from '@/hooks/useTranslation'
import { useVdisksByVm } from '../../hooks/useVdisksByVm'
import type { StorageVolumeMapping } from '../../model/vdisksTypes'
import { VirtualMachineStatusBadge } from './VirtualMachineStatusBadge'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/shared/components/table/Table'
import {
  DataTable,
  DataTableSkeleton,
  DetailDrawer,
  DetailRow,
  DetailStat,
  type ColumnDef,
} from '@/shared/components/data-table'
import { Tabs } from '@/shared/components/tabs/Tabs'
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
  providers?: ProviderRecord[]
  open: boolean
  onClose: () => void
}

export function VirtualMachineDetailPanel({
  virtualMachine,
  providers = [],
  open,
  onClose,
}: VirtualMachineDetailPanelProps) {
  const { t } = useTranslation()
  const [selectedTab, setSelectedTab] = useState<'overview' | 'disks' | 'snapshots'>('overview')
  const vmProvider = providers.find(
    (provider) => provider.id === virtualMachine?.providerId && provider.type === 'VMWARE',
  )
  const flashSystemProviderId = providers.find((provider) => (
    provider.id === vmProvider?.defaultFlashcopyProviderId
    && provider.type === 'FLASHCOPY'
    && provider.credentialStatus === 'ok'
  ))?.id
  const { data: vdisks, isLoading: vdisksLoading } = useVdisksByVm(
    virtualMachine?.name ?? '',
    virtualMachine?.providerId,
    flashSystemProviderId,
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

  const headerCell = 'whitespace-nowrap px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-text-subtle'
  const cell = 'px-3 py-2.5 text-[13px] text-text-secondary align-top'
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
      eyebrow={t('pages.virtualMachines.detail.selected')}
      title={virtualMachine?.name ?? ''}
      subtitle={virtualMachine ? (
        <span className="font-mono" title={`${virtualMachine.hostname} / ${virtualMachine.ipAddress}`}>
          {virtualMachine.hostname || '-'} / {virtualMachine.ipAddress || '-'}
        </span>
      ) : null}
      headerExtra={virtualMachine ? (
        <>
          <VirtualMachineStatusBadge value={virtualMachine.powerState} kind="power" />
          <VirtualMachineStatusBadge value={virtualMachine.connectionState} kind="connection" />
          <VirtualMachineStatusBadge value={virtualMachine.toolsStatus} kind="tools" />
        </>
      ) : null}
      ariaLabel={t('drawer.vmDetail')}
      closeLabel={t('drawer.closeVm')}
      bodyClassName="flex flex-col overflow-hidden"
    >
      {virtualMachine ? (
        <>
            <Tabs
              items={[
                { value: 'overview', label: t('drawer.tabs.overview') },
                { value: 'disks', label: t('drawer.tabs.disks') },
                { value: 'snapshots', label: t('drawer.tabs.snapshots') },
              ]}
              value={selectedTab}
              onChange={setSelectedTab}
              ariaLabel={t('drawer.vmSections')}
              className="[&>button]:flex-1"
            />

            <div className="custom-scrollbar flex-1 overflow-y-auto">
              {selectedTab === 'overview' && (
                <>
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
                </>
              )}

              {selectedTab === 'disks' && (
                <div key={`disks-${virtualMachine.id}`} className="custom-scrollbar overflow-x-auto cursor-grab active:cursor-grabbing">
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
                            <TableCell className="px-3 py-2.5 text-[13px] text-text-secondary align-top whitespace-nowrap text-right">{disk.thinProvisioned ? t('pages.virtualMachines.detail.yes') : t('pages.virtualMachines.detail.no')}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="p-4 text-[13px] text-text-subtle">{t('pages.virtualMachines.detail.noDisks')}</p>
                  )}
                </div>
              )}

              {selectedTab === 'snapshots' && (
                <div className="flex flex-col" key={`snapshots-${virtualMachine.id}`}>
                  {vdisksLoading ? (
                    <DataTableSkeleton
                      columnCount={5}
                      rowCount={4}
                      ariaLabel={t('pages.virtualMachines.detail.loadingSnapshots')}
                      showToolbar={false}
                      showPagination={false}
                      className="rounded-none border-0 shadow-none"
                    />
                  ) : (
                    <>
                      <div className="border-b border-border px-4 py-3">
                        <div className="flex gap-2">
                          <span className="inline-flex items-center rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent">
                            {snapshotCounts.source} {t('details.sourceMappings')}
                          </span>
                          <span className="inline-flex items-center rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent">
                            {snapshotCounts.target} {t('details.targetMappings')}
                          </span>
                        </div>
                      </div>
                      <DataTable<StorageVolumeMapping>
                        columns={snapshotColumns}
                        rows={snapshotMappings}
                        rowKey={(mapping, index) => `${mapping.id}-${String(index)}`}
                        minWidthClassName="min-w-180"
                        emptyContent={t('pages.virtualMachines.detail.noSnapshots')}
                        ariaLabel={t('pages.virtualMachines.detail.snapshotsTable')}
                        headerCellClassName={headerCell}
                        cellClassName={cell}
                      />
                    </>
                  )}
                </div>
              )}
            </div>
        </>
      ) : null}
    </DetailDrawer>
  )
}
