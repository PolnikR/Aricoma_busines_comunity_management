import { useEffect } from 'react'
import type { VirtualMachine } from '../types'
import { CpuIcon, MemoryIcon } from '@/shared/icons/Icons'
import { useResizablePanel } from '@/shared/hooks/useResizablePanel'
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

export function VirtualMachineDetailPanel({ virtualMachine, open, onClose }: VirtualMachineDetailPanelProps) {
  const { width, handleProps } = useResizablePanel({ open })

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

            <div className="custom-scrollbar flex-1 overflow-y-auto">
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
                <DetailRow label="Snapshots" value={String(virtualMachine.snapshotCount)} />
              </dl>
            </div>
          </>
        ) : null}
      </aside>
    </>
  )
}
