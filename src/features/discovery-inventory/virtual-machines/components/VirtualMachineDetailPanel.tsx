import type { VirtualMachine } from '../types'
import { VirtualMachineStatusBadge } from './VirtualMachineStatusBadge'

interface VirtualMachineDetailPanelProps {
  virtualMachine: VirtualMachine | null
}

export function VirtualMachineDetailPanel({ virtualMachine }: VirtualMachineDetailPanelProps) {
  if (!virtualMachine) {
    return (
      <aside className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] xl:sticky xl:top-24">
        <p className="text-sm font-medium text-gray-900 dark:text-white">VM detail</p>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Select a row to inspect placement, tools state, and storage summary.</p>
      </aside>
    )
  }

  return (
    <aside className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] xl:sticky xl:top-24">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Selected VM</p>
          <h2 className="mt-1 truncate text-lg font-semibold text-gray-900 dark:text-white">{virtualMachine.name}</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{virtualMachine.hostname} / {virtualMachine.ipAddress}</p>
        </div>
        <VirtualMachineStatusBadge value={virtualMachine.powerState} kind="power" />
      </div>

      <dl className="mt-6 grid grid-cols-1 gap-4 text-sm">
        <div className="rounded-lg bg-gray-50 p-3 dark:bg-white/[0.03]">
          <dt className="text-gray-500 dark:text-gray-400">Operating system</dt>
          <dd className="mt-1 font-medium text-gray-900 dark:text-white">{virtualMachine.guestOs}</dd>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-gray-50 p-3 dark:bg-white/[0.03]">
            <dt className="text-gray-500 dark:text-gray-400">vCPU</dt>
            <dd className="mt-1 font-medium text-gray-900 dark:text-white">{virtualMachine.vcpu}</dd>
          </div>
          <div className="rounded-lg bg-gray-50 p-3 dark:bg-white/[0.03]">
            <dt className="text-gray-500 dark:text-gray-400">Memory</dt>
            <dd className="mt-1 font-medium text-gray-900 dark:text-white">{virtualMachine.memoryGb} GB</dd>
          </div>
        </div>
        <div className="rounded-lg bg-gray-50 p-3 dark:bg-white/[0.03]">
          <dt className="text-gray-500 dark:text-gray-400">Placement</dt>
          <dd className="mt-1 font-medium text-gray-900 dark:text-white">{virtualMachine.cluster}</dd>
          <dd className="mt-1 text-gray-500 dark:text-gray-400">{virtualMachine.host}</dd>
        </div>
        <div className="rounded-lg bg-gray-50 p-3 dark:bg-white/[0.03]">
          <dt className="text-gray-500 dark:text-gray-400">Storage</dt>
          <dd className="mt-1 font-medium text-gray-900 dark:text-white">{virtualMachine.datastore}</dd>
          <dd className="mt-1 text-gray-500 dark:text-gray-400">{virtualMachine.diskCount} disks / {virtualMachine.diskCapacityGb} GB</dd>
        </div>
        <div className="flex flex-wrap gap-2">
          <VirtualMachineStatusBadge value={virtualMachine.connectionState} kind="connection" />
          <VirtualMachineStatusBadge value={virtualMachine.toolsStatus} kind="tools" />
        </div>
      </dl>
    </aside>
  )
}