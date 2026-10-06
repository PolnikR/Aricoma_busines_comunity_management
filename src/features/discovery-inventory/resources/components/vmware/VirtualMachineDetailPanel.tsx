import type { VirtualMachine } from '../../types/virtualMachineTypes'
import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import { DiskIcon, GridIcon, LayersIcon } from '@/shared/icons/Icons'
import { useTranslation } from '@/hooks/useTranslation'
import { KeyedHelpPopover } from '@/shared/components/help-popover/KeyedHelpPopover'
import { useVdisksByVm } from '../../hooks/useVmStorageVolumes'
import { VirtualMachineStatusBadge } from './VirtualMachineStatusBadge'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/shared/components/table/Table'
import {
  DetailField,
  DetailFieldGroup,
  DetailView,
  DetailViewSection,
} from '@/shared/components/detail-view'
import { BackingStorageInfo } from '../BackingStorageInfo'
import { VmRelationshipHelp } from './VmRelationshipHelp'

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

  if (!open || !virtualMachine) return null
  const diskCapacityGb = Math.round(virtualMachine.vdisks.reduce((sum, disk) => sum + disk.capacityGb, 0))

  return (
    <DetailView
      // Keyed by VM so each newly opened VM starts expanded on Overview.
      key={virtualMachine.id}
      open
      onClose={onClose}
      size="xl"
      entityLabel={t('pages.virtualMachines.detail.entity')}
      title={virtualMachine.name}
      statuses={[
        <VirtualMachineStatusBadge key="power" value={virtualMachine.powerState} kind="power" />,
        <VirtualMachineStatusBadge key="connection" value={virtualMachine.connectionState} kind="connection" />,
        <VirtualMachineStatusBadge key="tools" value={virtualMachine.toolsStatus} kind="tools" />,
      ]}
      // Hostname and IP address, as the original drawer subtitle showed them.
      meta={`${virtualMachine.hostname || '-'} / ${virtualMachine.ipAddress || '-'}`}
      headerActions={(
        <KeyedHelpPopover helpKey="pages.virtualMachines.help" sections={['status', 'disks', 'backing']} width="wide">
          <VmRelationshipHelp
            virtualMachine={virtualMachine}
            volumes={vdisks?.volumes ?? []}
            isLoading={vdisksLoading}
            isError={vdisksError}
            providers={providers}
          />
        </KeyedHelpPopover>
      )}
      ariaLabel={t('drawer.vmDetail')}
      closeLabel={t('drawer.closeVm')}
    >
      {/* One field list in the order of the original detail drawer. */}
      <DetailViewSection id="overview" title={t('drawer.tabs.overview')} icon={GridIcon}>
        <DetailFieldGroup>
          <DetailField label={t('pages.virtualMachines.detail.vcpu')} value={String(virtualMachine.vcpu)} emphasis />
          <DetailField label={t('pages.virtualMachines.detail.memory')} value={`${String(virtualMachine.memoryGb)} GB`} emphasis />
          <DetailField
            label={t('pages.virtualMachines.detail.tags')}
            value={virtualMachine.tags.length > 0 ? (
              <span className="flex flex-wrap gap-1.5">
                {virtualMachine.tags.map((tag) => (
                  <span key={tag} className="inline-flex items-center rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">{tag}</span>
                ))}
              </span>
            ) : null}
            wide
          />
          <DetailField label={t('details.os')} value={virtualMachine.guestOs} />
          <DetailField label={t('details.cluster')} value={virtualMachine.cluster} secondary={virtualMachine.host} />
          <DetailField
            label={t('details.datastore')}
            value={virtualMachine.datastore}
            secondary={`${String(virtualMachine.vdisks.length)} ${t('details.disks')} / ${String(diskCapacityGb)} GB`}
          />
          <DetailField label={t('details.folder')} value={virtualMachine.folder} wide />
          <DetailField label={t('details.vmPath')} value={virtualMachine.vmPath} mono wide copyValue={virtualMachine.vmPath} />
        </DetailFieldGroup>
      </DetailViewSection>

      <DetailViewSection
        id="disks"
        title={t('drawer.tabs.disks')}
        icon={DiskIcon}
        count={virtualMachine.vdisks.length}
        description={t('pages.virtualMachines.detail.diskCount', { count: virtualMachine.vdisks.length })}
      >
        <div className="@container/vm-detail custom-scrollbar overflow-x-auto">
          {virtualMachine.vdisks.length > 0 ? (
            <Table className="min-w-full">
              <TableHeader className="sticky top-0 border-b border-border bg-surface-subtle">
                <TableRow>
                  <TableCell isHeader className={headerCell}>{t('details.label')}</TableCell>
                  <TableCell isHeader className={headerCell}>{t('details.capacity')}</TableCell>
                  <TableCell isHeader className={headerCell}>{t('details.datastore')}</TableCell>
                  <TableCell isHeader className={headerCell}>{t('details.naa')}</TableCell>
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
                    <TableCell className={`${cell} font-mono`}>
                      {/* Every NAA of the disk's datastore extents, in API order; not a disk to volume mapping. */}
                      {disk.naa.length > 0 ? (
                        <ul className="space-y-0.5">
                          {disk.naa.map((naa, index) => <li key={`${naa}-${String(index)}`} className="whitespace-nowrap">{naa}</li>)}
                        </ul>
                      ) : '-'}
                    </TableCell>
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
            <p className="text-[13px] text-text-subtle">{t('pages.virtualMachines.detail.noDisks')}</p>
          )}
        </div>
      </DetailViewSection>

      <DetailViewSection id="backing" title={t('drawer.sections.backingStorageInfo')} icon={LayersIcon}>
        <BackingStorageInfo
          volumes={vdisks?.volumes ?? []}
          isLoading={vdisksLoading}
          isError={vdisksError}
          isFetching={vdisksFetching}
          onRetry={() => { void refetchVdisks() }}
          providers={providers}
          identity="vdiskUid"
          emptyText={t('pages.virtualMachines.detail.noBackingVolumes')}
        />
      </DetailViewSection>
    </DetailView>
  )
}
