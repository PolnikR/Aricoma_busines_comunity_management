import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/shared/components/table/Table'
import type { VirtualMachine } from '../types'
import { VirtualMachineStatusBadge } from './VirtualMachineStatusBadge'

interface VirtualMachinesTableProps {
  virtualMachines: VirtualMachine[]
  selectedId: string | null
  onSelect: (virtualMachine: VirtualMachine) => void
}

export function VirtualMachinesTable({ virtualMachines, selectedId, onSelect }: VirtualMachinesTableProps) {
  return (
    <div className="overflow-hidden rounded-b-xl">
      <div className="max-w-full overflow-x-auto custom-scrollbar">
        <Table>
          <TableHeader className="border-b border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02]">
            <TableRow>
              <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">VM</TableCell>
              <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Status</TableCell>
              <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Compute</TableCell>
              <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Placement</TableCell>
              <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Storage</TableCell>
              <TableCell isHeader className="px-5 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Snapshots</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {virtualMachines.map((vm) => (
              <TableRow key={vm.id} className={selectedId === vm.id ? 'bg-brand-50/60 dark:bg-brand-500/[0.08]' : 'bg-white hover:bg-gray-50 dark:bg-transparent dark:hover:bg-white/[0.03]'}>
                <TableCell className="px-5 py-4">
                  <button type="button" className="block max-w-xs text-left" onClick={() => { onSelect(vm) }}>
                    <span className="block truncate text-sm font-medium text-gray-900 dark:text-white">{vm.name}</span>
                    <span className="mt-1 block truncate text-xs text-gray-500 dark:text-gray-400">{vm.hostname} / {vm.ipAddress}</span>
                  </button>
                </TableCell>
                <TableCell className="px-5 py-4">
                  <div className="flex flex-col items-start gap-2">
                    <VirtualMachineStatusBadge value={vm.powerState} kind="power" />
                    <VirtualMachineStatusBadge value={vm.connectionState} kind="connection" />
                  </div>
                </TableCell>
                <TableCell className="px-5 py-4 text-sm text-gray-700 dark:text-gray-300">
                  <span className="block">{vm.vcpu} vCPU</span>
                  <span className="block text-xs text-gray-500">{vm.memoryGb} GB RAM</span>
                </TableCell>
                <TableCell className="px-5 py-4 text-sm text-gray-700 dark:text-gray-300">
                  <span className="block max-w-[220px] truncate">{vm.cluster}</span>
                  <span className="block max-w-[220px] truncate text-xs text-gray-500">{vm.host}</span>
                </TableCell>
                <TableCell className="px-5 py-4 text-sm text-gray-700 dark:text-gray-300">
                  <span className="block max-w-[200px] truncate">{vm.datastore}</span>
                  <span className="block text-xs text-gray-500">{vm.diskCount} disks / {vm.diskCapacityGb} GB</span>
                </TableCell>
                <TableCell className="px-5 py-4 text-sm text-gray-700 dark:text-gray-300">{vm.snapshotCount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}