import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/shared/components/table/Table'
import type { VirtualMachine } from '../types'

export type TableDensity = 'comfortable' | 'compact'

interface VirtualMachinesTableProps {
  virtualMachines: VirtualMachine[]
  selectedId: string | null
  density: TableDensity
  onSelect: (virtualMachine: VirtualMachine) => void
}

type DotTone = 'on' | 'warn' | 'off'

const dotColor: Record<DotTone, string> = {
  on: 'bg-[#16a34a]',
  warn: 'bg-[#d69326]',
  off: 'bg-[#94a3b8]',
}
const textColor: Record<DotTone, string> = {
  on: 'text-[#047857]',
  warn: 'text-[#a16207]',
  off: 'text-[#64748b]',
}

function powerState(value: string): { tone: DotTone; label: string } {
  return value === 'poweredOn' ? { tone: 'on', label: 'On' } : { tone: 'off', label: 'Off' }
}
function connectionState(value: string): { tone: DotTone; label: string } {
  return value === 'connected' ? { tone: 'on', label: 'Connected' } : { tone: 'warn', label: value || 'Unknown' }
}

interface StateCellProps {
  value: string
  resolve: (value: string) => { tone: DotTone; label: string }
}

function StateCell({ value, resolve }: StateCellProps) {
  const { tone, label } = resolve(value)
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${textColor[tone]}`} title={value}>
      <span className={`size-2 shrink-0 rounded-full ${dotColor[tone]}`} />
      {label}
    </span>
  )
}

export function VirtualMachinesTable({ virtualMachines, selectedId, density, onSelect }: VirtualMachinesTableProps) {
  const showDetail = density === 'comfortable'
  const rowPad = density === 'compact' ? 'py-1.5' : 'py-2.5'
  const cell = `px-3 ${rowPad} text-[13px] text-[#3b4763] align-top`
  const num = `${cell} text-right tabular-nums`
  const headerCell = 'whitespace-nowrap px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-[#93a0b5]'
  const headerNum = `${headerCell} text-right`
  const sub = 'block max-w-45 truncate text-[11px] text-[#93a0b5]'

  return (
    <div className="custom-scrollbar w-full min-w-0 touch-pan-x overflow-x-auto overscroll-x-contain" tabIndex={0} aria-label="Scrollable virtual machine table">
      <Table className="min-w-260">
        <TableHeader className="sticky top-0 z-10 border-b border-[#dfe9f3] bg-[#f6f9fc]">
          <TableRow>
            <TableCell isHeader className={headerCell}>Virtual machine</TableCell>
            <TableCell isHeader className={headerCell}>Operating system</TableCell>
            <TableCell isHeader className={headerCell}>Placement</TableCell>
            <TableCell isHeader className={headerCell}>Provider</TableCell>
            <TableCell isHeader className={headerCell}>Tags</TableCell>
            <TableCell isHeader className={headerCell}>Compute</TableCell>
            <TableCell isHeader className={headerCell}>Connection</TableCell>
            <TableCell isHeader className={headerCell}>Power</TableCell>
            <TableCell isHeader className={headerNum}>Snapshots</TableCell>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-[#edf2f7]">
          {virtualMachines.map((vm, index) => (
            <TableRow
              key={`${vm.id}-${String(index)}`}
              className={`cursor-pointer outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1596dd] ${selectedId === vm.id ? 'bg-[#e8f4fd] shadow-[inset_3px_0_0_#0d91d7]' : 'bg-white hover:bg-[#f3f8fe]'}`}
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
              <TableCell className={`px-3 ${rowPad} align-top`}>
                <span className="block max-w-65 truncate text-[13px] font-semibold text-[#17233d]" title={vm.name}>{vm.name}</span>
                {showDetail ? (
                  <span className="mt-0.5 block max-w-65 truncate font-mono text-[11px] text-[#93a0b5]" title={`${vm.hostname} / ${vm.ipAddress}`}>
                    {vm.ipAddress || vm.hostname || '-'}
                  </span>
                ) : null}
              </TableCell>
              <TableCell className={cell}><span className="block max-w-55 truncate" title={vm.guestOs}>{vm.guestOs || '-'}</span></TableCell>
              <TableCell className={cell}>
                <div className="flex flex-col gap-0.5">
                  <span className="block max-w-45 truncate" title={vm.cluster}>{vm.cluster || '-'}</span>
                  {showDetail ? (
                    <>
                      <span className={sub} title={vm.host}>{vm.host || '-'}</span>
                      <span className={`${sub} font-mono`} title={vm.datastore}>{vm.datastore || '-'}</span>
                      <span className={sub} title={vm.folder}>{vm.folder || '-'}</span>
                    </>
                  ) : null}
                </div>
              </TableCell>
              <TableCell className={cell}>
                <span className="block truncate" title={vm.providerType === '-' && vm.providerId === '-' ? '-' : `${vm.providerType}-${vm.providerId}`}>
                  {vm.providerType === '-' && vm.providerId === '-' ? '-' : `${vm.providerType}-${vm.providerId}`}
                </span>
              </TableCell>
              <TableCell className={cell}>
                {vm.tags.length > 0 ? (
                  <span className="flex flex-wrap gap-1">
                    {vm.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="rounded bg-[#e8f5ff] px-1.5 py-0.5 font-mono text-[10.5px] font-medium text-[#118ccc]">{tag}</span>
                    ))}
                    {vm.tags.length > 3 ? <span className="text-[11px] text-[#93a0b5]">+{vm.tags.length - 3}</span> : null}
                  </span>
                ) : (
                  <span className="text-[#93a0b5]">-</span>
                )}
              </TableCell>
              <TableCell className={cell}>
                <div className="flex flex-col gap-0.5 tabular-nums">
                  <span>{vm.vcpu} vCPU · {vm.memoryGb} GB</span>
                  {showDetail ? <span className={sub}>{vm.diskCount} disks · {Math.round(vm.diskCapacityGb)} GB</span> : null}
                </div>
              </TableCell>
              <TableCell className={cell}><StateCell value={vm.connectionState} resolve={connectionState} /></TableCell>
              <TableCell className={cell}><StateCell value={vm.powerState} resolve={powerState} /></TableCell>
              <TableCell className={`${num} ${vm.snapshotCount === 0 ? 'text-[#93a0b5]' : ''}`}>{vm.snapshotCount}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
