import { useState } from 'react'
import type { VirtualMachine } from '../types'
import { CpuIcon, MemoryIcon } from '@/shared/icons/Icons'
import { formatStartTime } from '@/shared/utils/dateFormat'
import { useTranslation } from '@/hooks/useTranslation'
import { useVdisksByVm } from '../api/useVdisksByVm'
import { VirtualMachineStatusBadge } from './VirtualMachineStatusBadge'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/shared/components/table/Table'
import { DetailDrawer, DetailRow, DetailStat } from '@/shared/components/data-table'

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

export function VirtualMachineDetailPanel({ virtualMachine, open, onClose }: VirtualMachineDetailPanelProps) {
  const { t } = useTranslation()
  const [selectedTab, setSelectedTab] = useState<'overview' | 'disks' | 'snapshots'>('overview')
  const { data: vdisks, isLoading: vdisksLoading } = useVdisksByVm(virtualMachine?.name ?? '', undefined)

  const headerCell = 'whitespace-nowrap px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-[#93a0b5]'
  const cell = 'px-3 py-2.5 text-[13px] text-[#3b4763] align-top'
  const num = `${cell} text-right tabular-nums`

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
      ariaLabel="Virtual machine detail"
      bodyClassName="flex flex-col overflow-hidden"
    >
      {virtualMachine ? (
        <>
            <div className="border-b border-[#e3edf6]">
              <div className="flex gap-0">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTab('overview')
                  }}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${selectedTab === 'overview' ? 'border-b-2 border-[#0d91d7] text-[#0d91d7]' : 'text-[#71819a] hover:text-[#3b4763]'}`}
                >
                  {t('drawer.tabs.overview')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTab('disks')
                  }}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${selectedTab === 'disks' ? 'border-b-2 border-[#0d91d7] text-[#0d91d7]' : 'text-[#71819a] hover:text-[#3b4763]'}`}
                >
                  {t('drawer.tabs.disks')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTab('snapshots')
                  }}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${selectedTab === 'snapshots' ? 'border-b-2 border-[#0d91d7] text-[#0d91d7]' : 'text-[#71819a] hover:text-[#3b4763]'}`}
                >
                  {t('drawer.tabs.snapshots')}
                </button>
              </div>
            </div>

            <div className="custom-scrollbar flex-1 overflow-y-auto">
              {selectedTab === 'overview' && (
                <>
                  <div className="grid grid-cols-2 border-b border-[#dfe9f3]">
                    <div className="border-r border-[#dfe9f3]">
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

                  <div className="border-b border-[#dfe9f3] bg-[#f5f8fc] px-5 py-3">
                    <p className="mb-1 text-xs font-semibold uppercase text-gray-500">{t('pages.virtualMachines.detail.tags')}</p>
                    {virtualMachine.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {virtualMachine.tags.map((tag) => (
                          <span key={tag} className="inline-flex items-center rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">{tag}</span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">-</p>
                    )}
                  </div>

                  <dl className="px-5 py-2">
                    <DetailRow label="Operating system" value={virtualMachine.guestOs} />
                    <DetailRow label="Cluster" value={virtualMachine.cluster} secondary={virtualMachine.host} />
                    <DetailRow label="Datastore" value={virtualMachine.datastore} secondary={`${String(virtualMachine.vdisks.length)} disks / ${String(Math.round(virtualMachine.vdisks.reduce((sum, disk) => sum + disk.capacityGb, 0)))} GB`} />
                    <DetailRow label="Folder" value={virtualMachine.folder} />
                    <DetailRow label="VM Path" value={virtualMachine.vmPath} />
                  </dl>
                </>
              )}

              {selectedTab === 'disks' && (
                <div key={`disks-${virtualMachine.id}`} className="custom-scrollbar overflow-x-auto cursor-grab active:cursor-grabbing">
                  {virtualMachine.vdisks.length > 0 ? (
                    <Table className="min-w-full">
                      <TableHeader className="sticky top-0 border-b border-[#dfe9f3] bg-[#f6f9fc]">
                        <TableRow>
                          <TableCell isHeader className={headerCell}>Label</TableCell>
                          <TableCell isHeader className={headerCell}>Capacity</TableCell>
                          <TableCell isHeader className={headerCell}>Datastore</TableCell>
                          <TableCell isHeader className={headerCell}>File</TableCell>
                          <TableCell isHeader className={headerCell}>Thin Prov.</TableCell>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y divide-[#edf2f7]">
                        {virtualMachine.vdisks.map((disk) => (
                          <TableRow key={disk.id} className="bg-white hover:bg-[#f3f8fe]">
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
                            <TableCell className="px-3 py-2.5 text-[13px] text-[#3b4763] align-top whitespace-nowrap text-right">{disk.thinProvisioned ? t('pages.virtualMachines.detail.yes') : t('pages.virtualMachines.detail.no')}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="p-4 text-[13px] text-[#93a0b5]">{t('pages.virtualMachines.detail.noDisks')}</p>
                  )}
                </div>
              )}

              {selectedTab === 'snapshots' && (
                <div className="flex flex-col" key={`snapshots-${virtualMachine.id}`}>
                  {vdisksLoading ? (
                    <p className="p-4 text-[13px] text-[#93a0b5]">{t('pages.virtualMachines.detail.loadingSnapshots')}</p>
                  ) : vdisks ? (
                    <>
                      {(() => {
                        const { sourceCount, targetCount } = vdisks.volumes.reduce(
                          (acc, v) => ({
                            sourceCount: acc.sourceCount + v.snapshots.sourceMappings.length,
                            targetCount: acc.targetCount + v.snapshots.targetMappings.length,
                          }),
                          { sourceCount: 0, targetCount: 0 }
                        )
                        return (
                          <div className="border-b border-[#edf2f7] px-4 py-3">
                            <div className="flex gap-2">
                              <span className="inline-flex items-center rounded-full bg-[#e8f4fd] px-3 py-1 text-xs font-medium text-[#0d91d7]">
                                {sourceCount} {t('details.sourceMappings')}
                              </span>
                              <span className="inline-flex items-center rounded-full bg-[#e8f4fd] px-3 py-1 text-xs font-medium text-[#0d91d7]">
                                {targetCount} {t('details.targetMappings')}
                              </span>
                            </div>
                          </div>
                        )
                      })()}
                      <div className="custom-scrollbar overflow-x-auto cursor-grab active:cursor-grabbing">
                        <Table className="min-w-full">
                          <TableHeader className="sticky top-0 border-b border-[#dfe9f3] bg-[#f6f9fc]">
                            <TableRow>
                              <TableCell isHeader className={headerCell}>Source</TableCell>
                              <TableCell isHeader className={headerCell}>Target</TableCell>
                              <TableCell isHeader className={headerCell}>Status</TableCell>
                              <TableCell isHeader className={headerCell}>Progress</TableCell>
                              <TableCell isHeader className={headerCell}>Created</TableCell>
                            </TableRow>
                          </TableHeader>
                          <TableBody className="divide-y divide-[#edf2f7]">
                            {vdisks.volumes.flatMap((vol) => vol.snapshots.sourceMappings.map((mapping) => (
                              <TableRow key={mapping.id} className="bg-white hover:bg-[#f3f8fe]">
                                <TableCell className={cell}>
                                  <span className="block max-w-45 truncate" title={mapping.sourceVdiskName}>{mapping.sourceVdiskName}</span>
                                </TableCell>
                                <TableCell className={cell}>
                                  <span className="block max-w-45 truncate" title={mapping.targetVdiskName}>{mapping.targetVdiskName}</span>
                                </TableCell>
                                <TableCell className={cell}>{mapping.status}</TableCell>
                                <TableCell className={num}>{mapping.cleanProgress}%</TableCell>
                                <TableCell className={cell}>{formatStartTime(mapping.startTime)}</TableCell>
                              </TableRow>
                            )))}
                          </TableBody>
                        </Table>
                      </div>
                    </>
                  ) : (
                    <p className="p-4 text-[13px] text-[#93a0b5]">{t('pages.virtualMachines.detail.noSnapshots')}</p>
                  )}
                </div>
              )}
            </div>
        </>
      ) : null}
    </DetailDrawer>
  )
}
