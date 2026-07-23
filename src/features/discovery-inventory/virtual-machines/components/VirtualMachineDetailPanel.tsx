import { useEffect, useState } from 'react'
import type { VirtualMachine } from '../types'
import { CpuIcon, MemoryIcon } from '@/shared/icons/Icons'
import { useResizablePanel } from '@/shared/hooks/useResizablePanel'
import { useVdisksByVm } from '../api/useVdisksByVm'
import { VirtualMachineStatusBadge } from './VirtualMachineStatusBadge'

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

function formatStartTime(isoTime: string): string {
  if (!isoTime) return '-'
  const match = /^(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/.exec(isoTime)
  const yy = match?.[1]
  const mm = match?.[2]
  const dd = match?.[3]
  const hh = match?.[4]
  const min = match?.[5]
  if (!yy || !mm || !dd || !hh || !min) return isoTime
  const year = `20${yy}`
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const monthName = monthNames[Number(mm) - 1] ?? 'Jan'
  return `${monthName} ${String(Number(dd))}, ${year} ${hh}:${min}`
}

export function VirtualMachineDetailPanel({ virtualMachine, open, onClose }: VirtualMachineDetailPanelProps) {
  const { width, handleProps } = useResizablePanel({ open })
  const [selectedTab, setSelectedTab] = useState<'overview' | 'disks' | 'snapshots'>('overview')
  const { data: vdisks, isLoading: vdisksLoading } = useVdisksByVm(virtualMachine?.name ?? '', undefined)

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
                    <DetailRow label="Datastore" value={virtualMachine.datastore} secondary={`${String(virtualMachine.diskCount)} disks / ${String(Math.round(virtualMachine.diskCapacityGb))} GB`} />
                    <DetailRow label="Folder" value={virtualMachine.folder} />
                  </dl>
                </>
              )}

              {selectedTab === 'disks' && (
                <div className="p-4">
                  {vdisksLoading ? (
                    <p className="text-sm text-gray-500">Loading disks...</p>
                  ) : vdisks ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-[#dfe9f3]">
                            <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-500">Volume Name</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-500">Capacity</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-500">Type</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-500">Copies</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-500">Pool</th>
                          </tr>
                        </thead>
                        <tbody>
                          {vdisks.volumes.map((vol) => (
                            <tr key={vol.naaId} className="border-b border-[#edf2f7] hover:bg-[#f9fbfd]">
                              <td className="px-3 py-2 max-w-xs truncate text-gray-700">{vol.name}</td>
                              <td className="px-3 py-2 text-gray-700">{vol.capacity}</td>
                              <td className="px-3 py-2 text-gray-700">{vol.type}</td>
                              <td className="px-3 py-2 text-gray-700">{vol.copyCount}</td>
                              <td className="px-3 py-2 text-gray-700">{vol.pool}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No disk data available</p>
                  )}
                </div>
              )}

              {selectedTab === 'snapshots' && (
                <div className="p-4">
                  {vdisksLoading ? (
                    <p className="text-sm text-gray-500">Loading snapshots...</p>
                  ) : vdisks ? (
                    <>
                      <div className="mb-4 flex gap-2">
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600">
                          {String(vdisks.volumes.reduce((sum: number, v) => sum + v.snapshots.sourceMappings.length, 0))} source mappings
                        </span>
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600">
                          {String(vdisks.volumes.reduce((sum: number, v) => sum + v.snapshots.targetMappings.length, 0))} target mappings
                        </span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-[#dfe9f3]">
                              <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-500">Source</th>
                              <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-500">Target</th>
                              <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-500">Status</th>
                              <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-500">Progress</th>
                              <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-500">Created</th>
                            </tr>
                          </thead>
                          <tbody>
                            {vdisks.volumes.flatMap((vol) => vol.snapshots.sourceMappings.map((mapping) => (
                              <tr key={mapping.id} className="border-b border-[#edf2f7] hover:bg-[#f9fbfd]">
                                <td className="px-3 py-2 max-w-xs truncate text-gray-700">{mapping.sourceVdiskName}</td>
                                <td className="px-3 py-2 max-w-xs truncate text-gray-700">{mapping.targetVdiskName}</td>
                                <td className="px-3 py-2 text-gray-700">{mapping.status}</td>
                                <td className="px-3 py-2 text-gray-700">{String(Number(mapping.cleanProgress))}%</td>
                                <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{formatStartTime(mapping.startTime)}</td>
                              </tr>
                            )))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-gray-500">No snapshot data available</p>
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
