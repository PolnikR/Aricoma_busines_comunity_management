import type { VirtualMachine } from '../types'
import { CpuIcon, MemoryIcon, ServerIcon } from '@/shared/icons/Icons'
import { VirtualMachineStatusBadge } from './VirtualMachineStatusBadge'

interface VirtualMachineDetailPanelProps {
  virtualMachine: VirtualMachine | null
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

export function VirtualMachineDetailPanel({ virtualMachine }: VirtualMachineDetailPanelProps) {
  if (!virtualMachine) {
    return (
      <aside className="rounded-2xl border border-[#dbe7f2] bg-white p-5 shadow-sm xl:min-h-0">
        <div className="flex size-11 items-center justify-center rounded-lg bg-gray-100 text-gray-500 dark:bg-gray-800"><ServerIcon /></div>
        <p className="mt-4 text-sm font-semibold text-gray-900 dark:text-white">VM detail</p>
        <p className="mt-1.5 text-sm leading-6 text-gray-500 dark:text-gray-400">Select a row to inspect placement, tools state, and storage.</p>
      </aside>
    )
  }

  return (
    <aside className="custom-scrollbar overflow-hidden rounded-2xl border border-[#dbe7f2] bg-white shadow-sm xl:min-h-0 xl:overflow-y-auto">
      <div className="border-b border-[#dfe9f3] p-5">
        <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
            <p className="text-xs font-medium text-gray-400">Selected virtual machine</p>
            <h2 className="mt-1 truncate text-lg font-semibold text-gray-900 dark:text-white" title={virtualMachine.name}>{virtualMachine.name}</h2>
            <p className="mt-1 truncate text-sm text-gray-500 dark:text-gray-400" title={`${virtualMachine.hostname} / ${virtualMachine.ipAddress}`}>{virtualMachine.hostname || '-'} / {virtualMachine.ipAddress || '-'}</p>
          </div>
          <VirtualMachineStatusBadge value={virtualMachine.powerState} kind="power" />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <VirtualMachineStatusBadge value={virtualMachine.connectionState} kind="connection" />
          <VirtualMachineStatusBadge value={virtualMachine.toolsStatus} kind="tools" />
        </div>
      </div>

      <div className="grid grid-cols-2 border-b border-[#dfe9f3] bg-white/70">
        <div className="border-r border-[#dfe9f3] p-4">
          <CpuIcon className="size-5 text-brand-500" />
          <p className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">{virtualMachine.vcpu}</p>
          <p className="text-xs text-gray-500">vCPU</p>
        </div>
        <div className="p-4">
          <MemoryIcon className="size-5 text-brand-500" />
          <p className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">{virtualMachine.memoryGb} GB</p>
          <p className="text-xs text-gray-500">Memory</p>
        </div>
      </div>

      <dl className="px-5 py-2">
        <DetailRow label="Operating system" value={virtualMachine.guestOs} />
        <DetailRow label="Cluster" value={virtualMachine.cluster} secondary={virtualMachine.host} />
        <DetailRow label="Datastore" value={virtualMachine.datastore} secondary={`${String(virtualMachine.diskCount)} disks / ${String(Math.round(virtualMachine.diskCapacityGb))} GB`} />
        <DetailRow label="Folder" value={virtualMachine.folder} />
        <DetailRow label="Snapshots" value={String(virtualMachine.snapshotCount)} />
        <div className="flex items-start justify-between gap-4 border-b border-[#edf2f7] py-3 last:border-b-0">
          <dt className="shrink-0 text-xs text-gray-500 dark:text-gray-400">Tags</dt>
          <dd className="min-w-0 text-right text-sm font-medium text-gray-800 dark:text-white/90">
            {(virtualMachine.tags as string[]).length > 0 ? (
              <div className="flex flex-wrap justify-end gap-1.5">
                {(virtualMachine.tags as string[]).map((tag: string) => (
                  <span
                    key={tag}
                    className="inline-flex items-center rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-600 dark:bg-brand-500/15 dark:text-brand-400"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : (
              <span className="block wrap-break-word">-</span>
            )}
          </dd>
        </div>
      </dl>
    </aside>
  )
}
