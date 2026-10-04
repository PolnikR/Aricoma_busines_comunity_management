import type { VirtualMachine } from '../../types/virtualMachineTypes'
import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import { CpuIcon, MemoryIcon } from '@/shared/icons/Icons'
import { useTranslation } from '@/hooks/useTranslation'
import { KeyedHelpPopover } from '@/shared/components/help-popover/KeyedHelpPopover'
import { useVdisksByVm } from '../../hooks/useVmStorageVolumes'
import { VirtualMachineStatusBadge } from './VirtualMachineStatusBadge'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/shared/components/table/Table'
import {
  DetailDrawer,
  DetailDrawerSection,
  DetailRow,
  DetailStat,
} from '@/shared/components/data-table'
import { createVmwareDetailFields } from '../../config/vmwareDetailFields'
import { BackingStorageInfo } from '../BackingStorageInfo'

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
  // Already loaded providers, used to name the backing storage provider.
  providers?: ProviderRecord[]
}

export function VirtualMachineDetailPanel({
  virtualMachine,
  open,
  onClose,
  providers = [],
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
  const headerCell = 'whitespace-nowrap px-2 @min-[80rem]/vm-detail:px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-text-subtle'
  const cell = 'px-2 @min-[80rem]/vm-detail:px-3 py-2.5 text-[12px] @min-[80rem]/vm-detail:text-[13px] text-text-secondary align-top'
  const num = `${cell} text-right tabular-nums`
  const overviewFields = createVmwareDetailFields(t)
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

              <DetailDrawerSection title={t('drawer.sections.backingStorageInfo')} flush>
                <BackingStorageInfo
                  volumes={vdisks?.volumes ?? []}
                  isLoading={vdisksLoading}
                  isError={vdisksError}
                  isFetching={vdisksFetching}
                  onRetry={() => { void refetchVdisks() }}
                  providers={providers}
                  emptyText={t('pages.virtualMachines.detail.noBackingVolumes')}
                />
              </DetailDrawerSection>
        </div>
      ) : null}
    </DetailDrawer>
  )
}
