import { DataTable, StateCell } from '@/shared/components/data-table'
import type { ColumnDef, TableDensity } from '@/shared/components/data-table'
import { useTranslation } from '@/hooks/useTranslation'
import type { VirtualMachine } from '../types'

export type { TableDensity }

interface VirtualMachinesTableProps {
  virtualMachines: VirtualMachine[]
  selectedId: string | null
  density: TableDensity
  onSelect: (virtualMachine: VirtualMachine) => void
}

function powerState(value: string): { tone: 'on' | 'off'; label: string } {
  return value === 'poweredOn' ? { tone: 'on', label: 'On' } : { tone: 'off', label: 'Off' }
}

function connectionState(value: string): { tone: 'on' | 'warn'; label: string } {
  return value === 'connected' ? { tone: 'on', label: 'Connected' } : { tone: 'warn', label: value || 'Unknown' }
}

export function VirtualMachinesTable({ virtualMachines, selectedId, density, onSelect }: VirtualMachinesTableProps) {
  const { t } = useTranslation()
  const showDetail = density === 'comfortable'
  const sub = 'block max-w-45 truncate text-[11px] text-[#93a0b5]'

  const columns: ColumnDef<VirtualMachine>[] = [
    {
      id: 'name',
      header: t('tables.vm.name'),
      cell: (vm) => (
        <>
          <span className="block max-w-65 truncate text-[13px] font-semibold text-[#17233d]" title={vm.name}>{vm.name}</span>
          {showDetail ? (
            <span className="mt-0.5 block max-w-65 truncate font-mono text-[11px] text-[#93a0b5]" title={`${vm.hostname} / ${vm.ipAddress}`}>
              {vm.ipAddress || vm.hostname || '-'}
            </span>
          ) : null}
        </>
      ),
    },
    {
      id: 'os',
      header: t('tables.vm.os'),
      cell: (vm) => <span className="block max-w-55 truncate" title={vm.guestOs}>{vm.guestOs || '-'}</span>,
    },
    {
      id: 'placement',
      header: t('tables.vm.placement'),
      cell: (vm) => (
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
      ),
    },
    {
      id: 'provider',
      header: t('tables.vm.provider'),
      cell: (vm) => {
        const provider = vm.providerType === '-' && vm.providerId === '-' ? '-' : `${vm.providerType}-${vm.providerId}`
        return <span className="block truncate" title={provider}>{provider}</span>
      },
    },
    {
      id: 'tags',
      header: t('tables.vm.tags'),
      cell: (vm) => vm.tags.length > 0 ? (
        <span className="flex flex-wrap gap-1">
          {vm.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="rounded bg-[#e8f5ff] px-1.5 py-0.5 font-mono text-[10.5px] font-medium text-[#118ccc]">{tag}</span>
          ))}
          {vm.tags.length > 3 ? <span className="text-[11px] text-[#93a0b5]">+{vm.tags.length - 3}</span> : null}
        </span>
      ) : <span className="text-[#93a0b5]">-</span>,
    },
    {
      id: 'compute',
      header: t('tables.vm.compute'),
      cell: (vm) => (
        <div className="flex flex-col gap-0.5 tabular-nums">
          <span>{vm.vcpu} vCPU · {vm.memoryGb} GB</span>
          {showDetail ? <span className={sub}>{vm.diskCount} disks · {Math.round(vm.diskCapacityGb)} GB</span> : null}
        </div>
      ),
    },
    {
      id: 'connection',
      header: t('tables.vm.connection'),
      cell: (vm) => <StateCell {...connectionState(vm.connectionState)} title={vm.connectionState} />,
    },
    {
      id: 'power',
      header: t('tables.vm.power'),
      cell: (vm) => <StateCell {...powerState(vm.powerState)} title={vm.powerState} />,
    },
    {
      id: 'snapshots',
      header: t('tables.vm.snapshots'),
      align: 'right',
      cell: (vm) => <span className={vm.snapshotCount === 0 ? 'text-[#93a0b5]' : undefined}>{vm.snapshotCount}</span>,
    },
  ]

  return (
    <DataTable
      columns={columns}
      rows={virtualMachines}
      rowKey={(vm, index) => `${vm.id}-${String(index)}`}
      rowSelectionKey={(vm) => vm.id}
      rowAriaLabel={(vm) => `Show details for ${vm.name}`}
      density={density}
      selectedRowKey={selectedId}
      onRowClick={onSelect}
      minWidthClassName="min-w-260"
      ariaLabel="Scrollable virtual machine table"
      headerCellClassName="whitespace-nowrap px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-[#93a0b5]"
      cellClassName={`px-3 ${density === 'compact' ? 'py-1.5' : 'py-2.5'} text-[13px] text-[#3b4763] align-top`}
    />
  )
}
