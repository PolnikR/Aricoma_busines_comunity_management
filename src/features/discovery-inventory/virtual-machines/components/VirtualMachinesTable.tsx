import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/shared/components/table/Table'
import { CheckIcon } from '@/shared/icons/Icons'
import type { VirtualMachine } from '../types'
import { VirtualMachineStatusBadge } from './VirtualMachineStatusBadge'

interface VirtualMachinesTableProps {
  virtualMachines: VirtualMachine[]
  selectedId: string | null
  onSelect: (virtualMachine: VirtualMachine) => void
}

export function VirtualMachinesTable({ virtualMachines, selectedId, onSelect }: VirtualMachinesTableProps) {
  return (
    <div className="custom-scrollbar w-full min-w-0 touch-pan-x overflow-x-auto overscroll-x-contain" tabIndex={0} aria-label="Scrollable virtual machine table">
        <Table className="min-w-190">
          <TableHeader className="sticky top-0 z-10 border-b border-[#dfe9f3] bg-[#f6f9fc]">
            <TableRow>
              <TableCell isHeader className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Virtual machine</TableCell>
              <TableCell isHeader className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Status</TableCell>
              <TableCell isHeader className="hidden whitespace-nowrap px-4 py-3 text-left text-xs font-medium text-gray-500 2xl:table-cell dark:text-gray-400">Operating system</TableCell>
              <TableCell isHeader className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Compute</TableCell>
              <TableCell isHeader className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Placement</TableCell>
              <TableCell isHeader className="hidden whitespace-nowrap px-4 py-3 text-left text-xs font-medium text-gray-500 3xl:table-cell dark:text-gray-400">Storage</TableCell>
              <TableCell isHeader className="hidden whitespace-nowrap px-4 py-3 text-left text-xs font-medium text-gray-500 2xl:table-cell dark:text-gray-400">Snapshots</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-[#edf2f7]">
            {virtualMachines.map((vm) => (
              <TableRow
                key={vm.id}
                className={`cursor-pointer outline-none transition focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1596dd] ${selectedId === vm.id ? 'bg-[#edf7ff]' : 'bg-white hover:bg-[#f8fbfe]'}`}
                tabIndex={0}
                aria-label={`Show details for ${vm.name}`}
                aria-selected={selectedId === vm.id}
                onClick={() => { onSelect(vm) }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    onSelect(vm)
                  }
                }}
              >
                <TableCell className="px-4 py-3">
                  <div className="flex max-w-xs items-center gap-3 text-left">
                    <span className={`flex size-8 shrink-0 items-center justify-center rounded-xl ${selectedId === vm.id ? 'bg-[#0d91d7] text-white' : 'bg-[#eff4f8] text-[#71819a]'}`}>
                      {selectedId === vm.id ? <CheckIcon className="size-4" /> : <span className="text-[10px] font-semibold">VM</span>}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-gray-900 dark:text-white">{vm.name}</span>
                      <span className="mt-0.5 block truncate text-xs text-gray-500 dark:text-gray-400">{vm.hostname || '-'} / {vm.ipAddress || '-'}</span>
                    </span>
                  </div>
                </TableCell>
                <TableCell className="px-4 py-3">
                  <div className="flex flex-col items-start gap-1.5">
                    <VirtualMachineStatusBadge value={vm.powerState} kind="power" />
                    <VirtualMachineStatusBadge value={vm.connectionState} kind="connection" />
                  </div>
                </TableCell>
                <TableCell className="hidden max-w-52 px-4 py-3 text-sm text-gray-700 2xl:table-cell dark:text-gray-300"><span className="block truncate" title={vm.guestOs}>{vm.guestOs}</span></TableCell>
                <TableCell className="whitespace-nowrap px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                  <span className="block">{vm.vcpu} vCPU</span>
                  <span className="block text-xs text-gray-500">{vm.memoryGb} GB RAM</span>
                </TableCell>
                <TableCell className="hidden px-4 py-3 text-sm text-gray-700 3xl:table-cell dark:text-gray-300">
                  <span className="block max-w-55 truncate">{vm.cluster}</span>
                  <span className="block max-w-55 truncate text-xs text-gray-500">{vm.host}</span>
                </TableCell>
                <TableCell className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                  <span className="block max-w-50 truncate">{vm.datastore}</span>
                  <span className="block text-xs text-gray-500">{vm.diskCount} disks / {vm.diskCapacityGb} GB</span>
                </TableCell>
                <TableCell className="hidden px-4 py-3 text-center text-sm text-gray-700 2xl:table-cell dark:text-gray-300">{vm.snapshotCount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
    </div>
  )
}
