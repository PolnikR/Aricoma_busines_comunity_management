import { useEffect, useState } from 'react'
import type { VirtualMachine } from '../types'
import { CpuIcon, MemoryIcon } from '@/shared/icons/Icons'
import { useResizablePanel } from '@/shared/hooks/useResizablePanel'
import { formatStartTime } from '@/shared/utils/dateFormat'
import { useVdisksByVm } from '../api/useVdisksByVm'
import { VirtualMachineStatusBadge } from './VirtualMachineStatusBadge'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/shared/components/table/Table'

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

interface DetailRowProps {
  label: string
  value: string
  secondary?: string
}

function DetailRow({ label, value, secondary }: DetailRowProps) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[#edf2f7] py-3 last:border-b-0">
      <dt className="shrink-0 text-xs text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="min-w-0 text-right text-sm font-medium text-gray-800 dark:text-white/90">
        <span className="block wrap-break-word">{value || '-'}</span>
        {secondary ? <span className="mt-0.5 block wrap-break-word text-xs font-normal text-gray-500 dark:text-gray-400">{secondary}</span> : null}
      </dd>
    </div>
  )
}

export function VirtualMachineDetailPanel({ virtualMachine, open, onClose }: VirtualMachineDetailPanelProps) {
  const [selectedTab, setSelectedTab] = useState<'overview' | 'disks' | 'snapshots'>('overview')
  const { width, handleProps } = useResizablePanel({ open, defaultWidth: 420 })
  const { data: vdisks, isLoading: vdisksLoading } = useVdisksByVm(virtualMachine?.name ?? '', undefined)

  const headerCell = 'whitespace-nowrap px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-[#93a0b5]'
  const cell = 'px-3 py-2.5 text-[13px] text-[#3b4763] align-top'
  const num = `${cell} text-right tabular-nums`

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey) }
  }, [open, onClose])

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-[#0f1932]/30 transition-opacity duration-200 ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`fixed inset-y-0 right-0 z-50 flex flex-col border-l border-[#d7deea] bg-white shadow-[-14px_0_40px_-20px_rgba(20,35,70,0.4)] transition-transform duration-200 ease-out ${open ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ width: `${String(width)}px`, maxWidth: '92vw' }}
        role="dialog"
        aria-modal="true"
        aria-label="Virtual machine detail"
      >
        <div
          {...handleProps}
          className="absolute inset-y-0 left-0 z-10 w-1.5 cursor-col-resize bg-transparent transition hover:bg-[#0d91d7]/30 focus:bg-[#0d91d7]/40 focus:outline-none"
        />
        {virtualMachine ? (
          <>
            <div className="flex items-start justify-between gap-4 border-b border-[#dfe9f3] p-5">
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-400">Selected virtual machine</p>
                <h2 className="mt-1 truncate text-base font-semibold text-gray-900" title={virtualMachine.name}>{virtualMachine.name}</h2>
                <p className="mt-1 truncate font-mono text-xs text-gray-500" title={`${virtualMachine.hostname} / ${virtualMachine.ipAddress}`}>{virtualMachine.hostname || '-'} / {virtualMachine.ipAddress || '-'}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <VirtualMachineStatusBadge value={virtualMachine.powerState} kind="power" />
                  <VirtualMachineStatusBadge value={virtualMachine.connectionState} kind="connection" />
                  <VirtualMachineStatusBadge value={virtualMachine.toolsStatus} kind="tools" />
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close detail"
                className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-[#d7deea] text-gray-500 transition hover:border-[#0d91d7] hover:text-[#118ccc]"
              >
                ✕
              </button>
            </div>

            <div className="border-b border-[#e3edf6]">
              <div className="flex gap-0">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTab('overview')
                  }}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${selectedTab === 'overview' ? 'border-b-2 border-[#0d91d7] text-[#0d91d7]' : 'text-[#71819a] hover:text-[#3b4763]'}`}
                >
                  Overview
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTab('disks')
                  }}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${selectedTab === 'disks' ? 'border-b-2 border-[#0d91d7] text-[#0d91d7]' : 'text-[#71819a] hover:text-[#3b4763]'}`}
                >
                  Disks
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTab('snapshots')
                  }}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${selectedTab === 'snapshots' ? 'border-b-2 border-[#0d91d7] text-[#0d91d7]' : 'text-[#71819a] hover:text-[#3b4763]'}`}
                >
                  Snapshots
                </button>
              </div>
            </div>

            <div className="custom-scrollbar flex-1 overflow-y-auto">
              {selectedTab === 'overview' && (
                <>
                  <div className="grid grid-cols-2 border-b border-[#dfe9f3]">
                    <div className="flex items-center gap-2 border-r border-[#dfe9f3] p-4">
                      <CpuIcon className="size-5 shrink-0 text-brand-500" />
                      <div className="flex items-baseline gap-1">
                        <p className="text-lg font-semibold text-gray-900">{virtualMachine.vcpu}</p>
                        <p className="text-xs text-gray-500">vCPU</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-4">
                      <MemoryIcon className="size-5 shrink-0 text-brand-500" />
                      <div className="flex items-baseline gap-1">
                        <p className="text-lg font-semibold text-gray-900">{virtualMachine.memoryGb} GB</p>
                        <p className="text-xs text-gray-500">Memory</p>
                      </div>
                    </div>
                  </div>

                  <div className="border-b border-[#dfe9f3] bg-[#f5f8fc] px-5 py-3">
                    <p className="mb-1 text-xs font-semibold uppercase text-gray-500">Tags</p>
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
                <div key={`disks-${virtualMachine.id}`} className="custom-scrollbar overflow-auto">
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
                          <TableRow key={disk.id} className="relative bg-white hover:bg-[#f3f8fe]">
                            <TableCell className={cell}>
                              <span className="block max-w-45 truncate" title={disk.label}>{disk.label}</span>
                            </TableCell>
                            <TableCell className={num}>{disk.capacityGb} GB</TableCell>
                            <TableCell className={cell}>{disk.datastore}</TableCell>
                            <TableCell className={`${cell} group max-w-64`}>
                              <span className="block truncate cursor-help group/file" title={disk.filePath}>
                                {truncateFilePath(disk.filePath)}
                              </span>
                              <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block z-50 w-max max-w-sm bg-[#17233d] text-white text-xs p-2 rounded wrap-break-word pointer-events-none shadow-lg before:absolute before:-bottom-1 before:right-2 before:w-2 before:h-2 before:bg-[#17233d] before:rotate-45">
                                {disk.filePath}
                              </div>
                            </TableCell>
                            <TableCell className="px-3 py-2.5 text-[13px] text-[#3b4763] align-top whitespace-nowrap text-right">{disk.thinProvisioned ? 'Yes' : 'No'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="p-4 text-[13px] text-[#93a0b5]">No disks available</p>
                  )}
                </div>
              )}

              {selectedTab === 'snapshots' && (
                <div className="flex flex-col" key={`snapshots-${virtualMachine.id}`}>
                  {vdisksLoading ? (
                    <p className="p-4 text-[13px] text-[#93a0b5]">Loading snapshots...</p>
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
                                {sourceCount} source mappings
                              </span>
                              <span className="inline-flex items-center rounded-full bg-[#e8f4fd] px-3 py-1 text-xs font-medium text-[#0d91d7]">
                                {targetCount} target mappings
                              </span>
                            </div>
                          </div>
                        )
                      })()}
                      <div className="custom-scrollbar overflow-x-auto">
                        <Table className="min-w-100">
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
                    <p className="p-4 text-[13px] text-[#93a0b5]">No snapshot data available</p>
                  )}
                </div>
              )}
            </div>
          </>
        ) : null}
      </aside>
    </>
  )
}
